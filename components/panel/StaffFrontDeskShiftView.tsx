"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { frontDeskCheckInAction, frontDeskCheckOutAction } from "@/lib/actions/shifts";
import { FRONT_DESK_CHECKLIST, cashDifference, shiftDurationLabel } from "@/lib/shift-rules";

export interface FrontDeskShiftData {
  userName: string;
  locations: { id: string; name: string; cashOpen: { openedBy: string; openingFloatMxn: number } | null }[];
  active: {
    locationName: string;
    checkInAt: string; // ISO
    cash: {
      openedBy: string;
      openingFloatMxn: number;
      cashSalesMxn: number;
      expectedMxn: number;
      salesCount: number;
    } | null;
    closesCaja: boolean; // the last one out counts the cash and closes the caja
    pendingCharges: number;
  } | null;
  forgotten: { roomName: string; checkInAt: string } | null;
  recent: {
    id: string;
    locationName: string;
    checkInAt: string;
    checkOutAt: string;
    cashCountedMxn: number | null;
    cashExpectedMxn: number | null;
  }[];
}

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40";

const money = (n: number) => `$${n.toLocaleString("es-MX")} MXN`;
const TZ = "America/Mexico_City";
const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });

// "Mi turno" for the vendedor: check in choosing the sede and opening the caja
// (the cash float), and check out with a checklist and the cash count before
// leaving.
export function StaffFrontDeskShiftView({ userName, locations, active, forgotten, recent }: FrontDeskShiftData) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations.length === 1 ? locations[0].id : "");
  const [float, setFloat] = useState("2000");
  const [checklist, setChecklist] = useState<boolean[]>(FRONT_DESK_CHECKLIST.map(() => false));
  const [signed, setSigned] = useState(false);
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState<{ difference: number | null } | null>(null);

  const location = locations.find((l) => l.id === locationId) ?? null;
  const countedNumber = counted.trim() === "" ? null : Number(counted);
  const differencePreview =
    active?.closesCaja && active.cash && countedNumber !== null && Number.isFinite(countedNumber)
      ? cashDifference(countedNumber, active.cash.expectedMxn)
      : null;
  const allChecked = checklist.every(Boolean) && signed;

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      const result = await frontDeskCheckInAction({ locationId, openingFloatMxn: Number(float) });
      if ("error" in result) setError(result.error);
      else router.push("/staff");
    } catch {
      setError("No se pudo registrar la entrada. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  async function checkOut() {
    setBusy(true);
    setError(null);
    try {
      const result = await frontDeskCheckOutAction({
        checklist,
        signed,
        countedCashMxn: countedNumber,
        note,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setClosing({ difference: result.cashDifferenceMxn });
        setChecklist(FRONT_DESK_CHECKLIST.map(() => false));
        setSigned(false);
        setCounted("");
        setNote("");
        router.refresh();
      }
    } catch {
      setError("No se pudo registrar la salida. Intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <TopBar title="Mi turno" />
      <div className="flex-1 px-4 py-6 min-[860px]:px-8">
        <div className="mx-auto max-w-xl space-y-4">
          {closing && !active && (
            <div className="rounded-[18px] border border-oliva/30 bg-oliva/10 px-5 py-4 font-body text-sm text-ciruela">
              Turno cerrado. Gracias, {userName}.
              {closing.difference !== null &&
                (closing.difference === 0
                  ? " La caja cuadró."
                  : ` La caja no cuadró: ${closing.difference > 0 ? "sobran" : "faltan"} ${money(Math.abs(closing.difference))}. Quedó registrado para revisión.`)}
            </div>
          )}

          {active ? (
            <>
              <Card title="Turno en curso">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-ciruela">{active.locationName}</p>
                    <p className="font-body text-xs text-ciruela/50">
                      entrada {formatTime(active.checkInAt)} · {shiftDurationLabel(new Date(active.checkInAt), null)}
                    </p>
                  </div>
                  <Badge tone="positive">En turno</Badge>
                </div>
                {active.cash && (
                  <dl className="mt-4 space-y-2 font-body text-sm">
                    <div className="flex justify-between border-t border-ciruela/8 pt-2">
                      <dt className="text-ciruela/50">Caja abierta por</dt>
                      <dd className="text-ciruela">{active.cash.openedBy}</dd>
                    </div>
                    <div className="flex justify-between border-t border-ciruela/8 pt-2">
                      <dt className="text-ciruela/50">Fondo de apertura</dt>
                      <dd className="text-ciruela">{money(active.cash.openingFloatMxn)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-ciruela/8 pt-2">
                      <dt className="text-ciruela/50">Efectivo cobrado</dt>
                      <dd className="text-ciruela">{money(active.cash.cashSalesMxn)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-ciruela/8 pt-2">
                      <dt className="text-ciruela/50">Debe haber en caja</dt>
                      <dd className="text-ciruela">{money(active.cash.expectedMxn)}</dd>
                    </div>
                  </dl>
                )}
                {active.pendingCharges > 0 && (
                  <p className="mt-3 rounded-lg bg-crepe/20 px-3 py-2 font-body text-xs text-ciruela">
                    {active.pendingCharges === 1
                      ? "Hay 1 clienta lista para cobro."
                      : `Hay ${active.pendingCharges} clientas listas para cobro.`}
                  </p>
                )}
              </Card>

              <Card title="Registrar salida">
                <div className="space-y-3">
                  <p className="font-body text-sm text-ciruela/70">
                    Antes de irte, revisa que todo esté en orden.
                  </p>
                  <ul className="space-y-2">
                    {FRONT_DESK_CHECKLIST.map((label, i) => (
                      <li key={label}>
                        <label className="flex cursor-pointer items-start gap-2 font-body text-sm text-ciruela">
                          <input
                            type="checkbox"
                            checked={checklist[i]}
                            onChange={(e) => setChecklist((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                            className="mt-0.5 h-4 w-4 accent-[#4a1f3d]"
                          />
                          {label}
                        </label>
                      </li>
                    ))}
                  </ul>

                  {active.closesCaja ? (
                    <div className="rounded-lg border border-ciruela/15 bg-ciruela/5 p-3">
                      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                        Efectivo contado en caja (MXN)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={counted}
                        onChange={(e) => setCounted(e.target.value)}
                        className={inputClass}
                      />
                      {active.cash && (
                        <p className="mt-2 font-body text-xs text-ciruela/60">
                          Debe haber {money(active.cash.expectedMxn)}.
                          {differencePreview !== null &&
                            (differencePreview === 0
                              ? " Cuadra."
                              : ` ${differencePreview > 0 ? "Sobran" : "Faltan"} ${money(Math.abs(differencePreview))}.`)}
                        </p>
                      )}
                      <p className="mt-1 font-body text-xs text-ciruela/50">
                        Eres la última persona en salir de la sucursal: al registrar la salida se cierra la caja.
                      </p>
                    </div>
                  ) : (
                    <p className="font-body text-xs text-ciruela/50">
                      Otra persona sigue en turno en esta sucursal; ella cierra la caja al salir.
                    </p>
                  )}

                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-ciruela/15 bg-ciruela/5 p-3 font-body text-sm text-ciruela">
                    <input
                      type="checkbox"
                      checked={signed}
                      onChange={(e) => setSigned(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#4a1f3d]"
                    />
                    <span>
                      Yo, <strong>{userName}</strong>, firmo que revisé que todo está en orden.
                    </span>
                  </label>
                  <div>
                    <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                      Nota {active.pendingCharges > 0 ? "(requerida: hay cobros pendientes)" : "(opcional)"}
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={2}
                      maxLength={500}
                      placeholder="Algo que el siguiente turno deba saber"
                      className={inputClass}
                    />
                  </div>
                  {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
                  <button
                    onClick={checkOut}
                    disabled={!allChecked || busy}
                    className="w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busy ? "Registrando…" : active.closesCaja ? "Cerrar caja y registrar salida" : "Registrar salida"}
                  </button>
                </div>
              </Card>
            </>
          ) : (
            <Card title="Registrar entrada">
              <div className="space-y-3">
                {forgotten && (
                  <p className="rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
                    Tu turno del {formatDay(forgotten.checkInAt)} en {forgotten.roomName} quedó sin salida. Se cerrará
                    al registrar la entrada de hoy.
                  </p>
                )}
                <p className="font-body text-sm text-ciruela/70">
                  Elige la sucursal donde vas a trabajar hoy. Al registrar tu entrada se abre la caja.
                </p>
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Sucursal
                  </label>
                  <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className={inputClass}>
                    <option value="">Selecciona la sucursal</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                {location &&
                  (location.cashOpen ? (
                    <p className="rounded-lg bg-ciruela/5 px-3 py-2 font-body text-xs text-ciruela/70">
                      La caja de hoy ya la abrió {location.cashOpen.openedBy} con {money(location.cashOpen.openingFloatMxn)}.
                      Trabajarás con esa misma caja.
                    </p>
                  ) : (
                    <div>
                      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                        Fondo de apertura (efectivo en caja, MXN)
                      </label>
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        value={float}
                        onChange={(e) => setFloat(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                  ))}
                {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
                <button
                  onClick={checkIn}
                  disabled={!locationId || busy}
                  className="w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Registrando…" : location?.cashOpen ? "Registrar entrada" : "Abrir caja y registrar entrada"}
                </button>
              </div>
            </Card>
          )}

          {recent.length > 0 && (
            <Card title="Mis últimos turnos">
              <ul className="divide-y divide-ciruela/8">
                {recent.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 py-2.5 font-body text-sm text-ciruela">
                    <span>
                      {formatDay(s.checkInAt)} · {s.locationName}
                      <span className="block text-xs text-ciruela/50">
                        {formatTime(s.checkInAt)} – {formatTime(s.checkOutAt)}
                        {s.cashCountedMxn !== null && s.cashExpectedMxn !== null
                          ? ` · caja ${s.cashCountedMxn === s.cashExpectedMxn ? "cuadró" : `dif. ${money(s.cashCountedMxn - s.cashExpectedMxn)}`}`
                          : ""}
                      </span>
                    </span>
                    <span className="text-xs text-ciruela/50">
                      {shiftDurationLabel(new Date(s.checkInAt), new Date(s.checkOutAt))}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
