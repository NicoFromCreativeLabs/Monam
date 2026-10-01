"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { CFDI_ENABLED } from "@/lib/feature-flags";
import { createSaleAction, flagRetailRemovalAction } from "@/lib/actions/commerce";

export interface CheckoutRetailItem {
  sku: string;
  name: string;
  price: number;
  recommendedBy: string;
}

export interface CheckoutSession {
  appointmentId: string;
  locationName: string;
  clientName: string;
  service: { name: string; price: number };
  retailItems: CheckoutRetailItem[];
  depositCredit: number;
}

export interface CheckoutCatalogItem {
  sku: string;
  product: string;
  price: number;
  qty: number;
}

type AddedItem = { sku: string; product: string; price: number; qty: number };

// Two genuinely different flows share this screen, per how the studio
// actually works: (1) a specific client's ticket, reached ONLY from the
// "lista para cobro" item an esthetician's finished session put on the
// front-desk dashboard (a real query, getPendingCheckouts()); (2) navigating
// to Cobro/POS directly, with no session selected, a walk-in retail sale
// with no client record attached. "Cobrar" writes a real Sale/SaleLineItem
// via createSaleAction — inventory decrements, the deposit (if any) gets
// credited, and commission entries are generated server-side, so the
// appointment stops showing as pending checkout once this succeeds.
export function StaffCheckoutView({
  session,
  catalog,
  locationName,
}: {
  session: CheckoutSession | null;
  catalog: CheckoutCatalogItem[];
  locationName: string;
}) {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isRetailOnly = !session;

  const [recommendedItems, setRecommendedItems] = useState<CheckoutRetailItem[]>(
    session?.retailItems ?? [],
  );
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingRemove, setPendingRemove] = useState<CheckoutRetailItem | null>(null);
  const [charged, setCharged] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "SPEI">("CASH");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // Products whose recommendation tag was removed this session — re-adding
  // one of these needs the same warning removal got, closing the two-step
  // gap a front-desk-persona pentest found: removal was guarded, but
  // re-adding the identical product afterward silently dropped attribution
  // with zero confirmation, moving the commission off whoever recommended it.
  const [removedRecommendations, setRemovedRecommendations] = useState<CheckoutRetailItem[]>([]);
  const [reAddedSkus, setReAddedSkus] = useState<string[]>([]);
  const [pendingReAdd, setPendingReAdd] = useState<{ sku: string; product: string; price: number } | null>(
    null,
  );

  const addToSale = (item: { sku: string; product: string; price: number }) => {
    setAddedItems((prev) => [...prev, { ...item, qty: 1 }]);
  };
  const requestAddToSale = (item: { sku: string; product: string; price: number }) => {
    const removed = removedRecommendations.find((r) => r.sku === item.sku);
    if (removed) {
      setPendingReAdd(item);
      return;
    }
    addToSale(item);
  };
  const confirmReAdd = () => {
    if (!pendingReAdd || !session) return;
    const removed = removedRecommendations.find((r) => r.sku === pendingReAdd.sku);
    addToSale(pendingReAdd);
    if (removed) {
      setReAddedSkus((prev) => [...prev, pendingReAdd.sku]);
      // The definitive anomaly record is written server-side by
      // createSaleAction once the sale actually completes (not here — the
      // ticket could still be abandoned before charging).
      startTransition(() => {
        flagRetailRemovalAction(
          `"${pendingReAdd.product}" fue re-agregado al ticket de ${session.clientName} después de quitarse la recomendación de ${removed.recommendedBy} — confirmar a quién se atribuye la comisión.`,
        );
      });
    }
    setPendingReAdd(null);
  };
  const removeAddedItem = (sku: string) => {
    setAddedItems((prev) => prev.filter((a) => a.sku !== sku));
  };
  const setAddedQty = (sku: string, qty: number, stockLimit: number) => {
    if (qty < 1) {
      removeAddedItem(sku);
      return;
    }
    setAddedItems((prev) =>
      prev.map((a) => (a.sku === sku ? { ...a, qty: Math.min(qty, stockLimit) } : a))
    );
  };
  const closePicker = () => {
    setPickerOpen(false);
    setSearch("");
  };

  const confirmRemoveRecommended = () => {
    if (!pendingRemove || !session) return;
    setRecommendedItems((prev) => prev.filter((r) => r.sku !== pendingRemove.sku));
    setRemovedRecommendations((prev) => [...prev, pendingRemove]);
    startTransition(() => {
      flagRetailRemovalAction(
        `"${pendingRemove.name}" (recomendado por ${pendingRemove.recommendedBy}) fue quitado del ticket de ${session.clientName} — revisar atribución de comisión.`,
      );
    });
    setPendingRemove(null);
  };

  const servicePrice = session?.service.price ?? 0;
  const depositCredit = session?.depositCredit ?? 0;
  const retailTotal =
    recommendedItems.reduce((sum, i) => sum + i.price, 0) +
    addedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const subtotal = servicePrice + retailTotal;
  const total = Math.max(0, subtotal + depositCredit);

  const [chargedSummary, setChargedSummary] = useState<{
    clientName: string | null;
    total: number;
  } | null>(null);

  function chargeSale() {
    setCheckoutError(null);
    const retailItems = [
      ...recommendedItems.map((r) => ({ sku: r.sku, qty: 1 })),
      ...addedItems.map((a) => ({ sku: a.sku, qty: a.qty })),
    ];
    startTransition(async () => {
      const result = await createSaleAction({
        appointmentId: session?.appointmentId ?? null,
        locationName: session?.locationName ?? locationName,
        retailItems,
        reAddedAfterRemovalSkus: reAddedSkus,
        paymentMethod,
      });
      if ("error" in result) {
        setCheckoutError(result.error);
        return;
      }
      setChargedSummary({ clientName: session?.clientName ?? null, total: result.totalMxn });
      setCharged(true);
      router.refresh();
    });
  }

  function startNextRetailSale() {
    setAddedItems([]);
    setChargedSummary(null);
    setCharged(false);
  }

  const filteredCatalog = catalog.filter((item) =>
    item.product.toLowerCase().includes(search.toLowerCase())
  );

  if (charged && chargedSummary) {
    return (
      <>
        <TopBar title="Cobro / POS" userName={identity.name} userRole={identity.role} />
        <div className="flex-1 px-8 py-6">
          <div className="mx-auto max-w-lg">
            <Card title="Cobro completado">
              <p className="font-body text-sm text-ciruela">
                {chargedSummary.clientName
                  ? `Se cobró $${chargedSummary.total} MXN a ${chargedSummary.clientName}.`
                  : `Venta de mostrador cobrada — $${chargedSummary.total} MXN.`}
              </p>
              <div className="mt-5 flex gap-3">
                {chargedSummary.clientName ? (
                  <Link
                    href="/staff"
                    className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
                  >
                    Volver a Hoy
                  </Link>
                ) : (
                  <button
                    onClick={startNextRetailSale}
                    className="rounded-full bg-ciruela px-4 py-2 font-body text-xs text-hueso"
                  >
                    Nueva venta de mostrador
                  </button>
                )}
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Cobro / POS" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-lg">
          {isRetailOnly && (
            <div className="mb-4 rounded-2xl border border-ciruela/15 bg-ciruela/5 px-4 py-3">
              <p className="font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                Venta de mostrador
              </p>
              <p className="mt-1 font-body text-xs text-ciruela/50">
                Sin sesión seleccionada — solo productos retail, sin ficha de clienta. Para
                cobrar un facial, ábrelo desde &ldquo;Listas para cobro&rdquo; en Hoy.
              </p>
            </div>
          )}
          <Card title={session ? `Ticket — ${session.clientName}` : "Venta de mostrador"}>
            <ul className="divide-y divide-ciruela/8 font-body text-sm text-ciruela">
              {session && (
                <li className="flex justify-between py-2">
                  <span>{session.service.name}</span>
                  <span>${session.service.price} MXN</span>
                </li>
              )}
              {recommendedItems.map((item) => (
                <li key={item.sku} className="flex justify-between py-2">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-xs text-ciruela/50">Recomendado por {item.recommendedBy}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>${item.price} MXN</span>
                    <button
                      onClick={() => setPendingRemove(item)}
                      aria-label={`Quitar ${item.name}`}
                      className="text-ciruela/40 hover:text-ciruela"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
              {addedItems.map((item) => {
                const stock = catalog.find((r) => r.sku === item.sku)?.qty ?? item.qty;
                return (
                  <li key={item.sku} className="flex justify-between py-2">
                    <span>
                      {item.product}
                      {item.qty > 1 && <span className="text-ciruela/50"> ×{item.qty}</span>}
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setAddedQty(item.sku, item.qty - 1, stock)}
                          aria-label={`Quitar una unidad de ${item.product}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-ciruela/30 text-xs text-ciruela hover:border-ciruela"
                        >
                          −
                        </button>
                        <span className="w-4 text-center text-xs">{item.qty}</span>
                        <button
                          disabled={item.qty >= stock}
                          onClick={() => setAddedQty(item.sku, item.qty + 1, stock)}
                          aria-label={`Agregar una unidad de ${item.product}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full border border-ciruela/30 text-xs text-ciruela hover:border-ciruela disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ciruela/30"
                        >
                          +
                        </button>
                      </div>
                      <span className="w-16 text-right">${item.price * item.qty} MXN</span>
                      <button
                        onClick={() => removeAddedItem(item.sku)}
                        aria-label={`Quitar ${item.product}`}
                        className="text-ciruela/40 hover:text-ciruela"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
              {session && depositCredit !== 0 && (
                <li className="flex justify-between py-2 text-oliva">
                  <span>Crédito de depósito</span>
                  <span>-${Math.abs(depositCredit)} MXN</span>
                </li>
              )}
              {!session && recommendedItems.length === 0 && addedItems.length === 0 && (
                <li className="py-4 text-center text-ciruela/40">
                  Agrega productos para iniciar la venta.
                </li>
              )}
            </ul>

            <button
              onClick={() => setPickerOpen(true)}
              className="mt-3 w-full rounded-full border border-dashed border-ciruela/30 py-2 font-body text-xs text-ciruela/70 hover:border-ciruela hover:text-ciruela"
            >
              + Agregar producto
            </button>

            <div className="mt-3 flex justify-between border-t border-ciruela/15 pt-3 font-body text-base font-medium text-ciruela">
              <span>Total</span>
              <span>${total} MXN</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {([
                ["CASH", "Efectivo"],
                ["CARD", "Tarjeta"],
                ["SPEI", "SPEI"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  aria-pressed={paymentMethod === value}
                  className={`rounded-full border border-ciruela px-3 py-2 font-body text-xs ${
                    paymentMethod === value ? "bg-ciruela text-hueso" : "text-ciruela hover:bg-ciruela hover:text-hueso"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {CFDI_ENABLED && (
              <label className="mt-4 flex items-center gap-2 font-body text-xs text-ciruela/70">
                <input type="checkbox" className="h-4 w-4 accent-ciruela" />
                Solicitar factura (CFDI)
              </label>
            )}
            {checkoutError && (
              <p className="mt-4 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
                {checkoutError}
              </p>
            )}
            <button
              onClick={chargeSale}
              disabled={total === 0 || isPending}
              className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending ? "Cobrando…" : session ? "Cobrar y reagendar" : "Cobrar"}
            </button>
          </Card>
        </div>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={closePicker}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-sm flex-col rounded-2xl bg-hueso shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-ciruela/10 px-5 py-4">
              <p className="font-display text-sm text-ciruela">Agregar producto</p>
              <button
                onClick={closePicker}
                aria-label="Cerrar"
                className="text-ciruela/50 hover:text-ciruela"
              >
                ×
              </button>
            </div>
            <div className="px-5 pt-3">
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full rounded-full border border-ciruela/20 px-4 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:border-ciruela focus:outline-none"
              />
            </div>
            <ul className="mt-2 flex-1 divide-y divide-ciruela/8 overflow-y-auto px-5 pb-4">
              {filteredCatalog.length === 0 && (
                <li className="py-6 text-center font-body text-sm text-ciruela/40">
                  Sin resultados.
                </li>
              )}
              {filteredCatalog.map((item) => {
                const outOfStock = item.qty <= 0;
                const added = addedItems.find((a) => a.sku === item.sku);
                return (
                  <li key={item.sku} className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-body text-sm text-ciruela">{item.product}</p>
                      <p className="font-body text-xs text-ciruela/50">
                        {outOfStock ? "Sin existencia" : `${item.qty} en stock`} · ${item.price} MXN
                      </p>
                    </div>
                    {added ? (
                      <div className="flex items-center gap-2 rounded-full bg-oliva/10 px-2 py-1">
                        <button
                          onClick={() => setAddedQty(item.sku, added.qty - 1, item.qty)}
                          aria-label={`Quitar una unidad de ${item.product}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-sm text-oliva hover:bg-oliva/20"
                        >
                          −
                        </button>
                        <span className="w-4 text-center font-body text-xs text-oliva">{added.qty}</span>
                        <button
                          disabled={added.qty >= item.qty}
                          onClick={() => setAddedQty(item.sku, added.qty + 1, item.qty)}
                          aria-label={`Agregar una unidad de ${item.product}`}
                          className="flex h-5 w-5 items-center justify-center rounded-full text-sm text-oliva hover:bg-oliva/20 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled={outOfStock}
                        onClick={() => requestAddToSale({ sku: item.sku, product: item.product, price: item.price })}
                        className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ciruela"
                      >
                        Agregar
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {pendingRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setPendingRemove(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">¿Estás seguro que quieres quitarlo?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              {pendingRemove.name} · recomendado por {pendingRemove.recommendedBy}
            </p>
            <p className="mt-2 font-body text-xs text-ciruela/50">
              Se notificará en el panel de administración.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingRemove(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemoveRecommended}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso"
              >
                Quitar
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingReAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setPendingReAdd(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">¿Agregar de nuevo?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              {pendingReAdd.product} se quitó antes de la recomendación de{" "}
              {removedRecommendations.find((r) => r.name === pendingReAdd.product)?.recommendedBy}.
              Si lo agregas ahora, la comisión NO se atribuye automáticamente a esa persona.
            </p>
            <p className="mt-2 font-body text-xs text-ciruela/50">
              Se notificará en el panel de administración.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingReAdd(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={confirmReAdd}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso"
              >
                Agregar de todos modos
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
