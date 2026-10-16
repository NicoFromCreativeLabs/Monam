"use client";

import Link from "next/link";
import { Card } from "@/components/panel/Card";
import { useCurrentClient } from "@/components/panel/CurrentClientContext";
import type { UpcomingAppointmentView } from "@/components/panel/ClientAppointmentsView";
import type { PackageBalanceView } from "@/lib/packages-core";

// "Próxima cita" and "Saldo de paquete" are both real now — no invented
// mock data shown to a client who's never booked or bought anything
// (Commerce phase: see getPackageBalance in app/my/packages/page.tsx).
export function ClientHomeView({
  nextAppointment,
  packageBalance: pack,
  lastProtocolName,
}: {
  nextAppointment: UpcomingAppointmentView | null;
  packageBalance: PackageBalanceView | null;
  lastProtocolName: string | null;
}) {
  const client = useCurrentClient();

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm text-ciruela/60">Hola,</p>
        <h1 className="font-display text-2xl text-ciruela">{client.name.split(" ")[0]}</h1>
      </div>

      <Card title="Próxima cita">
        {nextAppointment ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-ciruela">{nextAppointment.protocolTier}</p>
              <p className="font-body text-sm text-ciruela/60">
                {nextAppointment.date} · {nextAppointment.time} · {nextAppointment.location}
              </p>
              <p className="mt-1 font-body text-xs text-oliva">
                {nextAppointment.depositPaid ? "Depósito pagado" : "Depósito pendiente"}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/my/appointments"
                className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Reagendar
              </Link>
              <Link
                href="/my/appointments"
                className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
              >
                Detalles
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="font-body text-sm text-ciruela/60">No tienes citas próximas.</p>
            <Link
              href="/my/book"
              className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
            >
              Reservar
            </Link>
          </div>
        )}
      </Card>

      {lastProtocolName && (
        <Card title="Reagenda rápida">
          <p className="font-body text-sm text-ciruela/70">
            Repite tu protocolo y elige tu próximo horario.
          </p>
          <Link
            href="/my/book"
            className="mt-4 inline-block rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
          >
            Reagendar {lastProtocolName}
          </Link>
        </Card>
      )}

      {pack && (
        <Card title="Saldo de paquete">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-ciruela">{pack.name}</p>
              <p className="font-body text-sm text-ciruela/60">Vence el {pack.expiresOn}</p>
            </div>
            <p className="font-display text-2xl text-ciruela">
              {pack.sessionsRemaining}{" "}
              <span className="font-body text-sm text-ciruela/50">sesiones restantes</span>
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
