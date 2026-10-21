"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import {
  createDiscountCodeAction,
  deleteDiscountCodeAction,
  getDiscountQrAction,
  setDiscountCodeActiveAction,
} from "@/lib/actions/discount-codes";
import type { DiscountCodeKind, DiscountScope } from "@/lib/discount-codes";

export interface DiscountCodeRow {
  id: string;
  code: string;
  name: string;
  summary: string;
  validFrom: string | null;
  validUntil: string | null;
  maxUses: number | null;
  onePerClient: boolean;
  isActive: boolean;
  uses: number;
  givenMxn: number;
}

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40";
const labelClass = "mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50";

const KIND_LABEL: Record<DiscountCodeKind, string> = {
  PERCENT: "Porcentaje (%)",
  AMOUNT: "Monto fijo (MXN)",
  FREE_ADD_ON: "Add-on de cortesía",
  FREE_PRODUCT: "Producto de cortesía",
};
const SCOPE_LABEL: Record<DiscountScope, string> = {
  ALL: "Todo el ticket",
  SERVICES: "Solo servicios",
  PRODUCTS: "Solo productos",
};

const TZ = "America/Mexico_City";
const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });

function validityLabel(row: DiscountCodeRow) {
  if (row.validFrom && row.validUntil) return `${formatDate(row.validFrom)} – ${formatDate(row.validUntil)}`;
  if (row.validUntil) return `hasta ${formatDate(row.validUntil)}`;
  if (row.validFrom) return `desde ${formatDate(row.validFrom)}`;
  return "Sin fecha límite";
}

