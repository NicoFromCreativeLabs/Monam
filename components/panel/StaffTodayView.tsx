"use client";

import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { RoleToggle } from "@/components/panel/RoleToggle";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { LOW_STOCK_ALERTS } from "@/lib/mock-data";
import type { TodayAppointmentView, PendingCheckoutView } from "@/lib/appointments";

const STATUS_STYLE: Record<string, string> = {
  Registrado: "bg-oliva/15 text-oliva",
  Esperando: "bg-pastel/40 text-ciruela",
  Retrasado: "bg-crepe/40 text-ciruela",
  Confirmado: "bg-ciruela/8 text-ciruela/70",
};

export interface EstheticianNextClient {
  listingId: string | null; // real Client id, for the "Abrir perfil" link
  appointment: TodayAppointmentView | null;
  allergies: string[];
  skinType: string | null;
  lastTreatment: string;
  beverage: string | null;
}

// Real Appointment rows now (Booking phase) — the Front Desk agenda is
// today's queue for Roma Norte; the Esthetician's "Siguiente cliente" is
// scoped to the real logged-in AppUser's own next appointment when they
// actually are one (falls back to the location's earliest for the
// role-toggle preview otherwise — see app/staff/page.tsx).
export function StaffTodayView({
  agenda,
  nextClient,
  pendingCheckouts,
}: {
  agenda: TodayAppointmentView[];
  nextClient: EstheticianNextClient;
  pendingCheckouts: PendingCheckoutView[];
}) {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);

  return (
    <>
      <TopBar title="Hoy" userName={identity.name} userRole={identity.role} extra={<RoleToggle />} />
      <div className="flex-1 px-8 py-6">
        {role === "Front Desk" ? (
          <FrontDeskToday agenda={agenda} pending={pendingCheckouts} />
        ) : (
          <EstheticianToday nextClient={nextClient} />
        )}
      </div>
    </>
  );
}

function FrontDeskToday({
  agenda,
  pending,
}: {
  agenda: TodayAppointmentView[];
  pending: PendingCheckoutView[];
}) {
  return (
    <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-3">
      <div className="min-[1100px]:col-span-2 space-y-6">
        <Card title={`Listas para cobro (${pending.length})`}>
          {pending.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Ninguna clienta lista para cobro todavía — aparece aquí en cuanto una esteticista
              completa un tratamiento.
            </p>
          ) : (
            <ul className="divide-y divide-ciruela/8">
              {pending.map((p) => (
                <li key={p.appointmentId}>
                  <Link
                    href={`/staff/checkout?session=${p.appointmentId}`}
                    className="flex items-center justify-between py-3 hover:bg-ciruela/[0.03]"
                  >
                    <div>
                      <p className="font-body text-sm text-ciruela">{p.clientName}</p>
                      <p className="font-body text-xs text-ciruela/50">
                        {p.service.name} · facial finalizado {p.finishedAt}
                      </p>
                    </div>
                    <span className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso">
                      Cobrar
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Roma Norte — agenda de hoy">
          {agenda.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Sin citas registradas para hoy.
            </p>
          ) : (
            <ul className="divide-y divide-ciruela/8">
              {agenda.map((apt) => (
                <li key={apt.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <span className="w-14 font-body text-sm text-ciruela/60">{apt.time}</span>
                    <div>
                      <p className="font-body text-sm text-ciruela">
                        {apt.clientName}{" "}
                        <span className="text-ciruela/50">
                          · {apt.tier} · {apt.room}
                        </span>
                      </p>
                      {apt.flags.length > 0 && (
                        <p className="mt-0.5 font-body text-xs text-crepe">{apt.flags.join(" · ")}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 font-body text-xs ${STATUS_STYLE[apt.status] ?? "bg-ciruela/8 text-ciruela/70"}`}
                  >
                    {apt.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex gap-3">
            <Link
              href="/staff/check-in"
              className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
            >
              Registrar siguiente cliente
            </Link>
            <Link
              href="/staff/checkout"
              className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
            >
              Venta de mostrador
            </Link>
          </div>
        </Card>
      </div>

      <Card title="Stock retail de un vistazo">
        <ul className="space-y-3">
          {LOW_STOCK_ALERTS.filter((i) => i.ledger === "Retail").map((item) => (
            <li key={item.product} className="flex justify-between">
              <span className="font-body text-sm text-ciruela">{item.product}</span>
              <span className="font-body text-xs text-crepe">
                {item.qty}/{item.par}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function EstheticianToday({ nextClient }: { nextClient: EstheticianNextClient }) {
  const { appointment: next } = nextClient;

  if (!next) {
    return (
      <div className="mx-auto max-w-xl">
        <Card title="Siguiente cliente">
          <p className="py-4 text-center font-body text-sm text-ciruela/50">
            Sin citas asignadas para hoy.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Safety flags — unmissable, at the very top. Spec §7.2. */}
      {nextClient.allergies.length > 0 && (
        <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
            Alerta de alergia
          </p>
          <p className="mt-1 font-body text-sm text-ciruela">{nextClient.allergies.join(", ")}</p>
        </div>
      )}

      <Card title={`Siguiente cliente — ${next.time}`}>
        <p className="font-display text-xl text-ciruela">{next.clientName}</p>
        <p className="mt-1 font-body text-sm text-ciruela/60">
          {next.tier} · {next.room}
        </p>
        <dl className="mt-4 space-y-2 font-body text-sm">
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Tipo de piel</dt>
            <dd className="text-ciruela">{nextClient.skinType ?? "—"}</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Protocolo</dt>
            <dd className="text-ciruela">Pendiente de asignar</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Último tratamiento</dt>
            <dd className="text-ciruela">{nextClient.lastTreatment}</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Preferencias</dt>
            <dd className="text-ciruela">{nextClient.beverage ?? "—"}</dd>
          </div>
        </dl>
        <div className="mt-5 flex gap-3">
          <Link
            href={nextClient.listingId ? `/staff/clients?id=${nextClient.listingId}` : "/staff/clients"}
            className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
          >
            Abrir perfil del cliente
          </Link>
          <Link
            href="/staff/treatment-record"
            className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
          >
            Registrar tratamiento
          </Link>
        </div>
      </Card>
    </div>
  );
}
