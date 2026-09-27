"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { useClientBooking } from "@/components/panel/ClientBookingContext";
import { PACKAGE_OPTIONS } from "@/lib/mock-data";

// Sessions remaining, expiry, which location redeemed each session (spec §8.1).
export default function ClientPackages() {
  const { packageBalance: pack, purchasePackage } = useClientBooking();
  const [pendingPurchase, setPendingPurchase] = useState<(typeof PACKAGE_OPTIONS)[number] | null>(
    null,
  );

  function confirmPurchase() {
    if (!pendingPurchase) return;
    purchasePackage(pendingPurchase);
    setPendingPurchase(null);
  }

  return (
    <div className="space-y-6">
      <Card title="Mis paquetes">
        <div className="flex items-center justify-between border-b border-ciruela/8 pb-4">
          <div>
            <p className="font-display text-lg text-ciruela">{pack.name}</p>
            <p className="font-body text-sm text-ciruela/60">Vence el {pack.expiresOn}</p>
          </div>
          <p className="font-display text-2xl text-ciruela">
            {pack.sessionsRemaining}{" "}
            <span className="font-body text-sm text-ciruela/50">sesiones restantes</span>
          </p>
        </div>
        <ul className="mt-4 divide-y divide-ciruela/8 font-body text-sm text-ciruela">
          <li className="flex justify-between py-2">
            <span>Sesión 1 — usada</span>
            <span className="text-ciruela/50">2026-08-24 · Roma Norte</span>
          </li>
          <li className="flex justify-between py-2">
            <span>Sesión 2 — usada</span>
            <span className="text-ciruela/50">2026-09-21 · Roma Norte</span>
          </li>
        </ul>
      </Card>

      <Card title="Comprar un paquete">
        <p className="mb-3 font-body text-xs text-ciruela/50">
          Prepaga varias sesiones y ahorra vs. reservar una por una.
        </p>
        <ul className="divide-y divide-ciruela/8">
          {PACKAGE_OPTIONS.map((p) => (
            <li key={p.name} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-sm text-ciruela">{p.name}</p>
                <p className="font-body text-xs text-ciruela/50">
                  {p.sessions} sesiones · {p.tier}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-body text-sm text-ciruela">${p.price.toLocaleString()} MXN</p>
                  <p className="font-body text-xs text-ciruela/40 line-through">
                    ${p.listPrice.toLocaleString()} MXN
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
          onClick={() => setPendingPurchase(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">Confirmar compra</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              {pendingPurchase.name} — {pendingPurchase.sessions} sesiones por $
              {pendingPurchase.price.toLocaleString()} MXN.
            </p>
            <p className="mt-2 font-body text-xs text-ciruela/50">
              Se cobrará a tu método de pago guardado. Reemplaza tu paquete activo actual.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingPurchase(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={confirmPurchase}
                className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
              >
                Comprar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
