import { Card } from "@/components/panel/Card";
import { CLIENT, CLIENT_UPCOMING_APPOINTMENT, CLIENT_PACKAGE_BALANCE } from "@/lib/mock-data";

export default function ClientHome() {
  const apt = CLIENT_UPCOMING_APPOINTMENT;
  const pack = CLIENT_PACKAGE_BALANCE;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-body text-sm text-ciruela/60">Hola,</p>
        <h1 className="font-display text-2xl text-ciruela">{CLIENT.name.split(" ")[0]}</h1>
      </div>

      <Card title="Próxima cita">
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
            <button className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela">
              Reagendar
            </button>
            <button className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso">
              Detalles
            </button>
          </div>
        </div>
      </Card>

      <Card title="Reagenda rápida">
        <p className="font-body text-sm text-ciruela/70">
          Mismo protocolo, misma esteticista — elige tu próximo horario en un toque.
        </p>
        <button className="mt-4 rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso">
          Reagendar Glow con Ana Torres
        </button>
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
