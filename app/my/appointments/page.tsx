"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/panel/Card";
import { PostFacialRecommendations } from "@/components/panel/PostFacialRecommendations";
import { useClientBooking, type ClientAppointment } from "@/components/panel/ClientBookingContext";
import { CLIENT_APPOINTMENTS_LIST, CLIENT_PURCHASES } from "@/lib/mock-data";

// Only the 3 most recent purchases show here — this is a routine/rhythm
// view, not a full statement; the client shouldn't have to see the running
// total of what they've spent every time they check their routine.
const RECENT_PURCHASES_LIMIT = 3;

// "Mi rutina" now also covers "Mis compras" (purchase history used to be
// its own nav item — folded in here) and post-facial recommendations, so
// this is one place for everything about a client's ongoing relationship
// with the studio, not three (spec: routine + purchases + recommendations).
// Upcoming/past, reschedule, cancel — policy-aware (spec §5.2/§8.1): ≥24h
// notice is free, inside the window shows the deposit-forfeit warning inline.
export default function ClientAppointments() {
  const { upcoming, cancelAppointment } = useClientBooking();
  const { past } = CLIENT_APPOINTMENTS_LIST;
  const recentPurchases = CLIENT_PURCHASES.slice(0, RECENT_PURCHASES_LIMIT);
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{
    appt: ClientAppointment;
    kind: "cancel" | "reschedule";
  } | null>(null);

  function confirmPendingAction() {
    if (!pendingAction) return;
    cancelAppointment(pendingAction.appt.id);
    if (pendingAction.kind === "reschedule") {
      router.push("/my/book");
    }
    setPendingAction(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/40">
          Mi rutina · Mis compras
        </p>
      </div>

      <Card title="Próximas">
        {upcoming.length === 0 ? (
          <p className="py-3 font-body text-sm text-ciruela/50">No tienes citas próximas.</p>
        ) : (
          <ul className="divide-y divide-ciruela/8">
            {upcoming.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">{a.protocolTier}</p>
                  <p className="font-body text-xs text-ciruela/50">
                    {a.date} · {a.time} · {a.location}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPendingAction({ appt: a, kind: "reschedule" })}
                    className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => setPendingAction({ appt: a, kind: "cancel" })}
                    className="rounded-full border border-crepe px-3 py-1.5 font-body text-xs text-ciruela hover:bg-crepe/15"
                  >
                    Cancelar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 font-body text-xs text-ciruela/40">
          Cancelación sin costo hasta 24 horas antes. Dentro de la ventana, se pierde el
          depósito o una sesión del paquete.
        </p>
      </Card>

      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setPendingAction(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">¿Estás segura?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              {pendingAction.kind === "cancel"
                ? "Vas a cancelar esta cita."
                : "Vas a cancelar esta cita para reservar un nuevo horario."}{" "}
              {pendingAction.appt.protocolTier}, {pendingAction.appt.date}{" "}
              {pendingAction.appt.time}.
            </p>
            <p className="mt-2 font-body text-xs text-ciruela/50">
              Cancelación sin costo hasta 24 horas antes. Dentro de la ventana, se pierde el
              depósito o una sesión del paquete.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingAction(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Volver
              </button>
              <button
                onClick={confirmPendingAction}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso"
              >
                {pendingAction.kind === "cancel" ? "Cancelar cita" : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card title="Anteriores">
        <ul className="divide-y divide-ciruela/8">
          {past.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-3 font-body text-sm">
              <span className="text-ciruela">{a.protocol}</span>
              <span className="text-ciruela/50">
                {a.date} · {a.time} · {a.location}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Mis compras">
        <ul className="divide-y divide-ciruela/8">
          {recentPurchases.map((p, i) => (
            <li key={i} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-sm text-ciruela">{p.product}</p>
                <p className="font-body text-xs text-ciruela/50">
                  {p.size} · {p.date}
                </p>
              </div>
              <span className="font-body text-sm text-ciruela">${p.price} MXN</span>
            </li>
          ))}
        </ul>
      </Card>

      <PostFacialRecommendations />
    </div>
  );
}