// Descuentos: create discount codes, each with a QR to download or print. The
// client shows the QR at the front desk; the vendedor scans it in Cobro / POS.
export function AdminDiscountsView({
  codes,
  addOns,
  products,
}: {
  codes: DiscountCodeRow[];
  addOns: { id: string; name: string }[];
  products: { sku: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [kind, setKind] = useState<DiscountCodeKind>("PERCENT");
  const [value, setValue] = useState("");
  const [scope, setScope] = useState<DiscountScope>("ALL");
  const [addOnId, setAddOnId] = useState("");
  const [productSku, setProductSku] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [onePerClient, setOnePerClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [qr, setQr] = useState<{ dataUrl: string; link: string; code: string; name: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isFree = kind === "FREE_ADD_ON" || kind === "FREE_PRODUCT";

  function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createDiscountCodeAction({
        code,
        name,
        kind,
        value: Number(value) || 0,
        scope,
        addOnId: kind === "FREE_ADD_ON" ? addOnId || null : null,
        productSku: kind === "FREE_PRODUCT" ? productSku || null : null,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        maxUses: maxUses.trim() ? Number(maxUses) : null,
        onePerClient,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setName("");
      setCode("");
      setValue("");
      setAddOnId("");
      setProductSku("");
      setValidFrom("");
      setValidUntil("");
      setMaxUses("");
      setOnePerClient(false);
      router.refresh();
    });
  }

  function showQr(row: DiscountCodeRow) {
    setRowError(null);
    startTransition(async () => {
      const result = await getDiscountQrAction(row.id);
      if ("error" in result) {
        setRowError(result.error);
        return;
      }
      setCopied(false);
      setQr({ dataUrl: result.dataUrl, link: result.link, code: result.code, name: row.name });
    });
  }

  function downloadQr() {
    if (!qr) return;
    const a = document.createElement("a");
    a.href = qr.dataUrl;
    a.download = `descuento-${qr.code}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function printQr() {
    if (!qr) return;
    const w = window.open("", "_blank", "width=520,height=720");
    if (!w) return;
    w.document.write(
      `<!doctype html><html><head><title>${qr.code}</title><style>
        body{font-family:Georgia,serif;text-align:center;margin:0;padding:40px;color:#3f0215}
        h1{letter-spacing:.3em;font-weight:normal;margin:0 0 4px}
        p{margin:6px 0} img{width:360px;height:360px;margin:20px 0}
        .code{font-size:26px;letter-spacing:.2em}
      </style></head><body><h1>MONÂM</h1><p>Skin Studio</p><img src="${qr.dataUrl}" alt="QR"/>
      <p>${qr.name.replace(/[<>&]/g, "")}</p><p class="code">${qr.code}</p><p>Muestra este código en recepción al pagar.</p>
      <script>window.onload=()=>window.print()<\/script></body></html>`,
    );
    w.document.close();
  }

  async function copyLink() {
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function toggle(row: DiscountCodeRow) {
    startTransition(async () => {
      await setDiscountCodeActiveAction(row.id, !row.isActive);
      router.refresh();
    });
  }

  function remove(id: string) {
    setRowError(null);
    startTransition(async () => {
      const result = await deleteDiscountCodeAction(id);
      if ("error" in result) {
        setRowError(result.error);
        return;
      }
      setConfirmDeleteId(null);
      router.refresh();
    });
  }

  return (
    <>
      <TopBar title="Descuentos" />
      <div className="flex-1 space-y-6 px-4 py-6 min-[860px]:px-8">
        <Card title="Nuevo descuento">
          <form onSubmit={create} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
              <div>
                <label className={labelClass}>Nombre</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="p. ej. Bienvenida 15%"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Código (opcional)</label>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Se genera solo si lo dejas vacío"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Tipo</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as DiscountCodeKind)} className={inputClass}>
                  {(Object.keys(KIND_LABEL) as DiscountCodeKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABEL[k]}
                    </option>
                  ))}
                </select>
              </div>
              {!isFree && (
                <div>
                  <label className={labelClass}>{kind === "PERCENT" ? "Porcentaje" : "Monto (MXN)"}</label>
                  <input
                    required
                    type="number"
                    min={1}
                    max={kind === "PERCENT" ? 100 : undefined}
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className={inputClass}
                  />
                </div>
              )}
              {!isFree && (
                <div>
                  <label className={labelClass}>Aplica a</label>
                  <select value={scope} onChange={(e) => setScope(e.target.value as DiscountScope)} className={inputClass}>
                    {(Object.keys(SCOPE_LABEL) as DiscountScope[]).map((s) => (
                      <option key={s} value={s}>
                        {SCOPE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {kind === "FREE_ADD_ON" && (
                <div>
                  <label className={labelClass}>Add-on de cortesía</label>
                  <select required value={addOnId} onChange={(e) => setAddOnId(e.target.value)} className={inputClass}>
                    <option value="">Selecciona un add-on</option>
                    {addOns.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {kind === "FREE_PRODUCT" && (
                <div>
                  <label className={labelClass}>Producto de cortesía</label>
                  <select required value={productSku} onChange={(e) => setProductSku(e.target.value)} className={inputClass}>
                    <option value="">Selecciona un producto</option>
                    {products.map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className={labelClass}>Válido desde (opcional)</label>
                <input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Válido hasta (opcional)</label>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Máximo de usos (opcional)</label>
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="Sin límite"
                  className={inputClass}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2 font-body text-sm text-ciruela">
                <input
                  type="checkbox"
                  checked={onePerClient}
                  onChange={(e) => setOnePerClient(e.target.checked)}
                  className="h-4 w-4 accent-[#4a1f3d]"
                />
                Un solo uso por clienta
              </label>
            </div>
            {error && <p className="font-body text-xs text-[#b3392f]">{error}</p>}
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50"
            >
              {isPending ? "Creando…" : "Crear descuento y QR"}
            </button>
            <p className="font-body text-xs text-ciruela/50">
              Un código válido ya viene aprobado por ti: la vendedora lo aplica al cobrar sin pedir aprobación, aunque
              pase del límite de descuentos manuales.
            </p>
          </form>
        </Card>

        <Card title={`Descuentos (${codes.length})`}>
          {rowError && <p className="mb-3 font-body text-xs text-[#b3392f]">{rowError}</p>}
          {codes.length === 0 ? (
            <p className="py-4 text-center font-body text-sm text-ciruela/50">
              Todavía no hay descuentos. Crea el primero arriba.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] whitespace-nowrap font-body text-sm text-ciruela">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                    <th className="pb-2">Descuento</th>
                    <th className="pb-2">Código</th>
                    <th className="pb-2">Vigencia</th>
                    <th className="pb-2 text-right">Usos</th>
                    <th className="pb-2 pl-4">Estado</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id} className="border-t border-ciruela/8">
                      <td className="py-3">
                        {c.name}
                        <span className="block text-xs text-ciruela/50">
                          {c.summary}
                          {c.onePerClient ? " · 1 uso por clienta" : ""}
                        </span>
                      </td>
                      <td className="py-3 font-medium tracking-wide">{c.code}</td>
                      <td className="py-3 text-ciruela/60">{validityLabel(c)}</td>
                      <td className="py-3 text-right">
                        {c.uses}
                        {c.maxUses !== null ? ` / ${c.maxUses}` : ""}
                        {c.givenMxn > 0 && <span className="block text-xs text-ciruela/50">−${c.givenMxn.toLocaleString("es-MX")} MXN</span>}
                      </td>
                      <td className="py-3 pl-4">
                        <Badge tone={c.isActive ? "positive" : "neutral"}>{c.isActive ? "Activo" : "Inactivo"}</Badge>
                      </td>
                      <td className="py-3 text-right">
                        {confirmDeleteId === c.id ? (
                          <span className="flex items-center justify-end gap-3 text-[11px] text-[#b3392f]">
                            ¿Eliminar?
                            <button onClick={() => remove(c.id)} disabled={isPending} className="underline">
                              Sí
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)} className="text-ciruela underline">
                              No
                            </button>
                          </span>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button onClick={() => showQr(c)} disabled={isPending} className="text-[11px] text-ciruela underline">
                              Ver QR
                            </button>
                            <button onClick={() => toggle(c)} disabled={isPending} className="text-[11px] text-ciruela underline">
                              {c.isActive ? "Desactivar" : "Activar"}
                            </button>
                            <button
                              onClick={() => {
                                setRowError(null);
                                setConfirmDeleteId(c.id);
                              }}
                              className="text-[11px] text-[#b3392f] underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {qr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4" onClick={() => setQr(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-5 text-center shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">{qr.name}</p>
              <button onClick={() => setQr(null)} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
                ×
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.dataUrl} alt={`QR del código ${qr.code}`} className="mx-auto h-64 w-64 rounded-lg bg-white" />
            <p className="mt-3 font-display text-lg tracking-[0.15em] text-ciruela">{qr.code}</p>
            <p className="mt-1 break-all font-body text-[11px] text-ciruela/50">{qr.link}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button onClick={downloadQr} className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso">
                Descargar PNG
              </button>
              <button onClick={printQr} className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela">
                Imprimir
              </button>
              <button onClick={copyLink} className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela">
                {copied ? "Copiado" : "Copiar enlace"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
