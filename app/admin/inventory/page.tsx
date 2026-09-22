"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { downloadCsv } from "@/lib/csv";
import { useLocations } from "@/components/panel/LocationsContext";
import {
  OWNER,
  RETAIL_INVENTORY,
  BACKBAR_INVENTORY,
  type RetailInventoryItem,
  type BackbarInventoryItem,
} from "@/lib/mock-data";

// One screen for both ledgers — easier to actually use day to day — but the
// underlying data stays logically separate (spec §5.3: "never merge into
// one stock line", i.e. never sum a product's retail and backbar quantities
// together; each row still belongs to exactly one ledger). This matches the
// planned data model too: Product.ledger is a discriminator column on one
// table, not two unrelated tables.
//
// Edits are local component state, not persisted — a real save would be a
// Server Action writing an InventoryTransaction row (implementation plan
// Phase 5), which is backend work outside this UI-first pass.
type Tab = "todos" | "retail" | "backbar";

function DownloadButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-ciruela/20 px-3 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela/5"
    >
      <span aria-hidden="true">⬇</span> Descargar Excel
    </button>
  );
}

type LedgerChoice = "Retail" | "Backbar" | "Ambos";

const emptyNewProduct = {
  name: "",
  location: "",
  ledger: "Retail" as LedgerChoice,
  retailSku: "",
  retailQty: "",
  retailPar: "",
  retailPrice: "",
  retailCost: "",
  retailExpires: "",
  backbarSku: "",
  backbarQty: "",
  backbarPar: "",
  backbarOpens: "",
  backbarPao: "",
};

