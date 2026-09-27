"use client";

import Link from "next/link";
import { Card } from "@/components/panel/Card";
import { useClientBooking } from "@/components/panel/ClientBookingContext";
import { CLIENT } from "@/lib/mock-data";

export default function ClientHome() {
  const { upcoming, packageBalance: pack } = useClientBooking();
  const apt = upcoming[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm text-ciruela/60">Hola,</p>
        <h1 className="font-display text-2xl text-ciruela">{CLIENT.name.split(" ")[0]}</h1>
      </div>

      <Card title="Próxima cita">
        {apt ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-display text-lg text-ciruela">{apt.protocolTier}</p>
              <p className="font-body text-sm text-ciruela/60">
                {apt.date} · {apt.time} · {apt.location}
              </p>
              <p className="mt-1 font-body text-xs text-oliva">
                {apt.depositPaid ? "Depósito pagado" : "Depósito pendiente"}
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

      <Card title="Reagenda rápida">
        <p className="font-body text-sm text-ciruela/70">
          Repite tu protocolo y elige tu próximo horario.
        </p>
        <Link
          href="/my/book"
          className="mt-4 inline-block rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
        >
          Reagendar Glow
        </Link>
      </Card>

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
    </div>
  );
}
