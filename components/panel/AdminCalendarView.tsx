"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { NewAppointmentModal, type BookableClient } from "@/components/panel/NewAppointmentModal";
import { useLocations } from "@/components/panel/LocationsContext";
import { OWNER, CALENDAR_HOURS } from "@/lib/mock-data";
import { reassignAppointmentAction } from "@/lib/actions/booking";

export interface CalendarRoom {
  id: string;
  name: string;
}
export interface CalendarEsthetician {
  id: string;
  name: string;
}
export interface CalendarAppointment {
  id: string;
  roomId: string;
  room: string;
  start: number;
  span: number;
  client: string;
  estheticianId: string;
  esthetician: string;
  tier: "Targeted" | "Signature";
  canReassign: boolean;
}
export interface LocationCalendar {
  locationName: string;
  rooms: CalendarRoom[];
  estheticians: CalendarEsthetician[];
  appointments: CalendarAppointment[];
}

export function AdminCalendarView({
  calendars,
  clients,
}: {
  calendars: LocationCalendar[];
  clients: BookableClient[];
}) {
  const { selectedNames } = useLocations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const colWidth = 100 / CALENDAR_HOURS.length;
  const visible = calendars.filter((c) => selectedNames.includes(c.locationName));

  const [reassignTarget, setReassignTarget] = useState<{
    appointment: CalendarAppointment;
    rooms: CalendarRoom[];
    estheticians: CalendarEsthetician[];
  } | null>(null);
  const [draftRoomId, setDraftRoomId] = useState("");
  const [draftEstheticianId, setDraftEstheticianId] = useState("");
  const [reassignError, setReassignError] = useState<string | null>(null);

  function openReassign(apt: CalendarAppointment, rooms: CalendarRoom[], estheticians: CalendarEsthetician[]) {
    if (!apt.canReassign) return;
    setReassignTarget({ appointment: apt, rooms, estheticians });
    setDraftRoomId(apt.roomId);
    setDraftEstheticianId(apt.estheticianId);
    setReassignError(null);
  }

  function confirmReassign() {
    if (!reassignTarget) return;
    startTransition(async () => {
      const result = await reassignAppointmentAction(reassignTarget.appointment.id, draftRoomId, draftEstheticianId);
      if ("error" in result) {
        setReassignError(result.error);
        return;
      }
      setReassignTarget(null);
      router.refresh();
    });
  }

  return (
    <>
      <TopBar title="Calendario" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        {visible.length === 0 ? (
          <p className="py-6 text-center font-body text-sm text-ciruela/50">
            Elige al menos una sucursal en el selector de arriba.
          </p>
        ) : (
          visible.map((cal) => (
            <div key={cal.locationName}>
              <div className="mb-4 flex justify-end">
                <NewAppointmentModal locationName={cal.locationName} clients={clients} />
              </div>
              <Card title={`${cal.locationName} — hoy, todas las salas`}>
                {cal.rooms.length === 0 ? (
                  <p className="py-6 text-center font-body text-sm text-ciruela/50">
                    Sin salas configuradas en esta sucursal todavía.
                  </p>
                ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[900px]">
                    <div className="ml-32 flex border-b border-ciruela/10 pb-2">
                      {CALENDAR_HOURS.map((h) => (
                        <div key={h} className="font-body text-xs text-ciruela/40" style={{ width: `${colWidth}%` }}>
                          {h}:00
                        </div>
                      ))}
                    </div>

                    {cal.rooms.map((room) => (
                      <div key={room.id} className="flex items-center border-b border-ciruela/8 py-3">
                        <div className="w-32 shrink-0 font-body text-sm text-ciruela/70">{room.name}</div>
                        <div className="relative h-12 flex-1">
                          {cal.appointments.filter((a) => a.roomId === room.id).map((apt) => {
                            const left = ((apt.start - CALENDAR_HOURS[0]) / CALENDAR_HOURS.length) * 100;
                            const width = (apt.span / CALENDAR_HOURS.length) * 100;
                            const isSignature = apt.tier === "Signature";
                            return (
                              <button
                                key={apt.id}
                                type="button"
                                onClick={() => openReassign(apt, cal.rooms, cal.estheticians)}
                                disabled={!apt.canReassign}
                                className={`absolute top-0 h-full rounded-lg px-2 py-1 text-left font-body text-[11px] leading-tight text-hueso ${
                                  isSignature ? "bg-ciruela" : "bg-crepe text-ciruela"
                                } ${apt.canReassign ? "cursor-pointer hover:ring-2 hover:ring-ciruela/40" : "cursor-default"}`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`${apt.client} · ${apt.esthetician}${apt.canReassign ? " — clic para reasignar" : ""}`}
                              >
                                <p className="truncate font-medium">{apt.client}</p>
                                <p className="truncate opacity-80">{apt.esthetician}</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
                <div className="mt-4 flex gap-4 font-body text-xs text-ciruela/50">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-ciruela" /> Signature
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-crepe" /> Targeted
                  </span>
                </div>
              </Card>
            </div>
          ))
        )}
      </div>

      {reassignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setReassignTarget(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">Reasignar cita</p>
              <button onClick={() => setReassignTarget(null)} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
                ×
              </button>
            </div>
            <p className="mb-4 font-body text-xs text-ciruela/50">{reassignTarget.appointment.client}</p>

            <div className="mb-3">
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Sala</label>
              <select
                value={draftRoomId}
                onChange={(e) => setDraftRoomId(e.target.value)}
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
              >
                {reassignTarget.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Esteticista</label>
              <select
                value={draftEstheticianId}
                onChange={(e) => setDraftEstheticianId(e.target.value)}
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
              >
                {reassignTarget.estheticians.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>

            {reassignError && (
              <p className="mb-3 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">{reassignError}</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setReassignTarget(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReassign}
                disabled={isPending}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Reasignar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
