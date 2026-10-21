"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/panel/Card";
import { purchasePackageAction } from "@/lib/actions/packages";
import type { PackageBalanceView } from "@/lib/packages-core";
import { claimDiscountAction } from "@/lib/actions/client-discounts";
import type { AccountDiscounts } from "@/lib/client-discounts";

export interface PackageCatalogItem {
  id: string;
  name: string;
  sessions: number;
  tier: "Targeted" | "Signature";
  priceMxn: number;
  listPriceMxn: number;
}

export interface PackageRedemptionItem {
  id: string;
  index: number;
  redeemedAt: string;
  locationName: string;
}

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });

export function ClientPackagesView({
  activePackage,
  redemptions,
  catalog,
  discounts,
}: {
  activePackage: PackageBalanceView | null;
  redemptions: PackageRedemptionItem[];
  catalog: PackageCatalogItem[];
  discounts: AccountDiscounts;
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

  async function claim(codeId: string) {
    setClaiming(codeId);
    setClaimError(null);
    try {
      const result = await claimDiscountAction(codeId);
      if ("error" in result) setClaimError(result.error);
      else router.refresh();
    } catch {
      setClaimError("No se pudo reclamar. Intenta de nuevo.");
    } finally {
      setClaiming(null);
    }
  }

  const [pendingPurchase, setPendingPurchase] = useState<PackageCatalogItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirmPurchase() {
    if (!pendingPurchase) return;
    setPurchasing(true);
    setError(null);
    const result = await purchasePackageAction(pendingPurchase.id);
    if ("error" in result) {
      setPurchasing(false);
      setError(result.error);
      return;
    }
    window.location.href = result.checkoutUrl;
  }

  const hasDiscounts = discounts.claimable.length + discounts.mine.length + discounts.used.length > 0;

  return (
    <div className="space-y-6">
      {hasDiscounts && (
        <Card title="Mis descuentos">
          {claimError && (
            <p className="mb-3 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">{claimError}</p>
          )}
          <ul className="divide-y divide-ciruela/8">
            {discounts.claimable.map((d) => (
              <li key={d.codeId} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">{d.name}</p>
                  <p className="font-body text-xs text-ciruela/60">
                    {d.summary}
                    {d.claimUntil ? ` · reclámalo antes del ${formatDay(d.claimUntil)}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => claim(d.codeId)}
                  disabled={claiming === d.codeId}
                  className="shrink-0 rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
                >
                  {claiming === d.codeId ? "Reclamando…" : "Reclamar"}
                </button>
              </li>
            ))}
            {discounts.mine.map((d) => (
              <li key={d.codeId} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">{d.name}</p>
                  <p className="font-body text-xs text-ciruela/60">
                    {d.summary}
                    {d.usableUntil ? ` · úsalo antes del ${formatDay(d.usableUntil)}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-oliva/15 px-3 py-1 font-body text-xs text-oliva">
                  En tu cuenta
                </span>
              </li>
            ))}
            {discounts.used.map((d) => (
              <li key={d.codeId} className="flex items-center justify-between gap-3 py-3 opacity-60">
                <div>
                  <p className="font-body text-sm text-ciruela">{d.name}</p>
                  <p className="font-body text-xs text-ciruela/60">Usado el {formatDay(d.usedAt)}</p>
                </div>
              </li>
            ))}
          </ul>
          {discounts.mine.length > 0 && (
            <p className="mt-3 font-body text-xs text-ciruela/50">
              Tus descuentos en tu cuenta se aplican al pagar en recepción; solo dile a la vendedora que tienes uno.
            </p>
          )}
        </Card>
      )}

      <Card title="Mis paquetes">
        {activePackage ? (
          <>
            <div className="flex items-center justify-between border-b border-ciruela/8 pb-4">
              <div>
                <p className="font-display text-lg text-ciruela">{activePackage.name}</p>
                <p className="font-body text-sm text-ciruela/60">Vence el {activePackage.expiresOn}</p>
              </div>
              <p className="font-display text-2xl text-ciruela">
                {activePackage.sessionsRemaining}{" "}
                <span className="font-body text-sm text-ciruela/50">sesiones restantes</span>
              </p>
            </div>
            {redemptions.length > 0 && (
              <ul className="mt-4 divide-y divide-ciruela/8 font-body text-sm text-ciruela">
                {redemptions.map((r) => (
                  <li key={r.id} className="flex justify-between py-2">
                    <span>Sesión {r.index} — usada</span>
                    <span className="text-ciruela/50">
                      {r.redeemedAt} · {r.locationName}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="py-3 font-body text-sm text-ciruela/50">
            No tienes un paquete activo todavía.
          </p>
        )}
      </Card>

      <Card title="Comprar un paquete">
        <p className="mb-3 font-body text-xs text-ciruela/50">
          Prepaga varias sesiones y ahorra vs. reservar una por una.
        </p>
        <ul className="divide-y divide-ciruela/8">
          {catalog.map((p) => (
            <li key={p.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-sm text-ciruela">{p.name}</p>
                <p className="font-body text-xs text-ciruela/50">
                  {p.sessions} sesiones · {p.tier}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-body text-sm text-ciruela">${p.priceMxn.toLocaleString()} MXN</p>
                  <p className="font-body text-xs text-ciruela/40 line-through">
                    ${p.listPriceMxn.toLocaleString()} MXN
                  </p>
                </div>
                <button
                  onClick={() => setPendingPurchase(p)}
                  className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso"
                >
                  Comprar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {pendingPurchase && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => !purchasing && setPendingPurchase(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">Confirmar compra</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              {pendingPurchase.name} — {pendingPurchase.sessions} sesiones por $
              {pendingPurchase.priceMxn.toLocaleString()} MXN.
            </p>
            <p className="mt-2 font-body text-xs text-ciruela/50">
              Pagas en el checkout seguro de Stripe — tu paquete se activa en cuanto el pago se
              confirme.
            </p>
            {error && (
              <p className="mt-2 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingPurchase(null)}
                disabled={purchasing}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPurchase}
                disabled={purchasing}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
              >
                {purchasing ? "Redirigiendo a pago…" : "Comprar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
