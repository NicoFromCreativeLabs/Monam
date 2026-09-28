"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/panel/Card";
import { useLocations } from "@/components/panel/LocationsContext";
import { useProtocols } from "@/components/panel/ProtocolsContext";
import { useAddOns } from "@/components/panel/AddOnsContext";
import { useClientBooking } from "@/components/panel/ClientBookingContext";
import { useScrollEdgeFade } from "@/components/panel/useScrollEdgeFade";
import { BUSINESS_HOURS, CLIENT_PAYMENT_METHODS, type DayHours } from "@/lib/mock-data";

// Booking flow: location → duration → (facial) → (add-ons) → day/slot →
// deposit if required → confirmation. The client never picks a specific
// esteticista, room, or device — the studio assigns whoever's available,
// deliberately, so a client can't be steered to (and taken by) one specific
// esteticista if she ever leaves.
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function minutesToTime(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Generates start times from opening time up to the last bookable start for
// the selected duration, every 30 minutes — respecting that day's specific
// hours (spec: booking availability and publicly displayed hours must
// match; Tuesday in particular closes earlier than the rest of the week).
function generateSlots(day: DayHours, duration: "Targeted" | "Signature") {
  const lastStart = duration === "Signature" ? day.lastStart60 : day.lastStart30;
  const start = timeToMinutes(day.open);
  const end = timeToMinutes(lastStart);
  const slots: string[] = [];
  for (let t = start; t <= end; t += 30) slots.push(minutesToTime(t));
  return slots;
}

// Minimal day picker — "Hoy" plus the next 4 days — just enough to make the
// day-of-week-dependent hours actually reachable/demonstrable, at the same
// mock/UI-only fidelity as the rest of the booking flow (no real calendar).
function buildDayOptions() {
  const today = new Date();
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dayName = DAY_NAMES[d.getDay()];
    const hours = BUSINESS_HOURS.find((h) => h.day === dayName)!;
    const label =
      i === 0 ? "Hoy" : i === 1 ? "Mañana" : d.toLocaleDateString("es-MX", { weekday: "short" });
    return {
      date: d,
      dayName,
      hours,
      label: label.charAt(0).toUpperCase() + label.slice(1),
      dateLabel: d.toLocaleDateString("es-MX", { day: "numeric", month: "short" }),
    };
  });
}

// Steps are named rather than numbered because the flow branches: the
// "facial" step only applies to Signature (Targeted's ampoule is assigned
// in-cabin, spec/note copy), and "addons" only appears when the chosen
// facial (or Targeted) actually has compatible add-ons.
type Step = "location" | "duration" | "facial" | "addons" | "schedule" | "deposit" | "confirm";

