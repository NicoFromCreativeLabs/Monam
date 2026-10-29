"use client";

import { useState, useTransition } from "react";
import type React from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card, StatTile } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";

import { downloadInventoryWorkbook, readInventoryFile } from "@/lib/inventory-file";
import { inventorySheet } from "@/lib/inventory-columns";
import { useLocations } from "@/components/panel/LocationsContext";
import {
  receiveInventoryAction,
  adjustInventoryAction,
  updateInventoryItemAction,
  moveInventoryLedgerAction,
  importInventoryCsvAction,
  removeInventoryItemAction,
  type LedgerName as DbLedger,
} from "@/lib/actions/commerce";

export interface RetailInventoryRow {
  id: string;
  sku: string;
  product: string;
  brand: string;
  category: string;
  location: string;
  qty: number;
  par: number;
  price: number;
  cost: number;
  expiresOn: string;
}
export interface BackbarInventoryRow {
  id: string;
  sku: string;
  product: string;
  brand: string;
  category: string;
  location: string;
  qty: number; // sealed containers in stock
  par: number;
  pao: string; // display, e.g. "180 días"
  paoDays: number;
  contentMl: number;
  scope: "COMMUNAL" | "INDIVIDUAL";
  cost: number; // per container
  expiresOn: string; // lot expiry (YYYY-MM-DD), "" when unknown
  openCount: number;
  openMl: number;
}
export interface WarehouseInventoryRow {
  id: string;
  sku: string;
  product: string;
  brand: string;
  category: string;
  location: string;
  qty: number;
  par: number;
  cost: number;
  expiresOn: string;
}

// Three ledgers, kept logically separate (spec §5.3: "never merge into one
// stock line", i.e. never sum a product's quantities across ledgers — each
// row still belongs to exactly one). Piso (retail floor stock for sale),
// Backbar (opened, in active clinic use), and Warehouse (sealed bulk stock
// received but not yet moved to either).
//
// Data is real now — InventoryItem rows fetched server-side in page.tsx.
// Edits call Server Actions (lib/actions/commerce.ts) and refresh, rather
// than mutating local state.
type Tab = "todos" | "retail" | "backbar" | "warehouse";
type LedgerName = "Retail" | "Backbar" | "Warehouse";

const LEDGER_LABEL: Record<LedgerName, string> = {
  Retail: "Piso",
  Backbar: "Backbar",
  Warehouse: "Warehouse",
};

const LEDGER_TONE: Record<LedgerName, "info" | "neutral" | "positive"> = {
  Retail: "info",
  Backbar: "neutral",
  Warehouse: "positive",
};

const TO_DB_LEDGER: Record<LedgerName, DbLedger> = {
  Retail: "RETAIL",
  Backbar: "BACKBAR",
  Warehouse: "WAREHOUSE",
};

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

interface EditDraft {
  id: string;
  sku: string;
  originalLedger: LedgerName;
  product: string;
  brand: string;
  category: string;
  location: string;
  ledger: LedgerName;
  qty: string;
  originalQty: number;
  par: string;
  price: string;
  cost: string;
  expiresOn: string;
  contentMl: string;
  scope: "COMMUNAL" | "INDIVIDUAL";
  paoDays: string;
  error?: string;
}

const emptyNewProduct = {
  name: "",
  brand: "",
  category: "",
  location: "",
  ledgers: ["Retail"] as LedgerName[],
  retailSku: "",
  retailQty: "",
  retailPar: "",
  retailPrice: "",
  retailCost: "",
  retailExpires: "",
  backbarSku: "",
  backbarQty: "",
  backbarPar: "",
  backbarContentMl: "",
  backbarScope: "COMMUNAL" as "COMMUNAL" | "INDIVIDUAL",
  backbarPaoDays: "",
  backbarCost: "",
  warehouseSku: "",
  warehouseQty: "",
  warehousePar: "",
  warehouseCost: "",
  warehouseExpires: "",
};

type SortDir = "asc" | "desc";

// One shared sort state reused across every tab's table — harmless even
// though each tab has its own column set, since a column name that doesn't
// exist on the row currently showing just never gets clicked again until
// the user picks a column that does exist in that tab.
function sortRows<T extends object>(rows: T[], col: string | null, dir: SortDir): T[] {
  if (!col) return rows;
  return [...rows].sort((a, b) => {
    const av = (a as Record<string, unknown>)[col];
    const bv = (b as Record<string, unknown>)[col];
    let cmp: number;
    if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
    else cmp = String(av ?? "").localeCompare(String(bv ?? ""), "es");
    return dir === "asc" ? cmp : -cmp;
  });
}

