"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { finishContainerAction, openContainerAction } from "@/lib/actions/containers";

export interface OpenProductOption {
  id: string;
  name: string;
  sealed: number; // sealed containers in stock
  contentMl: number | null;
  paoDays: number | null;
  scope: "COMMUNAL" | "INDIVIDUAL";
}

export interface OpenContainerRow {
  id: string;
  productName: string;
  scope: "COMMUNAL" | "INDIVIDUAL";
  where: string; // the cabina, or the esthetician it belongs to
  mine: boolean;
  remainingMl: number;
  contentMl: number;
  expiresOn: string; // ISO
  expired: boolean;
}

const inputClass =
  "w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

// "Abrir producto": the esthetician registers that she opened a container, so
// the ml used in treatments come out of it. A shared product is opened per
// cabina, an individual one for her own use. The date it must be thrown away
// by is worked out from the product's duration after opening and the lot's
// expiry.
export function StaffOpenProductView({
  products,
  rooms,
  open,
}: {
  products: OpenProductOption[];
  rooms: { id: string; name: string }[];
  open: OpenContainerRow[];
}) {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const product = products.find((p) => p.id === productId) ?? null;

  async function openOne() {
    if (!product) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await openContainerAction({ inventoryItemId: product.id, roomId: roomId || null });
      if ("error" in result) {
        setMessage({ ok: false, text: result.error });
      } else {
        setMessage({ ok: true, text: `Envase abierto. Debe tirarse a más tardar el ${formatDate(result.expiresOn)}.` });
        router.refresh();
      }
    } catch {
      setMessage({ ok: false, text: "No se pudo abrir el envase. Intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  }

  async function finish(id: string) {
    const result = await finishContainerAction(id);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Envase marcado como terminado." });
    router.refresh();
  }

  return (
    <>
      <TopBar title="Abrir producto" />
      <div className="flex-1 px-4 py-6 min-[860px]:px-8">
        <div className="mx-auto max-w-xl space-y-4">
          <Card title="Abrir un envase">
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  Producto
                </label>
                <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputClass}>
                  <option value="">Selecciona un producto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.sealed} sellados
                    </option>
                  ))}
                </select>
              </div>
              {product && (
                <p className="font-body text-xs text-ciruela/50">
                  {product.contentMl ? `${product.contentMl} ml por envase` : "Faltan los ml por envase"} ·{" "}
                  {product.paoDays ? `dura ${product.paoDays} días abierto` : "falta la duración tras abrir"} ·{" "}
                  {product.scope === "COMMUNAL" ? "compartido por cabina" : "individual (a tu nombre)"}
                </p>
              )}
              {product?.scope === "COMMUNAL" && (
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Cabina
                  </label>
                  <select value={roomId} onChange={(e) => setRoomId(e.target.value)} className={inputClass}>
                    <option value="">Selecciona la cabina</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {message && (
                <p className={`font-body text-xs ${message.ok ? "text-oliva" : "text-[#b3392f]"}`}>{message.text}</p>
              )}
              <button
                onClick={openOne}
                disabled={!product || busy}
                className="w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Abriendo…" : "Abrir envase"}
              </button>
            </div>
          </Card>

          <Card title={`Envases abiertos (${open.length})`}>
            {open.length === 0 ? (
              <p className="py-3 text-center font-body text-sm text-ciruela/50">No hay envases abiertos.</p>
            ) : (
              <ul className="divide-y divide-ciruela/8">
                {open.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                    <div>
                      <p className="font-body text-sm text-ciruela">
                        {c.productName} <span className="text-ciruela/50">· {c.where}</span>
                      </p>
                      <p className="font-body text-xs text-ciruela/50">
                        {c.remainingMl} de {c.contentMl} ml · tirar antes del {formatDate(c.expiresOn)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.expired && <Badge tone="warning">Vencido</Badge>}
                      <button
                        onClick={() => finish(c.id)}
                        className="rounded-full border border-ciruela px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                      >
                        Terminar
                      </button>
                    </div>
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
