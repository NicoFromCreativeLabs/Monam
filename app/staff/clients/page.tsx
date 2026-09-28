"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { RoleToggle } from "@/components/panel/RoleToggle";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { CLIENTS_LIST, CLIENT_DETAILS_BY_ID, CLIENT_PACKAGE_BALANCE } from "@/lib/mock-data";

// Access boundary (spec §7.4): Front Desk sees safety flags only — never
// cost/margin, clinical notes, or photos. Esthetician sees the full Skin ID
// for clients assigned to them, never business financials or other staff's
// clients. This page renders two different scopes from the same route.
//
// Search + ?id= lookup — found during the persona QA pass always rendering
// the same single seeded client ("Valentina Reyes") regardless of who staff
// actually needed to look up, including when linked from a specific "next
// client" elsewhere in the app.
export default function StaffClientProfile() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [query, setQuery] = useState("");

  const listed = CLIENTS_LIST.find((c) => c.id === id);
  const detail = id ? CLIENT_DETAILS_BY_ID[id] : undefined;

  if (!listed || !detail) {
    const results = CLIENTS_LIST.filter(
      (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query),
    );
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
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre o teléfono…"
                className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
              />
            </Card>
            <Card title="Resultados">
              {results.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-ciruela/50">
                  Sin resultados para &ldquo;{query}&rdquo;.
                </p>
              ) : (
                <ul className="divide-y divide-ciruela/8">
                  {results.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/staff/clients?id=${c.id}`}
                        className="flex items-center justify-between py-3 hover:bg-ciruela/[0.03]"
                      >
                        <div>
                          <p className="font-body text-sm text-ciruela">{c.name}</p>
                          <p className="font-body text-xs text-ciruela/50">{c.phone}</p>
                        </div>
                        <span className="font-body text-xs text-ciruela/40">
                          Última visita {c.lastVisit || "—"}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </>
    );
  }

  const isFirstVisit = listed.flags.includes("Primera visita");
  const hasActivePackage = listed.flags.some((f) => f.startsWith("Pack"));

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
          <div className="flex items-center justify-between">
            <Link
              href="/staff/clients"
              className="font-body text-xs text-ciruela underline underline-offset-2"
            >
              ← Buscar otra clienta
            </Link>
          </div>
          <Card>
            <p className="font-display text-xl text-ciruela">{detail.name}</p>
            <p className="font-body text-sm text-ciruela/60">{detail.phone}</p>
          </Card>

          {detail.skinId.allergies.length > 0 && (
            <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
                Alerta de seguridad
              </p>
              <p className="mt-1 font-body text-sm text-ciruela">
                Alergias: {detail.skinId.allergies.join(", ")}
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
                  <dd>{isFirstVisit ? "Sí" : "No"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Depósito</dt>
                  <dd className="text-oliva">Pagado</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Saldo de paquete</dt>
                  <dd>
                    {hasActivePackage
                      ? `${CLIENT_PACKAGE_BALANCE.sessionsRemaining} sesiones restantes`
                      : "Sin paquete activo"}
                  </dd>
                </div>
              </dl>
            </Card>
          ) : (
            <>
              <Card title="Skin ID completo">
                <dl className="space-y-2 font-body text-sm text-ciruela">
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Tipo de piel</dt>
                    <dd>{detail.skinId.skinType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Objetivo</dt>
                    <dd>{detail.skinId.visitObjective}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Exposición solar</dt>
                    <dd>{detail.skinId.sunExposure}</dd>
                  </div>
                </dl>
              </Card>
              <Card title="Historial de tratamientos">
                {detail.treatmentHistory.length === 0 ? (
                  <p className="py-2 font-body text-sm text-ciruela/50">Sin tratamientos previos.</p>
                ) : (
                  <ul className="divide-y divide-ciruela/8">
                    {detail.treatmentHistory.map((t, i) => (
                      <li key={i} className="flex justify-between py-2 font-body text-sm text-ciruela">
                        <span>{t.protocol}</span>
                        <span className="text-ciruela/50">{t.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Preferencias">
                <dl className="space-y-2 font-body text-sm text-ciruela">
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Aromaterapia</dt>
                    <dd>{detail.preferences.aromatherapy}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Conversación</dt>
                    <dd>{detail.preferences.conversation}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Productos que ya tiene</dt>
                    <dd className="text-right">
                      {detail.preferences.productsOwned.length > 0
                        ? detail.preferences.productsOwned.join(", ")
                        : "Ninguno"}
                    </dd>
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
