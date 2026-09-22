"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { RoleToggle } from "@/components/panel/RoleToggle";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import {
  TODAY_APPOINTMENTS,
  CLIENT_SKIN_ID_PREVIEW,
  LOW_STOCK_ALERTS,
} from "@/lib/mock-data";

const STATUS_STYLE: Record<string, string> = {
  Registrado: "bg-oliva/15 text-oliva",
  Esperando: "bg-pastel/40 text-ciruela",
  Retrasado: "bg-crepe/40 text-ciruela",
  Confirmado: "bg-ciruela/8 text-ciruela/70",
};

export default function StaffToday() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);

  return (
    <>
      <TopBar title="Hoy" userName={identity.name} userRole={identity.role} extra={<RoleToggle />} />
      <div className="flex-1 px-8 py-6">
        {role === "Front Desk" ? <FrontDeskToday /> : <EstheticianToday />}
      </div>
    </>
  );
}

function FrontDeskToday() {
  return (
    <div className="grid grid-cols-1 gap-6 min-[1100px]:grid-cols-3">
      <div className="min-[1100px]:col-span-2">
        <Card title="Roma Norte — agenda de hoy">
          <ul className="divide-y divide-ciruela/8">
            {TODAY_APPOINTMENTS.map((apt) => (
              <li key={apt.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-4">
                  <span className="w-14 font-body text-sm text-ciruela/60">{apt.time}</span>
                  <div>
                    <p className="font-body text-sm text-ciruela">
                      {apt.client}{" "}
                      <span className="text-ciruela/50">
                        · {apt.tier} · {apt.room}
                      </span>
                    </p>
                    {apt.flags.length > 0 && (
                      <p className="mt-0.5 font-body text-xs text-crepe">
                        {apt.flags.join(" · ")}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`rounded-full px-3 py-1 font-body text-xs ${STATUS_STYLE[apt.status]}`}
                >
                  {apt.status}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3">
            <button className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso">
              Registrar siguiente cliente
            </button>
            <button className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela">
              Cobrar / vender / reagendar
            </button>
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

function EstheticianToday() {
  const next = TODAY_APPOINTMENTS[0];
  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Safety flags — unmissable, at the very top. Spec §7.2. */}
      {CLIENT_SKIN_ID_PREVIEW.allergies.length > 0 && (
        <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
          <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
            Alerta de alergia
          </p>
          <p className="mt-1 font-body text-sm text-ciruela">
            {CLIENT_SKIN_ID_PREVIEW.allergies.join(", ")}
          </p>
        </div>
      )}

      <Card title={`Siguiente cliente — ${next.time}`}>
        <p className="font-display text-xl text-ciruela">{next.client}</p>
        <p className="mt-1 font-body text-sm text-ciruela/60">
          {next.tier} · {next.room}
        </p>
        <dl className="mt-4 space-y-2 font-body text-sm">
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Tipo de piel</dt>
            <dd className="text-ciruela">{CLIENT_SKIN_ID_PREVIEW.skinType}</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Protocolo</dt>
            <dd className="text-ciruela">Pendiente de asignar</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Último tratamiento</dt>
            <dd className="text-ciruela">{CLIENT_SKIN_ID_PREVIEW.lastTreatment}</dd>
          </div>
          <div className="flex justify-between border-t border-ciruela/8 pt-2">
            <dt className="text-ciruela/50">Preferencias</dt>
            <dd className="text-ciruela">{CLIENT_SKIN_ID_PREVIEW.beverage}</dd>
          </div>
        </dl>
        <div className="mt-5 flex gap-3">
          <button className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso">
            Abrir perfil del cliente
          </button>
          <button className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela">
            Registrar tratamiento
          </button>
        </div>
      </Card>
    </div>
  );
}
