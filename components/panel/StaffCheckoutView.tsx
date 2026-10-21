"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { CFDI_ENABLED } from "@/lib/feature-flags";
import {
  cancelOnlineChargeAction,
  checkOnlineChargeAction,
  createSaleAction,
  startOnlineChargeAction,
  type CreateSaleInput,
  type DiscountInput,
} from "@/lib/actions/commerce";
import { CheckoutDiscount } from "@/components/panel/CheckoutDiscount";
import { CheckoutDiscountCode, type AppliedDiscountCode } from "@/components/panel/CheckoutDiscountCode";

export interface CheckoutRetailItem {
  sku: string;
  name: string;
  price: number;
  recommendedBy: string;
}

export interface CheckoutSession {
  appointmentId: string;
  clientId: string;
  locationName: string;
  clientName: string;
  service: { name: string; price: number };
  addOns: { name: string; price: number }[]; // picked when booking, charged with the facial
  retailItems: CheckoutRetailItem[];
  depositCredit: number;
  clientDiscounts?: { code: string; name: string; summary: string }[]; // in her account, ready to apply
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
  discountThresholdPct,
  canApproveDiscounts,
}: {
  session: CheckoutSession | null;
  catalog: CheckoutCatalogItem[];
  locationName: string;
  discountThresholdPct: number; // Front Desk can discount up to this % without approval
  canApproveDiscounts: boolean; // Owner / Clinic Manager: any discount, directly
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isRetailOnly = !session;

  // The esthetician's recommendations: shown as suggestions above the ticket
  // and only counted once Front Desk adds them (they are sold like any other
  // product; the commission still goes to whoever tagged it, which the server
  // derives from the tag itself).
  const suggestions: CheckoutRetailItem[] = session?.retailItems ?? [];
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [discount, setDiscount] = useState<DiscountInput | null>(null);
  // A discount code (scanned or typed): worked out on the server for this ticket.
  const [codeDiscount, setCodeDiscount] = useState<AppliedDiscountCode | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [charged, setCharged] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "ONLINE">("CASH");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  // "En línea (Stripe)": a Checkout link shown as a QR the client pays from
  // their own phone. saleInput is a snapshot of the ticket at the moment the
  // link was created, so the sale recorded after payment matches what was
  // charged even if the cart is touched in the meantime.
  const [onlineCharge, setOnlineCharge] = useState<{
    paymentId: string;
    payUrl: string;
    qrDataUrl: string;
    totalMxn: number;
    saleInput: CreateSaleInput;
  } | null>(null);
  const [onlineRecordError, setOnlineRecordError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const addToSale = (item: { sku: string; product: string; price: number }) => {
    setAddedItems((prev) => (prev.some((a) => a.sku === item.sku) ? prev : [...prev, { ...item, qty: 1 }]));
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

  const servicePrice = session?.service.price ?? 0;
  const addOnsTotal = (session?.addOns ?? []).reduce((sum, a) => sum + a.price, 0);
  const depositCredit = session?.depositCredit ?? 0;
  const retailTotal = addedItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const subtotal = servicePrice + addOnsTotal + retailTotal;
  const discountMxn = codeDiscount
    ? Math.min(codeDiscount.discountMxn, subtotal)
    : discount
    ? Math.min(
        subtotal,
        discount.kind === "PERCENT" ? Math.round((subtotal * discount.value) / 100) : Math.round(discount.value),
      )
    : 0;
  const total = Math.max(0, subtotal - discountMxn + depositCredit);

  const [chargedSummary, setChargedSummary] = useState<{
    clientName: string | null;
    total: number;
  } | null>(null);

  function chargeSale() {
    setCheckoutError(null);
    const retailItems = addedItems.map((a) => ({ sku: a.sku, qty: a.qty }));
    const base = {
      appointmentId: session?.appointmentId ?? null,
      locationName: session?.locationName ?? locationName,
      retailItems,
      discount,
      discountCode: codeDiscount?.code ?? null,
      reAddedAfterRemovalSkus: [],
    };
    startTransition(async () => {
      if (paymentMethod === "ONLINE") {
        const started = await startOnlineChargeAction(base);
        if ("error" in started) {
          setCheckoutError(started.error);
          return;
        }
        setOnlineRecordError(null);
        setOnlineCharge({
          ...started,
          saleInput: { ...base, paymentMethod: "ONLINE", stripePaymentId: started.paymentId },
        });
        return;
      }
      const result = await createSaleAction({ ...base, paymentMethod });
      if ("error" in result) {
        setCheckoutError(result.error);
        return;
      }
      setChargedSummary({ clientName: session?.clientName ?? null, total: result.totalMxn });
      setCharged(true);
      router.refresh();
    });
  }

  // Polls Stripe every 3s while a payment link is open. Once the payment is
  // paid, the sale is recorded (createSaleAction re-verifies the payment and
  // amount server-side). If recording fails after the client already paid, the
  // panel stays up with the Stripe reference so it can be reconciled.
  const activePaymentId = onlineCharge?.paymentId;
  useEffect(() => {
    if (!onlineCharge) return;
    const { paymentId, saleInput } = onlineCharge;
    let stopped = false;
    let busy = false;

    async function tick() {
      if (stopped || busy) return;
      busy = true;
      try {
        const status = await checkOnlineChargeAction(paymentId);
        if (stopped || "error" in status) return;
        if (status.expired) {
          stopped = true;
          setOnlineCharge(null);
          setCheckoutError("El link de pago venció. Genera uno nuevo para cobrar.");
          return;
        }
        if (!status.paid) return;
        stopped = true;
        const result = await createSaleAction(saleInput);
        if ("error" in result) {
          setOnlineRecordError(result.error);
          return;
        }
        setChargedSummary({ clientName: session?.clientName ?? null, total: result.totalMxn });
        setOnlineCharge(null);
        setCharged(true);
        router.refresh();
      } finally {
        busy = false;
      }
    }

    tick();
    const id = setInterval(tick, 3000);
    return () => {
      stopped = true;
      clearInterval(id);
    };
    // Keyed on the payment id (and the manual retry) on purpose: the snapshot
    // inside onlineCharge never changes for a given payment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePaymentId, retryNonce]);

  function cancelOnlineCharge() {
    if (!onlineCharge) return;
    const { paymentId } = onlineCharge;
    setOnlineCharge(null);
    setOnlineRecordError(null);
    cancelOnlineChargeAction(paymentId);
  }

  async function copyPaymentLink() {
    if (!onlineCharge) return;
    try {
      await navigator.clipboard.writeText(onlineCharge.payUrl);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
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
        <TopBar title="Cobro / POS" />
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
      <TopBar title="Cobro / POS" />
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
          {session && (
            <div className="mb-4">
              <Card title="Recomendaciones de la esteticista">
                {suggestions.length === 0 ? (
                  <p className="font-body text-xs text-ciruela/40">
                    La esteticista no dejó recomendaciones para esta visita.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y divide-ciruela/8 font-body text-sm text-ciruela">
                      {suggestions.map((item) => {
                        const added = addedItems.some((a) => a.sku === item.sku);
                        const stock = catalog.find((c) => c.sku === item.sku)?.qty ?? 0;
                        return (
                          <li key={item.sku} className="flex items-center justify-between gap-3 py-2">
                            <div>
                              <p>{item.name}</p>
                              <p className="text-xs text-ciruela/50">Recomendado por {item.recommendedBy}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span>${item.price} MXN</span>
                              {added ? (
                                <span className="font-body text-xs text-oliva">Agregado</span>
                              ) : stock <= 0 ? (
                                <span className="font-body text-xs text-ciruela/40">Sin existencia</span>
                              ) : (
                                <button
                                  onClick={() => addToSale({ sku: item.sku, product: item.name, price: item.price })}
                                  className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                                >
                                  Agregar
                                </button>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 font-body text-[11px] text-ciruela/40">
                      Son sugerencias: no se suman al total hasta que las agregues.
                    </p>
                  </>
                )}
              </Card>
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
              {session?.addOns.map((a) => (
                <li key={a.name} className="flex justify-between py-2">
                  <span>
                    {a.name} <span className="text-xs text-ciruela/50">· add-on</span>
                  </span>
                  <span>{a.price > 0 ? `$${a.price} MXN` : "Incluido"}</span>
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
                  <span>Depósito pagado (se descuenta)</span>
                  <span>-${Math.abs(depositCredit)} MXN</span>
                </li>
              )}
              {session && depositCredit === 0 && (
                <li className="py-2 text-xs text-ciruela/40">Sin depósito previo.</li>
              )}
              {!session && addedItems.length === 0 && (
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

            {subtotal > 0 && !discount && (
              <CheckoutDiscountCode
                applied={codeDiscount}
                onChange={setCodeDiscount}
                appointmentId={session?.appointmentId ?? null}
                locationName={session?.locationName ?? locationName}
                retailItems={addedItems.map((a) => ({ sku: a.sku, qty: a.qty }))}
                clientDiscounts={session?.clientDiscounts ?? []}
              />
            )}
            {subtotal > 0 && !codeDiscount && (
              <CheckoutDiscount
                subtotal={subtotal}
                thresholdPct={discountThresholdPct}
                canApprove={canApproveDiscounts}
                clientId={session?.clientId ?? null}
                value={discount}
                onChange={setDiscount}
              />
            )}
            {discountMxn > 0 && (
              <div className="mt-3 flex justify-between font-body text-sm text-oliva">
                <span>Descuento</span>
                <span>-${discountMxn} MXN</span>
              </div>
            )}

            <div className="mt-3 flex justify-between border-t border-ciruela/15 pt-3 font-body text-base font-medium text-ciruela">
              <span>Total</span>
              <span>${total} MXN</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {([
                ["CASH", "Efectivo"],
                ["CARD", "Tarjeta (terminal BBVA)"],
                ["ONLINE", "En línea (Stripe)"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setPaymentMethod(value)}
                  disabled={!!onlineCharge}
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
              disabled={total === 0 || isPending || !!onlineCharge}
              className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isPending
                ? paymentMethod === "ONLINE"
                  ? "Generando link…"
                  : "Cobrando…"
                : paymentMethod === "ONLINE"
                  ? "Generar cobro con Stripe"
                  : session
                    ? "Cobrar y reagendar"
                    : "Cobrar"}
            </button>
          </Card>
        </div>
      </div>

      {/* Stripe payment: full screen on phones, centered dialog from sm up.
          No backdrop-dismiss — closing mid-payment goes through "Cancelar cobro". */}
      {onlineCharge && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-hueso sm:items-center sm:bg-ciruela/40 sm:px-4">
          <div className="flex w-full flex-col items-center justify-center overflow-y-auto bg-hueso px-6 py-8 text-center sm:max-h-[92vh] sm:max-w-md sm:rounded-2xl sm:py-6 sm:shadow-xl">
            <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Cobro con Stripe</p>
            <p className="mt-2 font-display text-3xl text-ciruela">${onlineCharge.totalMxn} MXN</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              Pídele a la clienta que escanee el código con su celular y pague con tarjeta, Apple Pay o Google Pay.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={onlineCharge.qrDataUrl}
              alt="Código QR para pagar con tarjeta, Apple Pay o Google Pay"
              width={320}
              height={320}
              className="mt-5 aspect-square w-full max-w-[300px]"
            />
            {onlineRecordError ? (
              <div className="mt-5 w-full max-w-[300px] rounded-lg bg-[#b3392f]/10 px-3 py-2 text-left font-body text-xs text-[#b3392f]">
                <p>El pago se recibió, pero la venta no se pudo registrar: {onlineRecordError}</p>
                <p className="mt-1 break-all">Referencia de Stripe: {onlineCharge.paymentId}</p>
                <button
                  onClick={() => {
                    setOnlineRecordError(null);
                    setRetryNonce((n) => n + 1);
                  }}
                  className="mt-2 rounded-full border border-[#b3392f] px-3 py-1 text-[#b3392f]"
                >
                  Reintentar registro
                </button>
              </div>
            ) : (
              <p className="mt-5 font-body text-sm text-ciruela/60">Esperando el pago…</p>
            )}
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button
                onClick={copyPaymentLink}
                className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
              >
                {linkCopied ? "Link copiado" : "Copiar link de pago"}
              </button>
              {!onlineRecordError && (
                <button
                  onClick={cancelOnlineCharge}
                  className="rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
                >
                  Cancelar cobro
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                        onClick={() => addToSale({ sku: item.sku, product: item.product, price: item.price })}
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
    </>
  );
}
