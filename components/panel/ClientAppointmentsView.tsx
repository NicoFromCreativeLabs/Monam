"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/panel/Card";
import { PostFacialRecommendations } from "@/components/panel/PostFacialRecommendations";
import { cancelAppointmentAction } from "@/lib/actions/booking";
import { CLIENT_PURCHASES } from "@/lib/mock-data";

const RECENT_PURCHASES_LIMIT = 3;

export interface UpcomingAppointmentView {
  id: string;
  protocolTier: string;
  date: string;
  time: string;
  location: string;
  depositPaid: boolean;
}

export interface PastAppointmentView {
  id: string;
  protocol: string;
  date: string;
  time: string;
  location: string;
}

// "Mi rutina" now also covers "Mis compras" (purchase history used to be
// its own nav item — folded in here) and post-facial recommendations, so
// this is one place for everything about a client's ongoing relationship
// with the studio, not three (spec: routine + purchases + recommendations).
// Upcoming/past, reschedule, cancel — policy-aware (spec §5.2/§8.1): ≥24h
// notice is free, inside the window shows the deposit-forfeit warning inline.
// Real Appointment rows now (Booking phase) — "Mis compras" stays mock
// pending the Commerce phase's real Sale/SaleLineItem tables.
export function ClientAppointmentsView({
  upcoming,
  past,
}: {
  upcoming: UpcomingAppointmentView[];
  past: PastAppointmentView[];
}) {
  const recentPurchases = CLIENT_PURCHASES.slice(0, RECENT_PURCHASES_LIMIT);
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<{
    appt: UpcomingAppointmentView;
    kind: "cancel" | "reschedule";
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmPendingAction() {
    if (!pendingAction) return;
    startTransition(async () => {
      await cancelAppointmentAction(pendingAction.appt.id);
      if (pendingAction.kind === "reschedule") {
        router.push("/my/book");
      } else {
        router.refresh();
      }
      setPendingAction(null);
    });
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
                  {a.depositPaid && <p className="mt-1 font-body text-xs text-oliva">Depósito pagado</p>}
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
                disabled={isPending}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {pendingAction.kind === "cancel" ? "Cancelar cita" : "Continuar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <Card title="Anteriores">
        {past.length === 0 ? (
          <p className="py-3 font-body text-sm text-ciruela/50">Sin citas anteriores.</p>
        ) : (
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
        )}
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