export default function AdminInventory() {
  const { selectedNames, locations } = useLocations();
  const [tab, setTab] = useState<Tab>("todos");
  const [retailAll, setRetail] = useState<RetailInventoryItem[]>(RETAIL_INVENTORY);
  const [backbarAll, setBackbar] = useState<BackbarInventoryItem[]>(BACKBAR_INVENTORY);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [editingLedger, setEditingLedger] = useState<"Retail" | "Backbar" | null>(null);
  const [draft, setDraft] = useState<{
    qty: string;
    par: string;
    price: string;
    ledger: "Retail" | "Backbar";
  }>({
    qty: "",
    par: "",
    price: "",
    ledger: "Retail",
  });
  const [restockOnly, setRestockOnly] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    ...emptyNewProduct,
    location: locations[0]?.name ?? "",
  });

  // Filtered by whatever location(s) the switcher in the top bar has
  // selected — edits still write to the full unfiltered arrays above.
  const retailByLocation = retailAll.filter((i) => selectedNames.includes(i.location));
  const backbarByLocation = backbarAll.filter((i) => selectedNames.includes(i.location));

  // Then optionally narrowed to just what needs restocking, for the tables.
  const retail = retailByLocation.filter((i) => !restockOnly || i.qty < i.par);
  const backbar = backbarByLocation.filter((i) => !restockOnly || i.qty < i.par);

  const retailLow = retailByLocation.filter((i) => i.qty < i.par).length;
  const backbarLow = backbarByLocation.filter((i) => i.qty < i.par).length;
  const retailValue = retailByLocation.reduce((sum, i) => sum + i.qty * i.price, 0);
  const locationLabel =
    selectedNames.length > 1 ? selectedNames.join(" + ") : selectedNames[0];

  function startEdit(
    item: { sku: string; qty: number; par: number; price?: number },
    ledger: "Retail" | "Backbar",
  ) {
    setEditingSku(item.sku);
    setEditingLedger(ledger);
    setDraft({
      qty: String(item.qty),
      par: String(item.par),
      price: item.price != null ? String(item.price) : "",
      ledger,
    });
  }

  function cancelEdit() {
    setEditingSku(null);
    setEditingLedger(null);
  }

  function saveRetail(sku: string) {
    setRetail((prev) =>
      prev.map((i) =>
        i.sku === sku
          ? { ...i, qty: Number(draft.qty) || 0, par: Number(draft.par) || 0, price: Number(draft.price) || 0 }
          : i,
      ),
    );
    setEditingSku(null);
    setEditingLedger(null);
  }

  function saveBackbar(sku: string) {
    setBackbar((prev) =>
      prev.map((i) =>
        i.sku === sku ? { ...i, qty: Number(draft.qty) || 0, par: Number(draft.par) || 0 } : i,
      ),
    );
    setEditingSku(null);
    setEditingLedger(null);
  }

  // Moving a product between ledgers removes it from one array and adds it
  // to the other with sensible defaults for the fields that ledger has and
  // the source didn't (spec §5.3 — still never merged into one stock line,
  // this just lets a mis-categorized product be corrected).
  function moveLedger(sku: string, from: "Retail" | "Backbar") {
    if (from === "Retail") {
      const item = retailAll.find((i) => i.sku === sku);
      if (!item) return;
      setRetail((prev) => prev.filter((i) => i.sku !== sku));
      setBackbar((prev) => [
        ...prev,
        {
          sku: item.sku,
          product: item.product,
          location: item.location,
          qty: Number(draft.qty) || 0,
          par: Number(draft.par) || 0,
          opensOn: "—",
          pao: "—",
        },
      ]);
    } else {
      const item = backbarAll.find((i) => i.sku === sku);
      if (!item) return;
      setBackbar((prev) => prev.filter((i) => i.sku !== sku));
      setRetail((prev) => [
        ...prev,
        {
          sku: item.sku,
          product: item.product,
          location: item.location,
          qty: Number(draft.qty) || 0,
          par: Number(draft.par) || 0,
          price: Number(draft.price) || 0,
          cost: 0,
          expiresOn: "—",
        },
      ]);
    }
    setEditingSku(null);
    setEditingLedger(null);
  }

  // Dispatches to the right ledger's save — used by the combined "Todos"
  // table, which edits both ledgers from one place. If the ledger itself
  // changed, that's a move, not an in-place update.
  function saveEdit(sku: string) {
    if (draft.ledger !== editingLedger) {
      if (editingLedger) moveLedger(sku, editingLedger);
      return;
    }
    if (editingLedger === "Retail") saveRetail(sku);
    else if (editingLedger === "Backbar") saveBackbar(sku);
  }

  // A brand can supply both retail and backbar versions of a product, but
  // per spec §5.3 they're never one stock line — "Ambos" writes two
  // independent entries (different SKUs, qty, par, cost), one per ledger.
  function submitNewProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.location) return;

    const wantsRetail = newProduct.ledger === "Retail" || newProduct.ledger === "Ambos";
    const wantsBackbar = newProduct.ledger === "Backbar" || newProduct.ledger === "Ambos";

    if (wantsRetail) {
      setRetail((prev) => [
        ...prev,
        {
          sku: newProduct.retailSku.trim() || `SKU-${Date.now()}`,
          product: newProduct.name.trim(),
          location: newProduct.location,
          qty: Number(newProduct.retailQty) || 0,
          par: Number(newProduct.retailPar) || 0,
          price: Number(newProduct.retailPrice) || 0,
          cost: Number(newProduct.retailCost) || 0,
          expiresOn: newProduct.retailExpires || "—",
        },
      ]);
    }

    if (wantsBackbar) {
      setBackbar((prev) => [
        ...prev,
        {
          sku: newProduct.backbarSku.trim() || `SKU-${Date.now()}-B`,
          product: newProduct.name.trim(),
          location: newProduct.location,
          qty: Number(newProduct.backbarQty) || 0,
          par: Number(newProduct.backbarPar) || 0,
          opensOn: newProduct.backbarOpens || "—",
          pao: newProduct.backbarPao || "—",
        },
      ]);
    }

    setNewProduct({ ...emptyNewProduct, location: newProduct.location });
    setAddProductOpen(false);
  }

  function exportTodos() {
    downloadCsv("inventario-monam.csv", [
      ...retail.map((i) => ({
        SKU: i.sku,
        Producto: i.product,
        Ledger: "Retail",
        Ubicacion: i.location,
        Cantidad: i.qty,
        Par: i.par,
      })),
      ...backbar.map((i) => ({
        SKU: i.sku,
        Producto: i.product,
        Ledger: "Backbar",
        Ubicacion: i.location,
        Cantidad: i.qty,
        Par: i.par,
      })),
    ]);
  }

  function exportRetail() {
    downloadCsv(
      "inventario-retail-monam.csv",
      retail.map((i) => ({
        SKU: i.sku,
        Producto: i.product,
        Ubicacion: i.location,
        Cantidad: i.qty,
        Par: i.par,
        Precio: i.price,
        Vence: i.expiresOn,
      })),
    );
  }

  function exportBackbar() {
    downloadCsv(
      "inventario-backbar-monam.csv",
      backbar.map((i) => ({
        SKU: i.sku,
        Producto: i.product,
        Ubicacion: i.location,
        Cantidad: i.qty,
        Par: i.par,
        Abierto: i.opensOn,
        PAO: i.pao,
      })),
    );
  }

  return (
    <>
      <TopBar title="Inventario" userName={OWNER.name} userRole={OWNER.role} allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-4">
          <StatTile label="SKUs — Retail" value={`${retail.length}`} sub={`${retailLow} bajo par`} />
          <StatTile label="SKUs — Backbar" value={`${backbar.length}`} sub={`${backbarLow} bajo par`} />
          <StatTile label="Valor retail en anaquel" value={`$${retailValue.toLocaleString()} MXN`} />
          <StatTile label="Total bajo par" value={`${retailLow + backbarLow}`} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-ciruela/20 p-1 font-body text-xs w-fit">
            {(
              [
                ["todos", "Todos"],
                ["retail", "Retail"],
                ["backbar", "Backbar"],
              ] as [Tab, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                aria-pressed={tab === value}
                className={`rounded-full px-4 py-1.5 ${
                  tab === value ? "bg-ciruela text-hueso" : "text-ciruela/70 hover:bg-ciruela/8"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRestockOnly((v) => !v)}
              aria-pressed={restockOnly}
              className={`rounded-full border px-3 py-1.5 font-body text-xs ${
                restockOnly
                  ? "border-crepe bg-crepe/40 text-ciruela"
                  : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
              }`}
            >
              {restockOnly ? "✓ " : ""}Necesita restock
            </button>
            <DownloadButton
              onClick={tab === "todos" ? exportTodos : tab === "retail" ? exportRetail : exportBackbar}
            />
            <button
              onClick={() => setAddProductOpen((v) => !v)}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
            >
              {addProductOpen ? "Cancelar" : "Agregar producto"}
            </button>
          </div>
        </div>

        {addProductOpen && (
          <Card title="Nuevo producto">
            <form onSubmit={submitNewProduct} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 min-[700px]:grid-cols-2">
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Nombre del producto
                  </label>
                  <input
                    required
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((f) => ({ ...f, name: e.target.value }))}
                    placeholder="p. ej. Anua Heartleaf Toner"
                    className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Ubicación
                  </label>
                  <select
                    value={newProduct.location}
                    onChange={(e) => setNewProduct((f) => ({ ...f, location: e.target.value }))}
                    className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                  >
                    {locations.map((l) => (
                      <option key={l.id} value={l.name}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                  ¿Dónde vive este producto?
                </label>
                <div className="flex gap-1 rounded-full border border-ciruela/20 p-1 font-body text-xs w-fit">
                  {(["Retail", "Backbar", "Ambos"] as LedgerChoice[]).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      onClick={() => setNewProduct((f) => ({ ...f, ledger: choice }))}
                      aria-pressed={newProduct.ledger === choice}
                      className={`rounded-full px-4 py-1.5 ${
                        newProduct.ledger === choice
                          ? "bg-ciruela text-hueso"
                          : "text-ciruela/70 hover:bg-ciruela/8"
                      }`}
                    >
                      {choice === "Backbar" ? "En cabina" : choice}
                    </button>
                  ))}
                </div>
                <p className="mt-1 font-body text-[11px] text-ciruela/40">
                  &quot;Ambos&quot; crea dos líneas de stock independientes — retail y backbar
                  nunca se mezclan en una sola (spec §5.3), aunque sea la misma marca.
                </p>
              </div>

              {(newProduct.ledger === "Retail" || newProduct.ledger === "Ambos") && (
                <div className="rounded-lg border border-pastel/60 bg-pastel/10 p-4">
                  <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                    Línea Retail
                  </p>
                  <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3">
                    <TextInput
                      label="SKU"
                      value={newProduct.retailSku}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailSku: v }))}
                    />
                    <TextInput
                      label="Cantidad"
                      type="number"
                      value={newProduct.retailQty}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailQty: v }))}
                    />
                    <TextInput
                      label="Par"
                      type="number"
                      value={newProduct.retailPar}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailPar: v }))}
                    />
                    <TextInput
                      label="Precio (MXN)"
                      type="number"
                      value={newProduct.retailPrice}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailPrice: v }))}
                    />
                    <TextInput
                      label="Costo (MXN)"
                      type="number"
                      value={newProduct.retailCost}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailCost: v }))}
                    />
                    <TextInput
                      label="Vence"
                      type="date"
                      value={newProduct.retailExpires}
                      onChange={(v) => setNewProduct((f) => ({ ...f, retailExpires: v }))}
                    />
                  </div>
                </div>
              )}

              {(newProduct.ledger === "Backbar" || newProduct.ledger === "Ambos") && (
                <div className="rounded-lg border border-ciruela/15 bg-ciruela/5 p-4">
                  <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                    Línea Backbar
                  </p>
                  <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
                    <TextInput
                      label="SKU"
                      value={newProduct.backbarSku}
                      onChange={(v) => setNewProduct((f) => ({ ...f, backbarSku: v }))}
                    />
                    <TextInput
                      label="Cantidad"
                      type="number"
                      value={newProduct.backbarQty}
                      onChange={(v) => setNewProduct((f) => ({ ...f, backbarQty: v }))}
                    />
                    <TextInput
                      label="Par"
                      type="number"
                      value={newProduct.backbarPar}
                      onChange={(v) => setNewProduct((f) => ({ ...f, backbarPar: v }))}
                    />
                    <TextInput
                      label="PAO"
                      value={newProduct.backbarPao}
                      onChange={(v) => setNewProduct((f) => ({ ...f, backbarPao: v }))}
                      placeholder="p. ej. 6 meses"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
              >
                Agregar producto
              </button>
            </form>
          </Card>
        )}

        {tab === "todos" && (
          <Card title={`${locationLabel} — todos los productos`}>
            {retail.length + backbar.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly
                  ? "Nada necesita restock ahora mismo en esta sucursal."
                  : "Sin productos registrados en esta sucursal todavía."}
              </p>
            ) : (
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2">Ledger</th>
                  <th className="pb-2 pr-6">Ubicación</th>
                  <th className="pb-2 pr-3 text-right">Cant.</th>
                  <th className="pb-2 pr-6 text-right">Par</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {[
                  ...retail.map((i) => ({ ...i, ledger: "Retail" as const })),
                  ...backbar.map((i) => ({ ...i, ledger: "Backbar" as const })),
                ].map((item) => {
                  const low = item.qty < item.par;
                  const isEditing = editingSku === item.sku;
                  return (
                    <tr key={item.sku} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3">
                        {isEditing ? (
                          <select
                            value={draft.ledger}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                ledger: e.target.value as "Retail" | "Backbar",
                              }))
                            }
                            className="rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 font-body text-xs text-ciruela"
                          >
                            <option value="Retail">Retail</option>
                            <option value="Backbar">Backbar</option>
                          </select>
                        ) : (
                          <Badge tone={item.ledger === "Retail" ? "info" : "neutral"}>
                            {item.ledger}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-3 text-right">
                            <NumberInput
                              value={draft.qty}
                              onChange={(v) => setDraft((d) => ({ ...d, qty: v }))}
                            />
                          </td>
                          <td className="py-2 pr-6 text-right">
                            <NumberInput
                              value={draft.par}
                              onChange={(v) => setDraft((d) => ({ ...d, par: v }))}
                            />
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveEdit(item.sku)}
                                className="rounded-full bg-ciruela px-2.5 py-1 font-body text-[11px] text-hueso"
                              >
                                {draft.ledger !== editingLedger ? "Mover" : "Guardar"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded-full border border-ciruela/30 px-2.5 py-1 font-body text-[11px] text-ciruela/70"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-3 text-right">{item.qty}</td>
                          <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {low && <Badge tone="warning">Bajo par</Badge>}
                              <button
                                onClick={() => startEdit(item, item.ledger)}
                                className="font-body text-[11px] text-ciruela underline"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </Card>
        )}

        {tab === "retail" && (
          <Card title={`${locationLabel} — retail`}>
            {retail.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly
                  ? "Nada necesita restock ahora mismo en esta sucursal."
                  : "Sin productos retail registrados en esta sucursal todavía."}
              </p>
            ) : (
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 pr-6">Ubicación</th>
                  <th className="pb-2 pr-3 text-right">Cant.</th>
                  <th className="pb-2 pr-6 text-right">Par</th>
                  <th className="pb-2 pr-6 text-right">Precio</th>
                  <th className="pb-2">Vence</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {retail.map((item) => {
                  const low = item.qty < item.par;
                  const isEditing = editingSku === item.sku;
                  return (
                    <tr key={item.sku} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-3 text-right">
                            <NumberInput
                              value={draft.qty}
                              onChange={(v) => setDraft((d) => ({ ...d, qty: v }))}
                            />
                          </td>
                          <td className="py-2 pr-6 text-right">
                            <NumberInput
                              value={draft.par}
                              onChange={(v) => setDraft((d) => ({ ...d, par: v }))}
                            />
                          </td>
                          <td className="py-2 pr-6 text-right">
                            <NumberInput
                              value={draft.price}
                              onChange={(v) => setDraft((d) => ({ ...d, price: v }))}
                              prefix="$"
                            />
                          </td>
                          <td className="py-3 text-ciruela/50">{item.expiresOn}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveRetail(item.sku)}
                                className="rounded-full bg-ciruela px-2.5 py-1 font-body text-[11px] text-hueso"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded-full border border-ciruela/30 px-2.5 py-1 font-body text-[11px] text-ciruela/70"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-3 text-right">{item.qty}</td>
                          <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                          <td className="py-3 pr-6 text-right">${item.price} MXN</td>
                          <td className="py-3 text-ciruela/50">{item.expiresOn}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {low && <Badge tone="warning">Bajo par</Badge>}
                              <button
                                onClick={() => startEdit(item, "Retail")}
                                className="font-body text-[11px] text-ciruela underline"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
          </Card>
        )}

        {tab === "backbar" && (
          <Card title={`${locationLabel} — backbar`}>
            {backbar.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly
                  ? "Nada necesita restock ahora mismo en esta sucursal."
                  : "Sin productos backbar registrados en esta sucursal todavía."}
              </p>
            ) : (
            <table className="w-full font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <th className="pb-2">SKU</th>
                  <th className="pb-2">Producto</th>
                  <th className="pb-2 pr-6">Ubicación</th>
                  <th className="pb-2 pr-3 text-right">Cant.</th>
                  <th className="pb-2 pr-6 text-right">Par</th>
                  <th className="pb-2 pr-6">Abierto</th>
                  <th className="pb-2">PAO</th>
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {backbar.map((item) => {
                  const low = item.qty < item.par;
                  const isEditing = editingSku === item.sku;
                  return (
                    <tr key={item.sku} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      {isEditing ? (
                        <>
                          <td className="py-2 pr-3 text-right">
                            <NumberInput
                              value={draft.qty}
                              onChange={(v) => setDraft((d) => ({ ...d, qty: v }))}
                            />
                          </td>
                          <td className="py-2 pr-6 text-right">
                            <NumberInput
                              value={draft.par}
                              onChange={(v) => setDraft((d) => ({ ...d, par: v }))}
                            />
                          </td>
                          <td className="py-3 pr-6 text-ciruela/50">{item.opensOn}</td>
                          <td className="py-3 text-ciruela/50">{item.pao}</td>
                          <td className="py-3 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => saveBackbar(item.sku)}
                                className="rounded-full bg-ciruela px-2.5 py-1 font-body text-[11px] text-hueso"
                              >
                                Guardar
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="rounded-full border border-ciruela/30 px-2.5 py-1 font-body text-[11px] text-ciruela/70"
                              >
                                Cancelar
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-3 text-right">{item.qty}</td>
                          <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                          <td className="py-3 pr-6 text-ciruela/50">{item.opensOn}</td>
                          <td className="py-3 text-ciruela/50">{item.pao}</td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {low && <Badge tone="warning">Bajo par</Badge>}
                              <button
                                onClick={() => startEdit(item, "Backbar")}
                                className="font-body text-[11px] text-ciruela underline"
                              >
                                Editar
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
            <p className="mt-4 font-body text-xs text-ciruela/40">
              Las líneas K-beauty (SKIN1004, Anua, Beauty of Joseon, Numbuzin, AXIS-Y, Purito,
              Dr. Althea) son solo-backbar y nunca aparecen en el catálogo retail.
            </p>
          </Card>
        )}
      </div>
    </>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-2 py-1.5 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  prefix,
}: {
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {prefix && <span className="text-ciruela/50">{prefix}</span>}
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 rounded border border-ciruela/25 bg-hueso px-1.5 py-1 text-right font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
      />
    </div>
  );
}
