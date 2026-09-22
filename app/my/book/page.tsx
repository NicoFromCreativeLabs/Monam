"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { useLocations } from "@/components/panel/LocationsContext";
import { STAFF_ROSTER } from "@/lib/mock-data";

// Booking flow (spec §8.2): location → duration → esteticista → slot →
// deposit if required → confirmation. The esteticista is chosen before the
// slot precisely so the client sees that person's own availability, not a
// generic location-wide grid. The client never sees or picks a specific
// room or device — the engine resolves that server-side.
const ESTHETICIANS = STAFF_ROSTER.filter(
  (s) => s.role === "Esteticista" && s.status === "Activo"
);

// Mocked per-esteticista availability — deliberately different per person so
// switching esteticistas visibly changes the slot grid.
const ESTHETICIAN_SLOTS: Record<string, string[]> = {
  "Ana Torres": ["09:00", "11:00", "13:30", "16:30"],
  "Diana Cruz": ["09:00", "10:30", "13:30", "15:00"],
};
const DEFAULT_SLOTS = ["09:00", "10:30", "11:00", "13:30", "15:00", "16:30"];
const NO_PREFERENCE = "Cualquiera disponible";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function ClientBook() {
  const { locations } = useLocations();
  const [step, setStep] = useState<Step>(1);
  const [location, setLocation] = useState<string | null>(null);
  const [duration, setDuration] = useState<"Express" | "Signature" | null>(null);
  const [esthetician, setEsthetician] = useState<string | null>(null);
  const [slot, setSlot] = useState<string | null>(null);

  const requiresDeposit = duration === "Signature";
  const estheticiansAtLocation = ESTHETICIANS.filter((e) => e.location === location);
  const slotsForEsthetician = esthetician
    ? ESTHETICIAN_SLOTS[esthetician] || DEFAULT_SLOTS
    : DEFAULT_SLOTS;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-ciruela" : "bg-ciruela/15"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card title="Elige tu sucursal">
          <div className="space-y-2">
            {locations.map((l) => (
              <button
                key={l.id}
                disabled={!l.isActive}
                onClick={() => {
                  setLocation(l.name);
                  setStep(2);
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

      {step === 2 && (
        <Card title="Duración">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setDuration("Express");
                setStep(3);
              }}
              className="rounded-lg border border-ciruela/20 px-4 py-6 text-center font-body text-sm text-ciruela hover:bg-ciruela/5"
            >
              <p className="font-display text-lg">Express</p>
              <p className="mt-1 text-ciruela/50">30 min · $850 MXN</p>
            </button>
            <button
              onClick={() => {
                setDuration("Signature");
                setStep(3);
              }}
              className="rounded-lg border border-ciruela/20 px-4 py-6 text-center font-body text-sm text-ciruela hover:bg-ciruela/5"
            >
              <p className="font-display text-lg">Signature</p>
              <p className="mt-1 text-ciruela/50">60 min · $1,900 MXN</p>
            </button>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/50">
            El protocolo se asigna tras la valoración en cabina.
          </p>
        </Card>
      )}

      {step === 3 && (
        <Card title="Elige tu esteticista">
          <div className="space-y-2">
            {estheticiansAtLocation.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  setEsthetician(e.name);
                  setStep(4);
                }}
                className="flex w-full items-center justify-between rounded-lg border border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
              >
                <span>{e.name}</span>
                <span className="text-xs text-ciruela/40">{e.role}</span>
              </button>
            ))}
            <button
              onClick={() => {
                setEsthetician(NO_PREFERENCE);
                setStep(4);
              }}
              className="flex w-full items-center justify-between rounded-lg border border-dashed border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
            >
              <span>{NO_PREFERENCE}</span>
              <span className="text-xs text-ciruela/40">Sin preferencia</span>
            </button>
          </div>
          <p className="mt-3 font-body text-xs text-ciruela/50">
            Verás el horario disponible de la persona que elijas.
          </p>
        </Card>
      )}

      {step === 4 && (
        <Card title={esthetician === NO_PREFERENCE ? "Elige un horario" : `Horario de ${esthetician}`}>
          <div className="grid grid-cols-3 gap-2">
            {slotsForEsthetician.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSlot(s);
                  setStep(requiresDeposit ? 5 : 6);
                }}
                className="rounded-lg border border-ciruela/20 px-3 py-2 font-body text-sm text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                {s}
              </button>
            ))}
          </div>
        </Card>
      )}

      {step === 5 && (
        <Card title="Depósito requerido">
          <p className="font-body text-sm text-ciruela/70">
            Las citas Signature requieren un depósito, que se acredita automáticamente en tu
            cuenta al final del tratamiento.
          </p>
          <div className="mt-4 flex justify-between font-body text-sm text-ciruela">
            <span>Depósito</span>
            <span>$500 MXN</span>
          </div>
          <button
            onClick={() => setStep(6)}
            className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso"
          >
            Pagar depósito y confirmar
          </button>
        </Card>
      )}

      {step === 6 && (
        <Card title="¡Reserva confirmada!">
          <p className="font-body text-sm text-ciruela/70">
            {esthetician === NO_PREFERENCE
              ? `${duration} en ${location}, ${slot}. Te asignaremos una esteticista disponible. Te enviamos la confirmación por WhatsApp.`
              : `${duration} con ${esthetician} en ${location}, ${slot}. Te enviamos la confirmación por WhatsApp.`}
          </p>
          <p className="mt-4 font-body text-xs text-ciruela/50">
            Cancelación sin costo hasta 24 horas antes.
          </p>
        </Card>
      )}
    </div>
  );
}
