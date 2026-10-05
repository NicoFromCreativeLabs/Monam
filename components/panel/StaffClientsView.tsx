"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/panel/Card";
import { TopBar } from "@/components/panel/TopBar";
import { RoleToggle } from "@/components/panel/RoleToggle";
import { useStaffRole } from "@/components/panel/StaffRoleContext";

export interface StaffClientListing {
  id: string;
  name: string;
  phone: string;
}

export interface StaffClientDetail {
  id: string;
  name: string;
  phone: string;
  allergies: string[];
  skinType: string;
  visitObjective: string;
  sunExposure: string;
  aromatherapy: string;
  conversation: string;
  productsOwned: string[];
  treatmentHistory: { protocol: string; date: string }[];
}

// Access boundary (spec §7.4): Front Desk sees safety flags only — never
// cost/margin, clinical notes, or photos. Esthetician sees the full Skin ID
// for clients assigned to them, never business financials or other staff's
// clients. Real Client/ClientSkinId/ClientPreference rows now (Client &
// Clinical phase) — "Primera visita"/"Saldo de paquete"/"Depósito" dropped
// from the old Recepción view since there's no real Appointment/
// PackagePurchase/Deposit data yet to derive them from honestly
// (Booking/Commerce phases); allergies (safety-relevant) are real.
export function StaffClientsView({
  listing,
  detail,
}: {
  listing: StaffClientListing[] | null;
  detail: StaffClientDetail | null;
}) {
  const { role } = useStaffRole();
  const [query, setQuery] = useState("");

  if (!detail) {
    const results = (listing ?? []).filter(
      (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query),
    );
    return (
      <>
        <TopBar
          title="Perfil del cliente"
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
                  Sin resultados{query ? ` para "${query}"` : ""}.
                </p>
              ) : (
                <ul className="divide-y divide-ciruela/8">
                  {results.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/staff/clients?id=${c.id}`}
                        className="flex items-center justify-between py-3 hover:bg-ciruela/[0.03]"
                      >
                        <p className="font-body text-sm text-ciruela">{c.name}</p>
                        <p className="font-body text-xs text-ciruela/50">{c.phone}</p>
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

  return (
    <>
      <TopBar
        title="Perfil del cliente"
        extra={<RoleToggle />}
      />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <Link href="/staff/clients" className="font-body text-xs text-ciruela underline underline-offset-2">
            ← Buscar otra clienta
          </Link>
          <Card>
            <p className="font-display text-xl text-ciruela">{detail.name}</p>
            <p className="font-body text-sm text-ciruela/60">{detail.phone}</p>
          </Card>

          {detail.allergies.length > 0 && (
            <div className="rounded-[18px] border-2 border-crepe bg-crepe/15 px-6 py-4">
              <p className="font-body text-xs font-semibold uppercase tracking-[0.14em] text-ciruela">
                Alerta de seguridad
              </p>
              <p className="mt-1 font-body text-sm text-ciruela">Alergias: {detail.allergies.join(", ")}</p>
            </div>
          )}

          {role === "Front Desk" ? (
            <Card title="Vista Recepción">
              <p className="mb-3 font-body text-xs text-ciruela/50">
                Solo banderas de seguridad — sin notas clínicas ni fotos.
              </p>
              <dl className="space-y-2 font-body text-sm text-ciruela">
                <div className="flex justify-between">
                  <dt className="text-ciruela/50">Alergias registradas</dt>
                  <dd>{detail.allergies.length > 0 ? detail.allergies.join(", ") : "Ninguna"}</dd>
                </div>
              </dl>
            </Card>
          ) : (
            <>
              <Card title="Skin ID completo">
                <dl className="space-y-2 font-body text-sm text-ciruela">
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Tipo de piel</dt>
                    <dd>{detail.skinType || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Objetivo</dt>
                    <dd>{detail.visitObjective || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Exposición solar</dt>
                    <dd>{detail.sunExposure || "—"}</dd>
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
                    <dd>{detail.aromatherapy || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Conversación</dt>
                    <dd>{detail.conversation || "—"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-ciruela/50">Productos que ya tiene</dt>
                    <dd className="text-right">
                      {detail.productsOwned.length > 0 ? detail.productsOwned.join(", ") : "Ninguno"}
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
