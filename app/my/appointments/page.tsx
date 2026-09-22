import { Card } from "@/components/panel/Card";
import { CLIENT_APPOINTMENTS_LIST } from "@/lib/mock-data";

// Upcoming, past, reschedule, cancel — policy-aware (spec §5.2/§8.1): ≥24h
// notice is free, inside the window shows the deposit-forfeit warning inline.
export default function ClientAppointments() {
  const { upcoming, past } = CLIENT_APPOINTMENTS_LIST;

  return (
    <div className="space-y-6">
      <Card title="Próximas">
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
                <button className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela">
                  Reagendar
                </button>
                <button className="rounded-full border border-crepe px-3 py-1.5 font-body text-xs text-ciruela">
                  Cancelar
                </button>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-body text-xs text-ciruela/40">
          Cancelación sin costo hasta 24 horas antes. Dentro de la ventana, se pierde el
          depósito o una sesión del paquete.
        </p>
      </Card>

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
    </div>
  );
}