function SortTh({
  label,
  col,
  sortCol,
  sortDir,
  onSort,
  className,
}: {
  label: string;
  col: string;
  sortCol: string | null;
  sortDir: SortDir;
  onSort: (col: string) => void;
  className?: string;
}) {
  const active = sortCol === col;
  return (
    <th className={className}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className="inline-flex items-center gap-0.5 hover:text-ciruela"
      >
        {label}
        <span className={active ? "opacity-100" : "opacity-20"}>
          {active && sortDir === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}

export function AdminInventoryView({
  initialRetail,
  initialBackbar,
  initialWarehouse,
}: {
  initialRetail: RetailInventoryRow[];
  initialBackbar: BackbarInventoryRow[];
  initialWarehouse: WarehouseInventoryRow[];
}) {
  const { selectedNames, locations } = useLocations();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("todos");
  const [editModal, setEditModal] = useState<EditDraft | null>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [restockOnly, setRestockOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [addMode, setAddMode] = useState<"closed" | "choose" | "manual" | "upload">("closed");
  const addProductOpen = addMode === "manual";
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvResult, setCsvResult] = useState<{ updated: number; created: number; skipped: number } | null>(null);
  const [newProduct, setNewProduct] = useState({
    ...emptyNewProduct,
    location: locations[0]?.name ?? "",
  });
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  }

  const retailByLocation = initialRetail.filter((i) => selectedNames.includes(i.location));
  const backbarByLocation = initialBackbar.filter((i) => selectedNames.includes(i.location));
  const warehouseByLocation = initialWarehouse.filter((i) => selectedNames.includes(i.location));

  const categories = Array.from(
    new Set([...initialRetail, ...initialBackbar, ...initialWarehouse].map((i) => i.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const matchesFilters = (i: { qty: number; par: number; category: string }) =>
    (!restockOnly || i.qty < i.par) && (!categoryFilter || i.category === categoryFilter);

  const retail = retailByLocation.filter(matchesFilters);
  const backbar = backbarByLocation.filter(matchesFilters);
  const warehouse = warehouseByLocation.filter(matchesFilters);

  const retailLow = retailByLocation.filter((i) => i.qty < i.par).length;
  const backbarLow = backbarByLocation.filter((i) => i.qty < i.par).length;
  const warehouseLow = warehouseByLocation.filter((i) => i.qty < i.par).length;
  const retailValue = retailByLocation.reduce((sum, i) => sum + i.qty * i.price, 0);
  const locationLabel = selectedNames.length > 1 ? selectedNames.join(" + ") : selectedNames[0];

  function openEdit(
    item: RetailInventoryRow | BackbarInventoryRow | WarehouseInventoryRow,
    ledger: LedgerName,
  ) {
    const retailItem = ledger === "Retail" ? (item as RetailInventoryRow) : null;
    const backbarItem = ledger === "Backbar" ? (item as BackbarInventoryRow) : null;
    const warehouseItem = ledger === "Warehouse" ? (item as WarehouseInventoryRow) : null;
    setEditModal({
      id: item.id,
      sku: item.sku,
      originalLedger: ledger,
      product: item.product,
      brand: item.brand,
      category: item.category,
      location: item.location,
      ledger,
      qty: String(item.qty),
      originalQty: item.qty,
      par: String(item.par),
      price: retailItem ? String(retailItem.price) : "",
      cost: retailItem
        ? String(retailItem.cost)
        : warehouseItem
          ? String(warehouseItem.cost)
          : backbarItem
            ? String(backbarItem.cost)
            : "",
      expiresOn: retailItem
        ? retailItem.expiresOn
        : warehouseItem
          ? warehouseItem.expiresOn
          : (backbarItem?.expiresOn ?? ""),
      contentMl: backbarItem ? String(backbarItem.contentMl || "") : "",
      scope: backbarItem ? backbarItem.scope : "COMMUNAL",
      paoDays: backbarItem ? String(backbarItem.paoDays || "") : "",
    });
  }

  function closeEdit() {
    setEditModal(null);
    setConfirmingRemove(false);
  }

  function removeProduct() {
    if (!editModal) return;
    const { id } = editModal;
    startTransition(async () => {
      const result = await removeInventoryItemAction(id);
      if ("error" in result) {
        setEditModal((m) => (m ? { ...m, error: result.error } : m));
        setConfirmingRemove(false);
        return;
      }
      closeEdit();
      router.refresh();
    });
  }

  function saveEditModal() {
    if (!editModal) return;
    const { id, ledger, originalLedger, qty, par, price, cost, expiresOn, contentMl, scope, paoDays, originalQty, category } = editModal;
    const qtyNum = Number(qty) || 0;
    const parNum = Number(par) || 0;
    const qtyDelta = qtyNum - originalQty;

    startTransition(async () => {
      if (ledger !== originalLedger) {
        await moveInventoryLedgerAction(id, TO_DB_LEDGER[ledger]);
      }
      const result = await updateInventoryItemAction({
        inventoryItemId: id,
        par: parNum,
        priceMxn: ledger === "Retail" ? Number(price) || 0 : undefined,
        costMxn: Number(cost) || 0,
        expiresOn: expiresOn || undefined,
        contentMl: ledger === "Backbar" ? Number(contentMl) || undefined : undefined,
        scope: ledger === "Backbar" ? scope : undefined,
        paoDays: ledger === "Backbar" ? Number(paoDays) || undefined : undefined,
        sku: editModal.sku,
        brand: editModal.brand,
        category,
      });
      if ("error" in result) {
        setEditModal((m) => (m ? { ...m, error: result.error } : m));
        return;
      }
      if (qtyDelta !== 0) {
        await adjustInventoryAction({ inventoryItemId: id, qtyDelta, reason: "Ajuste manual — Inventario" });
      }
      setEditModal(null);
      router.refresh();
    });
  }

  function toggleNewProductLedger(choice: LedgerName) {
    setNewProduct((f) => ({
      ...f,
      ledgers: f.ledgers.includes(choice)
        ? f.ledgers.filter((l) => l !== choice)
        : [...f.ledgers, choice],
    }));
  }

  // A brand can supply retail, backbar, and warehouse versions of the same
  // product, but per spec §5.3 they're never one stock line — checking more
  // than one box writes one independent Product per ledger (different SKUs,
  // qty, par, cost), never a shared quantity.
  function submitNewProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newProduct.name.trim() || !newProduct.location || newProduct.ledgers.length === 0) return;

    startTransition(async () => {
      if (newProduct.ledgers.includes("Retail")) {
        await receiveInventoryAction({
          productName: newProduct.name.trim(),
          brand: newProduct.brand.trim() || undefined,
          category: newProduct.category.trim() || undefined,
          sku: newProduct.retailSku.trim() || `SKU-${Date.now()}`,
          ledger: "RETAIL",
          locationName: newProduct.location,
          qty: Number(newProduct.retailQty) || 0,
          par: Number(newProduct.retailPar) || 0,
          priceMxn: Number(newProduct.retailPrice) || 0,
          costMxn: Number(newProduct.retailCost) || 0,
          expiresOn: newProduct.retailExpires || undefined,
        });
      }
      if (newProduct.ledgers.includes("Backbar")) {
        await receiveInventoryAction({
          productName: newProduct.name.trim(),
          brand: newProduct.brand.trim() || undefined,
          category: newProduct.category.trim() || undefined,
          sku: newProduct.backbarSku.trim() || `SKU-${Date.now()}-B`,
          ledger: "BACKBAR",
          locationName: newProduct.location,
          qty: Number(newProduct.backbarQty) || 0,
          par: Number(newProduct.backbarPar) || 0,
          contentMl: Number(newProduct.backbarContentMl) || undefined,
          scope: newProduct.backbarScope,
          paoDays: Number(newProduct.backbarPaoDays) || undefined,
          costMxn: Number(newProduct.backbarCost) || undefined,
        });
      }
      if (newProduct.ledgers.includes("Warehouse")) {
        await receiveInventoryAction({
          productName: newProduct.name.trim(),
          brand: newProduct.brand.trim() || undefined,
          category: newProduct.category.trim() || undefined,
          sku: newProduct.warehouseSku.trim() || `SKU-${Date.now()}-W`,
          ledger: "WAREHOUSE",
          locationName: newProduct.location,
          qty: Number(newProduct.warehouseQty) || 0,
          par: Number(newProduct.warehousePar) || 0,
          costMxn: Number(newProduct.warehouseCost) || 0,
          expiresOn: newProduct.warehouseExpires || undefined,
        });
      }
      setNewProduct({ ...emptyNewProduct, location: newProduct.location });
      setAddMode("closed");
      router.refresh();
    });
  }

  async function handleCsvFile(file: File) {
    setCsvError(null);
    setCsvResult(null);
    const parsed = await readInventoryFile(file);
    if ("error" in parsed) {
      setCsvError(parsed.error);
      return;
    }
    startTransition(async () => {
      const result = await importInventoryCsvAction(parsed.rows);
      setCsvResult({ updated: result.updated, created: result.created, skipped: result.skipped });
      router.refresh();
    });
  }

  // One workbook with a sheet per ledger (Piso, Backbar, Warehouse), with all the
  // stock and waste-control columns, so it can be edited and uploaded back.
  const sheetPiso = () => inventorySheet("Piso", retail);
  const sheetBackbar = () => inventorySheet("Backbar", backbar);
  const sheetWarehouse = () => inventorySheet("Warehouse", warehouse);

  function exportTodos() {
    downloadInventoryWorkbook("inventario-monam.xlsx", [sheetPiso(), sheetBackbar(), sheetWarehouse()]);
  }
  function exportRetail() {
    downloadInventoryWorkbook("inventario-piso-monam.xlsx", [sheetPiso()]);
  }
  function exportBackbar() {
    downloadInventoryWorkbook("inventario-backbar-monam.xlsx", [sheetBackbar()]);
  }
  function exportWarehouse() {
    downloadInventoryWorkbook("inventario-warehouse-monam.xlsx", [sheetWarehouse()]);
  }

  const exportForTab = { todos: exportTodos, retail: exportRetail, backbar: exportBackbar, warehouse: exportWarehouse }[tab];

  return (
    <>
      <TopBar title="Inventario" allowBothLocations />
      <div className="flex-1 space-y-6 px-8 py-6">
        <div className="grid grid-cols-2 gap-4 min-[1100px]:grid-cols-5">
          <StatTile label="SKUs — Piso" value={`${retail.length}`} sub={`${retailLow} bajo par`} />
          <StatTile label="SKUs — Backbar" value={`${backbar.length}`} sub={`${backbarLow} bajo par`} />
          <StatTile label="SKUs — Warehouse" value={`${warehouse.length}`} sub={`${warehouseLow} bajo par`} />
          <StatTile label="Valor en piso" value={`$${retailValue.toLocaleString()} MXN`} />
          <StatTile label="Total bajo par" value={`${retailLow + backbarLow + warehouseLow}`} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-full border border-ciruela/20 p-1 font-body text-xs w-fit">
            {(
              [
                ["todos", "Todos"],
                ["retail", "Piso"],
                ["backbar", "Backbar"],
                ["warehouse", "Warehouse"],
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
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-full border border-ciruela/20 bg-hueso px-3 py-1.5 font-body text-xs text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              onClick={() => setRestockOnly((v) => !v)}
              aria-pressed={restockOnly}
              className={`rounded-full border px-3 py-1.5 font-body text-xs ${
                restockOnly ? "border-crepe bg-crepe/40 text-ciruela" : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
              }`}
            >
              {restockOnly ? "✓ " : ""}Necesita restock
            </button>
            <DownloadButton onClick={exportForTab} />
            <button
              onClick={() => setAddMode((m) => (m === "closed" ? "choose" : "closed"))}
              className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso"
            >
              {addMode === "closed" ? "Agregar producto" : "Cancelar"}
            </button>
          </div>
        </div>

        {addMode === "upload" && (
          <Card title="Actualizar inventario — subir Excel/CSV">
            <p className="mb-3 font-body text-xs text-ciruela/50">
              Usa el mismo formato que &ldquo;Descargar Excel&rdquo;: un archivo con una hoja por ledger
              (Piso, Backbar, Warehouse). Cada hoja trae SKU, Producto, Ubicacion, Cantidad, Par y
              sus datos propios (Precio, Costo, ML por envase, Alcance, Duracion (dias),
              Caducidad). &ldquo;Envases abiertos&rdquo; y &ldquo;ML abiertos&rdquo; son solo
              informativas. Un CSV sigue funcionando si trae la columna Ledger. La cantidad y el par del
              archivo reemplazan los valores actuales de cada SKU — es un recuento, no una suma.
            </p>
            <input
              type="file"
              accept=".xlsx,.csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCsvFile(file);
                e.target.value = "";
              }}
              className="block font-body text-sm text-ciruela file:mr-3 file:rounded-full file:border-0 file:bg-ciruela file:px-4 file:py-1.5 file:font-body file:text-xs file:text-hueso"
            />
            {isPending && <p className="mt-3 font-body text-xs text-ciruela/50">Importando…</p>}
            {csvError && <p className="mt-3 font-body text-xs text-red-700">{csvError}</p>}
            {csvResult && (
              <p className="mt-3 font-body text-xs text-oliva">
                Listo — {csvResult.updated} actualizados, {csvResult.created} nuevos
                {csvResult.skipped > 0 ? `, ${csvResult.skipped} omitidos` : ""}.
              </p>
            )}
          </Card>
        )}

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
                    Marca
                  </label>
                  <input
                    value={newProduct.brand}
                    onChange={(e) => setNewProduct((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="p. ej. Anua"
                    className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                    Categoría
                  </label>
                  <input
                    value={newProduct.category}
                    onChange={(e) => setNewProduct((f) => ({ ...f, category: e.target.value }))}
                    placeholder="p. ej. Tónicos"
                    className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                    list="inventory-categories"
                  />
                  <datalist id="inventory-categories">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
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
                <div className="flex flex-wrap gap-2">
                  {(["Retail", "Backbar", "Warehouse"] as LedgerName[]).map((choice) => (
                    <label
                      key={choice}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-4 py-1.5 font-body text-xs ${
                        newProduct.ledgers.includes(choice)
                          ? "border-ciruela bg-ciruela text-hueso"
                          : "border-ciruela/20 text-ciruela/70 hover:bg-ciruela/8"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newProduct.ledgers.includes(choice)}
                        onChange={() => toggleNewProductLedger(choice)}
                        className="sr-only"
                      />
                      {LEDGER_LABEL[choice]}
                    </label>
                  ))}
                </div>
                <p className="mt-1 font-body text-[11px] text-ciruela/40">
                  Marcar más de una crea líneas de stock independientes — nunca se mezclan en
                  una sola (spec §5.3), aunque sea la misma marca.
                </p>
              </div>

              {newProduct.ledgers.includes("Retail") && (
                <div className="rounded-lg border border-pastel/60 bg-pastel/10 p-4">
                  <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                    Línea Piso
                  </p>
                  <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3">
                    <TextInput label="SKU" value={newProduct.retailSku} onChange={(v) => setNewProduct((f) => ({ ...f, retailSku: v }))} />
                    <TextInput label="Cantidad" type="number" value={newProduct.retailQty} onChange={(v) => setNewProduct((f) => ({ ...f, retailQty: v }))} />
                    <TextInput label="Par" type="number" value={newProduct.retailPar} onChange={(v) => setNewProduct((f) => ({ ...f, retailPar: v }))} />
                    <TextInput label="Precio (MXN)" type="number" value={newProduct.retailPrice} onChange={(v) => setNewProduct((f) => ({ ...f, retailPrice: v }))} />
                    <TextInput label="Costo (MXN)" type="number" value={newProduct.retailCost} onChange={(v) => setNewProduct((f) => ({ ...f, retailCost: v }))} />
                    <TextInput label="Vence" type="date" value={newProduct.retailExpires} onChange={(v) => setNewProduct((f) => ({ ...f, retailExpires: v }))} />
                  </div>
                </div>
              )}

              {newProduct.ledgers.includes("Backbar") && (
                <div className="rounded-lg border border-ciruela/15 bg-ciruela/5 p-4">
                  <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                    Línea Backbar
                  </p>
                  <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-4">
                    <TextInput label="SKU" value={newProduct.backbarSku} onChange={(v) => setNewProduct((f) => ({ ...f, backbarSku: v }))} />
                    <TextInput label="Cantidad" type="number" value={newProduct.backbarQty} onChange={(v) => setNewProduct((f) => ({ ...f, backbarQty: v }))} />
                    <TextInput label="Par" type="number" value={newProduct.backbarPar} onChange={(v) => setNewProduct((f) => ({ ...f, backbarPar: v }))} />
                    <TextInput label="ML por envase" type="number" value={newProduct.backbarContentMl} onChange={(v) => setNewProduct((f) => ({ ...f, backbarContentMl: v }))} />
                    <TextInput label="Duración abierto (días)" type="number" value={newProduct.backbarPaoDays} onChange={(v) => setNewProduct((f) => ({ ...f, backbarPaoDays: v }))} placeholder="p. ej. 180" />
                    <TextInput label="Costo por envase (MXN)" type="number" value={newProduct.backbarCost} onChange={(v) => setNewProduct((f) => ({ ...f, backbarCost: v }))} />
                    <label className="block">
                      <span className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Alcance</span>
                      <select
                        value={newProduct.backbarScope}
                        onChange={(e) => setNewProduct((f) => ({ ...f, backbarScope: e.target.value as "COMMUNAL" | "INDIVIDUAL" }))}
                        className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                      >
                        <option value="COMMUNAL">Comunal (por cabina)</option>
                        <option value="INDIVIDUAL">Individual (por esteticista)</option>
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {newProduct.ledgers.includes("Warehouse") && (
                <div className="rounded-lg border border-oliva/25 bg-oliva/5 p-4">
                  <p className="mb-3 font-body text-xs font-medium uppercase tracking-[0.14em] text-ciruela/60">
                    Línea Warehouse
                  </p>
                  <div className="grid grid-cols-2 gap-3 min-[700px]:grid-cols-3">
                    <TextInput label="SKU" value={newProduct.warehouseSku} onChange={(v) => setNewProduct((f) => ({ ...f, warehouseSku: v }))} />
                    <TextInput label="Cantidad" type="number" value={newProduct.warehouseQty} onChange={(v) => setNewProduct((f) => ({ ...f, warehouseQty: v }))} />
                    <TextInput label="Par" type="number" value={newProduct.warehousePar} onChange={(v) => setNewProduct((f) => ({ ...f, warehousePar: v }))} />
                    <TextInput label="Costo (MXN)" type="number" value={newProduct.warehouseCost} onChange={(v) => setNewProduct((f) => ({ ...f, warehouseCost: v }))} />
                    <TextInput label="Vence" type="date" value={newProduct.warehouseExpires} onChange={(v) => setNewProduct((f) => ({ ...f, warehouseExpires: v }))} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isPending} className="rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso disabled:opacity-50">
                {isPending ? "Guardando…" : "Agregar producto"}
              </button>
            </form>
          </Card>
        )}

        {tab === "todos" && (
          <Card title={`${locationLabel} — todos los productos`}>
            {retail.length + backbar.length + warehouse.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly ? "Nada necesita restock ahora mismo en esta sucursal." : "Sin productos registrados en esta sucursal todavía."}
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <SortTh label="SKU" col="sku" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Producto" col="product" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Marca" col="brand" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Categoría" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Ledger" col="ledger" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Ubicación" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6" />
                  <th className="pb-2 pr-6">Caducidad</th>
                  <SortTh label="Cant." col="qty" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-3 text-right" />
                  <SortTh label="Par" col="par" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {sortRows(
                  [
                    ...retail.map((i) => ({ ...i, ledger: "Retail" as const })),
                    ...backbar.map((i) => ({ ...i, ledger: "Backbar" as const })),
                    ...warehouse.map((i) => ({ ...i, ledger: "Warehouse" as const })),
                  ],
                  sortCol,
                  sortDir,
                ).map((item) => {
                  const low = item.qty < item.par;
                  return (
                    <tr key={item.id} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.brand || "—"}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.category || "—"}</td>
                      <td className="py-3">
                        <Badge tone={LEDGER_TONE[item.ledger]}>{LEDGER_LABEL[item.ledger]}</Badge>
                      </td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      <td className="py-3 pr-6 text-ciruela/50">
                        {item.ledger === "Backbar" ? `PAO ${item.pao}` : item.expiresOn}
                      </td>
                      <td className="py-3 pr-3 text-right">{item.qty}</td>
                      <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {low && <Badge tone="warning">Bajo par</Badge>}
                          <button onClick={() => openEdit(item, item.ledger)} className="font-body text-[11px] text-ciruela underline">
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
          </Card>
        )}

        {tab === "retail" && (
          <Card title={`${locationLabel} — piso`}>
            {retail.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly ? "Nada necesita restock ahora mismo en esta sucursal." : "Sin productos de piso registrados en esta sucursal todavía."}
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <SortTh label="SKU" col="sku" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Producto" col="product" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Marca" col="brand" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Categoría" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Ubicación" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6" />
                  <SortTh label="Cant." col="qty" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-3 text-right" />
                  <SortTh label="Par" col="par" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <SortTh label="Precio" col="price" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <SortTh label="Vence" col="expiresOn" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {sortRows(retail, sortCol, sortDir).map((item) => {
                  const low = item.qty < item.par;
                  return (
                    <tr key={item.id} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.brand || "—"}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.category || "—"}</td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      <td className="py-3 pr-3 text-right">{item.qty}</td>
                      <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                      <td className="py-3 pr-6 text-right">${item.price} MXN</td>
                      <td className="py-3 text-ciruela/50">{item.expiresOn}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {low && <Badge tone="warning">Bajo par</Badge>}
                          <button onClick={() => openEdit(item, "Retail")} className="font-body text-[11px] text-ciruela underline">
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
          </Card>
        )}

        {tab === "backbar" && (
          <Card title={`${locationLabel} — backbar`}>
            {backbar.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly ? "Nada necesita restock ahora mismo en esta sucursal." : "Sin productos backbar registrados en esta sucursal todavía."}
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <SortTh label="SKU" col="sku" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Producto" col="product" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Marca" col="brand" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Categoría" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Ubicación" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6" />
                  <SortTh label="Cant." col="qty" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-3 text-right" />
                  <SortTh label="Par" col="par" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <SortTh label="ML/envase" col="contentMl" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4 text-right" />
                  <SortTh label="Alcance" col="scope" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Duración" col="pao" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Costo" col="cost" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4 text-right" />
                  <SortTh label="Abiertos" col="openCount" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4 text-right" />
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {sortRows(backbar, sortCol, sortDir).map((item) => {
                  const low = item.qty < item.par;
                  return (
                    <tr key={item.id} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.brand || "—"}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.category || "—"}</td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      <td className="py-3 pr-3 text-right">{item.qty}</td>
                      <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                      <td className="py-3 pr-4 text-right text-ciruela/60">{item.contentMl ? `${item.contentMl} ml` : "—"}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.scope === "COMMUNAL" ? "Comunal" : "Individual"}</td>
                      <td className="py-3 pr-4 text-ciruela/50">{item.pao}</td>
                      <td className="py-3 pr-4 text-right text-ciruela/60">{item.cost ? `$${item.cost}` : "—"}</td>
                      <td className="py-3 pr-4 text-right text-ciruela/60">
                        {item.openCount > 0 ? `${item.openCount} · ${item.openMl} ml` : "—"}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {low && <Badge tone="warning">Bajo par</Badge>}
                          <button onClick={() => openEdit(item, "Backbar")} className="font-body text-[11px] text-ciruela underline">
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
            <p className="mt-4 font-body text-xs text-ciruela/40">
              Las líneas K-beauty (SKIN1004, Anua, Beauty of Joseon, Numbuzin, AXIS-Y, Purito,
              Dr. Althea) son solo-backbar y nunca aparecen en el catálogo retail.
            </p>
          </Card>
        )}

        {tab === "warehouse" && (
          <Card title={`${locationLabel} — warehouse`}>
            {warehouse.length === 0 ? (
              <p className="py-6 text-center font-body text-sm text-ciruela/50">
                {restockOnly ? "Nada necesita restock ahora mismo en esta sucursal." : "Sin stock de warehouse registrado en esta sucursal todavía."}
              </p>
            ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] whitespace-nowrap font-body text-sm text-ciruela">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-ciruela/40">
                  <SortTh label="SKU" col="sku" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Producto" col="product" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <SortTh label="Marca" col="brand" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Categoría" col="category" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-4" />
                  <SortTh label="Ubicación" col="location" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6" />
                  <SortTh label="Cant." col="qty" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-3 text-right" />
                  <SortTh label="Par" col="par" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <SortTh label="Costo" col="cost" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2 pr-6 text-right" />
                  <SortTh label="Vence" col="expiresOn" sortCol={sortCol} sortDir={sortDir} onSort={toggleSort} className="pb-2" />
                  <th className="pb-2" />
                </tr>
              </thead>
              <tbody>
                {sortRows(warehouse, sortCol, sortDir).map((item) => {
                  const low = item.qty < item.par;
                  return (
                    <tr key={item.id} className="border-t border-ciruela/8">
                      <td className="py-3 text-ciruela/50">{item.sku}</td>
                      <td className="py-3">{item.product}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.brand || "—"}</td>
                      <td className="py-3 pr-4 text-ciruela/60">{item.category || "—"}</td>
                      <td className="py-3 pr-6 text-ciruela/60">{item.location}</td>
                      <td className="py-3 pr-3 text-right">{item.qty}</td>
                      <td className="py-3 pr-6 text-right text-ciruela/50">{item.par}</td>
                      <td className="py-3 pr-6 text-right">${item.cost} MXN</td>
                      <td className="py-3 text-ciruela/50">{item.expiresOn}</td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {low && <Badge tone="warning">Bajo par</Badge>}
                          <button onClick={() => openEdit(item, "Warehouse")} className="font-body text-[11px] text-ciruela underline">
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            )}
            <p className="mt-4 font-body text-xs text-ciruela/40">
              Stock sellado, sin abrir — recibido pero aún no movido a piso ni a backbar. No se
              vende directo ni se descuenta en tratamientos.
            </p>
          </Card>
        )}
      </div>

      {addMode === "choose" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setAddMode("closed")}
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">Agregar producto</p>
              <button onClick={() => setAddMode("closed")} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
                ×
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setCsvError(null);
                  setCsvResult(null);
                  setAddMode("upload");
                }}
                className="w-full rounded-lg border border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
              >
                <span className="block font-medium">Subir Excel/CSV</span>
                <span className="block font-body text-xs text-ciruela/50">
                  Actualiza todo el inventario de una vez desde un archivo.
                </span>
              </button>
              <button
                onClick={() => setAddMode("manual")}
                className="w-full rounded-lg border border-ciruela/20 px-4 py-3 text-left font-body text-sm text-ciruela hover:bg-ciruela/5"
              >
                <span className="block font-medium">Agregar manualmente</span>
                <span className="block font-body text-xs text-ciruela/50">
                  Captura un producto nuevo a mano.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4" onClick={closeEdit}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-hueso p-5 shadow-xl">
            <div className="mb-1 flex items-center justify-between">
              <p className="font-display text-sm text-ciruela">Editar producto</p>
              <button onClick={closeEdit} aria-label="Cerrar" className="text-ciruela/50 hover:text-ciruela">
                ×
              </button>
            </div>
            <p className="mb-4 font-body text-xs text-ciruela/50">
              {editModal.product} · {editModal.location}
            </p>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <TextInput
                label="SKU"
                value={editModal.sku}
                onChange={(v) => setEditModal((m) => (m ? { ...m, sku: v, error: undefined } : m))}
              />
              <TextInput
                label="Marca"
                value={editModal.brand}
                onChange={(v) => setEditModal((m) => (m ? { ...m, brand: v } : m))}
              />
              <TextInput
                label="Categoría"
                value={editModal.category}
                onChange={(v) => setEditModal((m) => (m ? { ...m, category: v } : m))}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Ledger
              </label>
              <div className="flex flex-wrap gap-1 rounded-full border border-ciruela/20 p-1 font-body text-xs w-fit">
                {(["Retail", "Backbar", "Warehouse"] as LedgerName[]).map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setEditModal((m) => (m ? { ...m, ledger: choice } : m))}
                    aria-pressed={editModal.ledger === choice}
                    className={`rounded-full px-4 py-1.5 ${
                      editModal.ledger === choice ? "bg-ciruela text-hueso" : "text-ciruela/70 hover:bg-ciruela/8"
                    }`}
                  >
                    {LEDGER_LABEL[choice]}
                  </button>
                ))}
              </div>
              {editModal.ledger !== editModal.originalLedger && (
                <p className="mt-1 font-body text-[11px] text-ciruela/40">
                  Guardar moverá este producto al ledger {LEDGER_LABEL[editModal.ledger]} — nunca
                  se mezclan en una sola línea (spec §5.3).
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Cantidad" type="number" value={editModal.qty} onChange={(v) => setEditModal((m) => (m ? { ...m, qty: v } : m))} />
              <TextInput label="Par" type="number" value={editModal.par} onChange={(v) => setEditModal((m) => (m ? { ...m, par: v } : m))} />
              {editModal.ledger === "Retail" && (
                <>
                  <TextInput label="Precio (MXN)" type="number" value={editModal.price} onChange={(v) => setEditModal((m) => (m ? { ...m, price: v } : m))} />
                  <TextInput label="Costo (MXN)" type="number" value={editModal.cost} onChange={(v) => setEditModal((m) => (m ? { ...m, cost: v } : m))} />
                  <TextInput label="Vence" type="date" value={editModal.expiresOn} onChange={(v) => setEditModal((m) => (m ? { ...m, expiresOn: v } : m))} />
                </>
              )}
              {editModal.ledger === "Backbar" && (
                <>
                  <TextInput label="ML por envase" type="number" value={editModal.contentMl} onChange={(v) => setEditModal((m) => (m ? { ...m, contentMl: v } : m))} />
                  <TextInput label="Duración abierto (días)" type="number" value={editModal.paoDays} onChange={(v) => setEditModal((m) => (m ? { ...m, paoDays: v } : m))} />
                  <TextInput label="Costo por envase (MXN)" type="number" value={editModal.cost} onChange={(v) => setEditModal((m) => (m ? { ...m, cost: v } : m))} />
                  <TextInput label="Caducidad del lote" type="date" value={editModal.expiresOn} onChange={(v) => setEditModal((m) => (m ? { ...m, expiresOn: v } : m))} />
                  <label className="block">
                    <span className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Alcance</span>
                    <select
                      value={editModal.scope}
                      onChange={(e) => setEditModal((m) => (m ? { ...m, scope: e.target.value as "COMMUNAL" | "INDIVIDUAL" } : m))}
                      className="w-full rounded-lg border border-ciruela/20 bg-hueso px-3 py-2 font-body text-sm text-ciruela"
                    >
                      <option value="COMMUNAL">Comunal (por cabina)</option>
                      <option value="INDIVIDUAL">Individual (por esteticista)</option>
                    </select>
                  </label>
                </>
              )}
              {editModal.ledger === "Warehouse" && (
                <>
                  <TextInput label="Costo (MXN)" type="number" value={editModal.cost} onChange={(v) => setEditModal((m) => (m ? { ...m, cost: v } : m))} />
                  <TextInput label="Vence" type="date" value={editModal.expiresOn} onChange={(v) => setEditModal((m) => (m ? { ...m, expiresOn: v } : m))} />
                </>
              )}
            </div>

            {editModal.error && (
              <p className="mt-3 rounded-lg bg-[#b3392f]/10 px-3 py-2 font-body text-xs text-[#b3392f]">
                {editModal.error}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              {confirmingRemove ? (
                <span className="mr-auto flex items-center gap-2 font-body text-xs text-[#b3392f]">
                  ¿Eliminar de {editModal.location}?
                  <button onClick={removeProduct} disabled={isPending} className="underline disabled:opacity-50">
                    Sí, eliminar
                  </button>
                  <button onClick={() => setConfirmingRemove(false)} className="text-ciruela underline">
                    No
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmingRemove(true)}
                  className="mr-auto font-body text-xs text-[#b3392f] underline"
                >
                  Eliminar producto
                </button>
              )}
              <button onClick={closeEdit} className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso">
                Cancelar
              </button>
              <button onClick={saveEditModal} disabled={isPending} className="rounded-full bg-ciruela px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-50">
                {isPending ? "Guardando…" : editModal.ledger !== editModal.originalLedger ? "Mover" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
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
      <label className="mb-1 block font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">{label}</label>
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
