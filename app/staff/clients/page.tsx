"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { RoleToggle } from "@/components/panel/RoleToggle";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { CLIENT_DETAIL, CLIENT_SKIN_ID_PREVIEW } from "@/lib/mock-data";

// Access boundary (spec §7.4): Front Desk sees safety flags only — never
// cost/margin, clinical notes, or photos. Esthetician sees the full Skin ID
// for clients assigned to them, never business financials or other staff's
// clients. This page renders two different scopes from the same route.
export default function StaffClientProfile() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const c = CLIENT_DETAIL;

  return (
    <>
      <TopBar
        title="Perfil del cliente"
        userName={identity.name}
        userRole={identity.role}
        extra={<RoleToggle />}
      />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Card>
            <p className="font-display text-xl text-ciruela">{c.name}</p>
            <p className="font-body text-sm text-ciruela/60">{c.phone}</p>
          </Card>

          {CLIENT_SKIN_ID_PREVIEW.allergies.length > 0 && (
            <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
                Alerta de seguridad
              </p>
              <p className="mt-1 font-body text-sm text-ciruela">
                Alergias: {CLIENT_SKIN_ID_PREVIEW.allergies.join(", ")}
              </p>
            </div>
          )}

          {role === "Front Desk" ? (
            <Card title="Vista Recepción">
              <p className="mb-3 font-body text-xs text-ciruela/50">
                Solo banderas de seguridad — sin notas clínicas ni fotos.
              </p>
              <dl className="space-y-2 font-body text-sm text-ciruela">
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Primera visita</dt>
                  <dd>No</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Depósito</dt>
                  <dd className="text-oliva">Pagado</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Saldo de paquete</dt>
                  <dd>2 sesiones restantes</dd>
                </div>
              </dl>
            </Card>
          ) : (
            <>
              <Card title="Skin ID completo">
                <dl className="space-y-2 font-body text-sm text-ciruela">
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Tipo de piel</dt>
                    <dd>{c.skinId.skinType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Objetivo</dt>
                    <dd>{c.skinId.visitObjective}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Exposición solar</dt>
                    <dd>{c.skinId.sunExposure}</dd>
                  </div>
                </dl>
              </Card>
              <Card title="Historial de tratamientos">
                <ul className="divide-y divide-ciruela/8">
                  {c.treatmentHistory.map((t, i) => (
                    <li key={i} className="flex justify-between py-2 font-body text-sm text-ciruela">
                      <span>{t.protocol}</span>
                      <span className="text-ciruela/50">{t.date}</span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title="Preferencias">
                <dl className="space-y-2 font-body text-sm text-ciruela">
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Aromaterapia</dt>
                    <dd>{c.preferences.aromatherapy}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Conversación</dt>
                    <dd>{c.preferences.conversation}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Productos que ya tiene</dt>
                    <dd className="text-right">{c.preferences.productsOwned.join(", ")}</dd>
                  </div>
                </dl>
              </Card>
            </>
          )}
        </div>
      </div>
    </>
  );
}