export default function ClientBook() {
  const { locations } = useLocations();
  const { protocols } = useProtocols();
  const addOns = useAddOns();
  const signatureProtocols = protocols.filter((p) => p.tier === "Signature");
  const targetedProtocol = protocols.find((p) => p.tier === "Targeted");
  const { addAppointment } = useClientBooking();
  const [step, setStep] = useState<Step>("location");
  const [location, setLocation] = useState<string | null>(null);
  const [duration, setDuration] = useState<"Targeted" | "Signature" | null>(null);
  const [protocol, setProtocol] = useState<string | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [dayIndex, setDayIndex] = useState(0);
  const [slot, setSlot] = useState<string | null>(null);

  const dayOptions = useMemo(() => buildDayOptions(), []);
  const selectedDay = dayOptions[dayIndex];
  const { ref: dayScrollRef, showLeft: showDayLeft, showRight: showDayRight } =
    useScrollEdgeFade<HTMLDivElement>();

  const requiresDeposit = duration === "Signature";

  // For Targeted, the ampoule is assigned in-cabin (no named protocol), so
  // add-ons are matched against "Targeted"; for Signature, against the
  // specific facial the client picked.
  const protocolForAddOns = duration === "Targeted" ? "Targeted" : protocol;
  const availableAddOns = protocolForAddOns
    ? addOns.filter((a) => a.availableOn.includes(protocolForAddOns))
    : [];
  const chosenAddOns = addOns.filter((a) => selectedAddOns.includes(a.id));
  const extraMinutesTotal = chosenAddOns.reduce((sum, a) => sum + a.extraMinutes, 0);

  function toggleAddOn(id: string) {
    setSelectedAddOns((prev) => (prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]));
  }

  // Approximate step order given what's known so far — used only to size the
  // progress dots, so it's fine that it firms up as the client answers each
  // step rather than being exact from step one.
  const availableAddOnsCount = availableAddOns.length;
  const stepOrder = useMemo(() => {
    const order: Step[] = ["location", "duration"];
    if (duration === "Signature") order.push("facial");
    if (duration === "Targeted" || protocol) {
      if (availableAddOnsCount > 0) order.push("addons");
    } else if (duration === "Signature") {
      order.push("addons");
    }
    order.push("schedule");
    if (requiresDeposit) order.push("deposit");
    order.push("confirm");
    return order;
  }, [duration, protocol, availableAddOnsCount, requiresDeposit]);
  const stepIndex = stepOrder.indexOf(step);

  // Skips the add-ons step entirely when the chosen facial (or Targeted)
  // has no compatible add-ons, rather than showing an empty screen.
  function goPastFacialChoice(protocolName: string) {
    const compatibleAddOns = addOns.filter((a) => a.availableOn.includes(protocolName));
    setStep(compatibleAddOns.length > 0 ? "addons" : "schedule");
  }

  const daySlots = duration ? generateSlots(selectedDay.hours, duration) : [];

  // Writes the booking into ClientBookingContext the moment the client
  // actually reaches the confirmation screen — from either transition into
  // "confirm" (with or without a deposit step in between) — so it shows up
  // in "Próxima cita" and "Mi rutina" immediately, not just on this screen.
  function confirmBooking(chosenSlot: string) {
    addAppointment({
      date: selectedDay.date.toISOString().slice(0, 10),
      time: chosenSlot,
      location: location!,
      protocolTier: `${protocol ?? duration} (${duration === "Signature" ? 60 : 30} min)`,
      depositPaid: requiresDeposit,
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        {stepOrder.map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? "bg-ciruela" : "bg-ciruela/15"}`}
          />
        ))}
      </div>

      {step === "location" && (
        <Card title="Elige tu sucursal">
          <div className="space-y-2">
            {locations.map((l) => (
              <button
                key={l.id}
                disabled={!l.isActive}
                onClick={() => {
                  setLocation(l.name);
                  setStep("duration");
                }}
                className="flex w-full items-center justify-between rounded-lg border border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span>{l.name}</span>
                {!l.isActive && <span className="text-xs text-ciruela/40">Próximamente</span>}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === "duration" && (
        <Card title="Duración">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setDuration("Targeted");
                setProtocol(null);
                setSelectedAddOns([]);
                goPastFacialChoice("Targeted");
              }}
              className="rounded-lg border border-ciruela/20 px-4 py-6 text-center font-body text-sm text-ciruela hover:bg-ciruela/5"
            >
              <p className="font-display text-lg">Targeted</p>
              <p className="mt-1 text-ciruela/50">
                {targetedProtocol ? `${targetedProtocol.duration} min · $${targetedProtocol.price} MXN` : "—"}
              </p>
            </button>
            <button
              onClick={() => {
                setDuration("Signature");
                setSelectedAddOns([]);
                setStep("facial");
              }}
              className="rounded-lg border border-ciruela/20 px-4 py-6 text-center font-body text-sm text-ciruela hover:bg-ciruela/5"
            >
              <p className="font-display text-lg">Signature</p>
              <p className="mt-1 text-ciruela/50">
                {signatureProtocols[0]
                  ? `${signatureProtocols[0].duration} min · $${signatureProtocols[0].price.toLocaleString()} MXN`
                  : "—"}
              </p>
            </button>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/50">
            El protocolo se asigna tras la valoración en cabina.
          </p>
        </Card>
      )}

      {step === "facial" && (
        <Card title="Elige tu facial">
          <div className="space-y-2">
            {signatureProtocols.map((p) => (
              <button
                key={p.name}
                onClick={() => {
                  setProtocol(p.name);
                  goPastFacialChoice(p.name);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
              >
                <span>{p.name}</span>
                <span className="text-xs text-ciruela/40">{p.duration} min</span>
              </button>
            ))}
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/50">
            Tu esteticista confirma que este es el protocolo ideal tras tu valoración de piel.
          </p>
        </Card>
      )}

      {step === "addons" && (
        <Card title="Agrega un add-on">
          <p className="mb-4 font-body text-xs text-ciruela/50">
            Compatibles con {protocolForAddOns} · opcionales, sin costo adicional — solo suman
            tiempo a tu cita.
          </p>
          <div className="space-y-2">
            {availableAddOns.map((a) => (
              <label
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela"
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedAddOns.includes(a.id)}
                    onChange={() => toggleAddOn(a.id)}
                    className="h-4 w-4 accent-ciruela"
                  />
                  <span>
                    {a.name}
                    <span className="ml-1 text-xs text-ciruela/50">· {a.function}</span>
                  </span>
                </span>
                <span className="text-xs text-ciruela/40">+{a.extraMinutes} min</span>
              </label>
            ))}
          </div>
          <button
            onClick={() => setStep("schedule")}
            className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso"
          >
            {selectedAddOns.length > 0 ? "Continuar con add-ons" : "Continuar sin add-ons"}
          </button>
        </Card>
      )}

      {step === "schedule" && (
        <Card title="Elige un horario">
          <div className="relative mb-4">
            <div ref={dayScrollRef} className="flex gap-2 overflow-x-auto">
              {dayOptions.map((d, i) => (
                <button
                  key={d.dateLabel + d.dayName}
                  onClick={() => {
                    setDayIndex(i);
                    setSlot(null);
                  }}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-center font-body text-xs ${
                    dayIndex === i
                      ? "border-ciruela bg-ciruela text-hueso"
                      : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
                  }`}
                >
                  <p className="font-medium">{d.label}</p>
                  <p className="opacity-70">{d.dateLabel}</p>
                </button>
              ))}
            </div>
            {showDayLeft && (
              <div className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-hueso to-transparent" />
            )}
            {showDayRight && (
              <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-hueso to-transparent" />
            )}
          </div>
          <p className="mb-3 font-body text-xs text-ciruela/50">
            {selectedDay.dayName} · {selectedDay.hours.open}–{selectedDay.hours.close} · te
            asignaremos una esteticista disponible
          </p>
          {daySlots.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin horarios disponibles este día para esta duración.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {daySlots.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSlot(s);
                    if (requiresDeposit) {
                      setStep("deposit");
                    } else {
                      confirmBooking(s);
                      setStep("confirm");
                    }
                  }}
                  className="rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela hover:bg-ciruela hover:text-hueso"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      {step === "deposit" && (
        <Card title="Depósito requerido">
          <p className="font-body text-sm text-ciruela/70">
            Las citas Signature requieren un depósito, que se acredita automáticamente en tu
            cuenta al final del tratamiento.
          </p>
          <div className="mt-4 flex justify-between font-body text-sm text-ciruela">
            <span>Depósito</span>
            <span>$500 MXN</span>
          </div>
          {CLIENT_PAYMENT_METHODS[0] && (
            <div className="mt-2 flex justify-between font-body text-xs text-ciruela/50">
              <span>Se cobrará a</span>
              <span>
                {CLIENT_PAYMENT_METHODS[0].brand} •••• {CLIENT_PAYMENT_METHODS[0].last4}
              </span>
            </div>
          )}
          <button
            onClick={() => {
              confirmBooking(slot!);
              setStep("confirm");
            }}
            className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso"
          >
            Pagar depósito y confirmar
          </button>
        </Card>
      )}

      {step === "confirm" && (
        <Card title="¡Reserva confirmada!">
          <p className="font-body text-sm text-ciruela/70">
            {protocol ?? duration} en {location}, {selectedDay.label} {slot}. Te asignaremos una
            esteticista disponible. Te enviamos la confirmación por WhatsApp.
          </p>
          {chosenAddOns.length > 0 && (
            <p className="mt-2 font-body text-xs text-ciruela/60">
              Add-ons: {chosenAddOns.map((a) => a.name).join(", ")} (+{extraMinutesTotal} min)
            </p>
          )}
          {requiresDeposit && CLIENT_PAYMENT_METHODS[0] && (
            <p className="mt-2 font-body text-xs text-ciruela/60">
              Depósito de $500 MXN cobrado a {CLIENT_PAYMENT_METHODS[0].brand} ••••{" "}
              {CLIENT_PAYMENT_METHODS[0].last4}.
            </p>
          )}
          <p className="mt-4 font-body text-xs text-ciruela/50">
            Cancelación sin costo hasta 24 horas antes.
          </p>
        </Card>
      )}
    </div>
  );
}
