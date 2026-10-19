"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { checkInAction, checkOutAction } from "@/lib/actions/shifts";
import { CLEAN_CHECKLIST, shiftDurationLabel } from "@/lib/shift-rules";

export interface ShiftLocation {
  id: string;
  name: string;
  rooms: { id: string; name: string; takenBy: string | null }[];
}

interface ActiveShiftRow {
  locationName: string;
  roomName: string;
  checkInAt: string; // ISO
  pendingClients: number;
}

interface RecentShiftRow {
  id: string;
  locationName: string;
  roomName: string;
  checkInAt: string;
  checkOutAt: string;
}

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", timeZone: "America/Mexico_City" });
}
function formatDay(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Mexico_City" });
}

// "Mi turno": the esthetician checks in choosing the sede and the cabina she
// will work in — that choice decides which clients she sees — and checks out
// at the end, signing that she left the station clean.
export interface StaffShiftViewProps {
  userName: string;
  locations: ShiftLocation[];
  active: ActiveShiftRow | null;
  forgotten: { roomName: string; checkInAt: string } | null;
  recent: RecentShiftRow[];
}

export function StaffShiftView({ userName, locations, active, forgotten, recent }: StaffShiftViewProps) {
  const router = useRouter();
  const [locationId, setLocationId] = useState(locations.length === 1 ? locations[0].id : "");
  const [roomId, setRoomId] = useState("");
  const [checklist, setChecklist] = useState<boolean[]>(CLEAN_CHECKLIST.map(() => false));
  const [signed, setSigned] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const location = locations.find((l) => l.id === locationId) ?? null;
  const allChecked = checklist.every(Boolean) && signed;

  async function checkIn() {
    setBusy(true);
    setError(null);
    try {
      const result = await checkInAction({ locationId, roomId });
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
      const result = await checkOutAction({ checklist, cleanSignoff: signed, note });
      if ("error" in result) {
        setError(result.error);
      } else {
        setChecklist(CLEAN_CHECKLIST.map(() => false));
        setSigned(false);
        setNote("");
        setRoomId("");
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
          {active ? (
            <>
              <Card title="Turno en curso">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-display text-lg text-ciruela">{active.roomName}</p>
                    <p className="font-body text-xs text-ciruela/50">
                      {active.locationName} · entrada {formatTime(active.checkInAt)}
                    </p>
                  </div>
                  <Badge tone="positive">En turno</Badge>
                </div>
                <p className="mt-3 font-body text-sm text-ciruela/70">
                  {active.pendingClients === 0
                    ? "No te quedan clientes por atender en esta cabina hoy."
                    : `Te quedan ${active.pendingClients} ${active.pendingClients === 1 ? "cliente" : "clientes"} por atender en esta cabina hoy.`}
                </p>
              </Card>

              <Card title="Registrar salida">
                <div className="space-y-3">
                  <p className="font-body text-sm text-ciruela/70">
                    Antes de irte, confirma que dejaste tu estación como la encontraste.
                  </p>
                  <ul className="space-y-2">
                    {CLEAN_CHECKLIST.map((label, i) => (
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
                  <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-ciruela/15 bg-ciruela/5 p-3 font-body text-sm text-ciruela">
                    <input
                      type="checkbox"
                      checked={signed}
                      onChange={(e) => setSigned(e.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-[#4a1f3d]"
                    />
                    <span>
                      Yo, <strong>{userName}</strong>, firmo que dejé mi estación limpia.
                    </span>
                  </label>
                  <div>
                    <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                      Nota (opcional)
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
                    {busy ? "Registrando…" : "Registrar salida"}
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
                  Elige dónde vas a trabajar hoy. La cabina que elijas decide los clientes que verás.
                </p>
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Sede
                  </label>
                  <select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      setRoomId("");
                    }}
                    className={inputClass}
                  >
                    <option value="">Selecciona la sede</option>
                    {locations.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
                {location && (
                  <div>
                    <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                      Cabina
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {location.rooms.map((r) => {
                        const selected = roomId === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={!!r.takenBy}
                            onClick={() => setRoomId(r.id)}
                            className={`rounded-lg border px-3 py-3 text-left font-body text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                              selected
                                ? "border-ciruela bg-ciruela text-hueso"
                                : "border-ciruela/20 bg-hueso text-ciruela hover:border-ciruela/50"
                            }`}
                          >
                            {r.name}
                            {r.takenBy && <span className="block text-xs opacity-70">Ocupada · {r.takenBy}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
                <button
                  onClick={checkIn}
                  disabled={!locationId || !roomId || busy}
                  className="w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busy ? "Registrando…" : "Registrar entrada"}
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
                      {formatDay(s.checkInAt)} · {s.roomName}
                      <span className="block text-xs text-ciruela/50">
                        {formatTime(s.checkInAt)} – {formatTime(s.checkOutAt)}
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
