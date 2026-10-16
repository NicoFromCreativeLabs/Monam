"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { purchasePackageAction } from "@/lib/actions/packages";
import type { PackageBalanceView } from "@/lib/packages-core";

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

export function ClientPackagesView({
  activePackage,
  redemptions,
  catalog,
}: {
  activePackage: PackageBalanceView | null;
  redemptions: PackageRedemptionItem[];
  catalog: PackageCatalogItem[];
}) {
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

  return (
    <div className="space-y-6">
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
