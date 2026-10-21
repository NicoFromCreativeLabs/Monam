"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/panel/Card";
import { purchasePackageAction } from "@/lib/actions/packages";
import type { PackageBalanceView } from "@/lib/packages-core";
import { claimDiscountAction, claimDiscountByCodeAction } from "@/lib/actions/client-discounts";
import { QrScanner } from "@/components/panel/QrScanner";
import { QrPhotoButton } from "@/components/panel/QrPhotoButton";
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
  claimCode,
}: {
  activePackage: PackageBalanceView | null;
  redemptions: PackageRedemptionItem[];
  catalog: PackageCatalogItem[];
  discounts: AccountDiscounts;
  claimCode: string | null; // from a scanned promo QR (/my/packages?reclamar=CODE)
}) {
  const router = useRouter();
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimOk, setClaimOk] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [codeText, setCodeText] = useState("");

  // Add a discount to the account from a code, typed or scanned from a promo QR.
  async function claimByCode(raw: string) {
    setClaiming("code");
    setClaimError(null);
    setClaimOk(null);
    try {
      const result = await claimDiscountByCodeAction(raw);
      if ("error" in result) {
        setClaimError(result.error);
        setClaimOpen(true);
      } else {
        setClaimOk(`Listo: "${result.name}" ya está en tu cuenta.`);
        setCodeText("");
        setClaimOpen(false);
        router.refresh();
      }
    } catch {
      setClaimError("No se pudo reclamar. Intenta de nuevo.");
    } finally {
      setClaiming(null);
    }
  }

  // Arriving from a promo QR: claim it once, then clean the address.
  const claimedFromLink = useRef(false);
  useEffect(() => {
    if (!claimCode || claimedFromLink.current) return;
    claimedFromLink.current = true;
    claimByCode(claimCode).finally(() => window.history.replaceState(null, "", "/my/packages"));
    // Runs once for the link's code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimCode]);

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

  return (
    <div className="space-y-6">
      {(
        <Card title="Mis descuentos">
          {claimOk && (
            <p className="mb-3 rounded-lg bg-oliva/10 px-3 py-2 font-body text-xs text-oliva">{claimOk}</p>
          )}
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
          {discounts.claimable.length + discounts.mine.length + discounts.used.length === 0 && (
            <p className="py-2 font-body text-sm text-ciruela/50">
              Todavía no tienes descuentos. Escanea el QR de una promoción o escribe su código para reclamarla.
            </p>
          )}
          {discounts.mine.length > 0 && (
            <p className="mt-3 font-body text-xs text-ciruela/50">
              Tus descuentos en tu cuenta se aplican al pagar en recepción; solo dile a la vendedora que tienes uno.
            </p>
          )}

          <div className="mt-4 border-t border-ciruela/8 pt-4">
            {claimOpen ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  claimByCode(codeText);
                }}
                className="space-y-2"
              >
                <div className="flex gap-2">
                  <input
                    autoFocus
                    value={codeText}
                    onChange={(e) => setCodeText(e.target.value.toUpperCase())}
                    placeholder="Código del descuento"
                    className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                  />
                  <button
                    type="button"
                    onClick={() => setScanning(true)}
                    className="shrink-0 rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                  >
                    Escanear QR
                  </button>
                  <QrPhotoButton onDetect={(text) => claimByCode(text)} onError={setClaimError} />
                </div>
                {claimError && <p className="font-body text-xs text-[#b3392f]">{claimError}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={claiming === "code" || !codeText.trim()}
                    className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50"
                  >
                    {claiming === "code" ? "Reclamando…" : "Reclamar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClaimOpen(false);
                      setClaimError(null);
                    }}
                    className="font-body text-xs text-ciruela/70 underline"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  setClaimOpen(true);
                  setClaimOk(null);
                }}
                className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Reclamar un descuento (QR o código)
              </button>
            )}
          </div>
        </Card>
      )}

      {scanning && (
        <QrScanner
          onClose={() => setScanning(false)}
          onDetect={(text) => {
            setScanning(false);
            setClaimOpen(true);
            claimByCode(text);
          }}
        />
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
