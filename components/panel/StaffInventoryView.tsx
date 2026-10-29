"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { useCurrentAppUser } from "@/components/panel/CurrentAppUserContext";
import { adjustInventoryAction, importInventoryCsvAction, removeInventoryItemAction } from "@/lib/actions/commerce";
import { downloadInventoryWorkbook, readInventoryFile } from "@/lib/inventory-file";
import { inventorySheet, type InventorySheet } from "@/lib/inventory-columns";

export interface InventoryRow {
  id: string;
  sku: string;
  product: string;
  brand?: string;
  category?: string;
  location: string;
  qty: number;
  par: number;
  expiresOn?: string;
  opensOn?: string;
  pao?: string;
  // Needed for the spreadsheet (stock and waste control).
  price?: number;
  cost?: number; // only sent to Admin / Clinic Manager
  contentMl?: number;
  scope?: "COMMUNAL" | "INDIVIDUAL";
  paoDays?: number;
  openCount?: number;
  openMl?: number;
}

export function StaffInventoryView({
  retail,
  backbar,
  warehouse,
  includeCost,
}: {
  retail: InventoryRow[];
  backbar: InventoryRow[];
  warehouse: InventoryRow[];
  includeCost: boolean;
}) {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);

  const opts = { includeCost };
  const here = (items: InventoryRow[]) => items.filter((i) => i.location === identity.location);
  const sheets = [
    inventorySheet("Piso", here(retail), opts),
    inventorySheet("Backbar", here(backbar), opts),
    inventorySheet("Warehouse", here(warehouse), opts),
  ];

  const retailHere = retail.filter((i) => i.location === identity.location);
  const backbarHere = backbar.filter((i) => i.location === identity.location);
  const warehouseHere = warehouse.filter((i) => i.location === identity.location);

  const categories = Array.from(
    new Set([...retailHere, ...backbarHere, ...warehouseHere].map((i) => i.category).filter((c): c is string => !!c)),
  ).sort((a, b) => a.localeCompare(b, "es"));

  const [categoryFilter, setCategoryFilter] = useState("");
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const matches = (item: InventoryRow) => {
    if (categoryFilter && item.category !== categoryFilter) return false;
    if (lowStockOnly && item.qty >= item.par) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${item.product} ${item.sku} ${item.brand ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };

  return (
    <>
      <TopBar title="Inventario" />
      <div className="flex-1 space-y-6 px-8 py-6">
        <ExcelCard location={identity.location} sheets={sheets} />
        <InventoryFilters
          categories={categories}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          search={search}
          onSearchChange={setSearch}
          lowStockOnly={lowStockOnly}
          onLowStockOnlyChange={setLowStockOnly}
        />
        <InventoryCard title={`Piso — ${identity.location}`} items={retailHere.filter(matches)} />
        <InventoryCard title={`Backbar — ${identity.location}`} items={backbarHere.filter(matches)} showPao />
        <InventoryCard title={`Warehouse — ${identity.location}`} items={warehouseHere.filter(matches)} />
      </div>
    </>
  );
}

function InventoryFilters({
  categories,
  categoryFilter,
  onCategoryFilterChange,
  search,
  onSearchChange,
  lowStockOnly,
  onLowStockOnlyChange,
}: {
  categories: string[];
  categoryFilter: string;
  onCategoryFilterChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  lowStockOnly: boolean;
  onLowStockOnlyChange: (v: boolean) => void;
}) {
  return (
    <Card title="Filtros">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar producto, SKU o marca…"
          className="w-56 rounded-lg border border-ciruela/20 bg-hueso px-3 py-1.5 font-body text-sm text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        />
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          className="rounded-lg border border-ciruela/20 bg-hueso px-3 py-1.5 font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          onClick={() => onLowStockOnlyChange(!lowStockOnly)}
          aria-pressed={lowStockOnly}
          className={`rounded-full border px-3 py-1.5 font-body text-xs ${
            lowStockOnly ? "border-crepe bg-crepe/40 text-ciruela" : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
          }`}
        >
          {lowStockOnly ? "✓ " : ""}Solo bajo par
        </button>
        {(categoryFilter || search || lowStockOnly) && (
          <button
            onClick={() => {
              onCategoryFilterChange("");
              onSearchChange("");
              onLowStockOnlyChange(false);
            }}
            className="font-body text-xs text-ciruela/50 underline"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    </Card>
  );
}

// Update the stock from a spreadsheet: download the current inventory as Excel,
// change the quantities (or add rows), and upload it back. The quantity in the
// file replaces the current one — it is a recount, not an addition.
function ExcelCard({ location, sheets }: { location: string; sheets: InventorySheet[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ updated: number; created: number; skipped: number } | null>(null);

  async function onFile(file: File) {
    setError(null);
    setResult(null);
    const parsed = await readInventoryFile(file);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    startTransition(async () => {
      const done = await importInventoryCsvAction(parsed.rows);
      setResult({ updated: done.updated, created: done.created, skipped: done.skipped });
      router.refresh();
    });
  }

  return (
    <Card title="Actualizar con Excel">
      <p className="mb-3 font-body text-xs text-ciruela/50">
        Descarga el inventario de {location} (un Excel con una hoja para Piso, Backbar y Warehouse), cambia las cantidades y súbelo de nuevo (.xlsx o .csv). La
        cantidad del archivo reemplaza la actual de cada SKU; no se suma.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => downloadInventoryWorkbook(`inventario-${location.toLowerCase().replace(/\s+/g, "-")}.xlsx`, sheets)}
          disabled={sheets.every((sh) => sh.rows.length === 0)}
          className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso disabled:opacity-40"
        >
          Descargar Excel
        </button>
        <input
          type="file"
          accept=".xlsx,.csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
          className="block font-body text-sm text-ciruela file:mr-3 file:rounded-full file:border-0 file:bg-ciruela file:px-4 file:py-1.5 file:font-body file:text-xs file:text-hueso"
        />
      </div>
      {isPending && <p className="mt-3 font-body text-xs text-ciruela/50">Importando…</p>}
      {error && <p className="mt-3 font-body text-xs text-red-700">{error}</p>}
      {result && (
        <p className="mt-3 font-body text-xs text-oliva">
          Listo — {result.updated} actualizados, {result.created} nuevos
          {result.skipped > 0 ? `, ${result.skipped} omitidos` : ""}.
        </p>
      )}
    </Card>
  );
}

function InventoryCard({
  title,
  items,
  showPao = false,
}: {
  title: string;
  items: InventoryRow[];
  showPao?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState("");
  const [draftReason, setDraftReason] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  // Only an Admin or Clinic Manager can take a product out of the inventory.
  const currentUser = useCurrentAppUser();
  const canRemove = currentUser.role === "OWNER" || currentUser.role === "CLINIC_MANAGER";

  function remove(id: string) {
    startTransition(async () => {
      const done = await removeInventoryItemAction(id);
      if ("error" in done) {
        setRemoveError(done.error);
        return;
      }
      setConfirmRemoveId(null);
      setRemoveError(null);
      router.refresh();
    });
  }

  const editingItem = items.find((i) => i.id === editingId);
  const newQty = Math.max(0, Number(draftQty) || 0);
  // Only a decrease needs a reason — receiving stock or correcting a typo
  // upward isn't the shrinkage-relevant case a pentest flagged: silently
  // "fixing" a count down with zero note or trail is the easiest way to
  // cover unlogged usage or theft.
  const isDecrease = editingItem ? newQty < editingItem.qty : false;
  const canSave = !isDecrease || draftReason.trim().length > 0;

  function save(id: string) {
    const item = items.find((i) => i.id === id);
    if (!item || !canSave) return;
    const qty = Math.max(0, Number(draftQty) || 0);
    const qtyDelta = qty - item.qty;
    if (qtyDelta === 0) {
      setEditingId(null);
      return;
    }
    startTransition(async () => {
      await adjustInventoryAction({
        inventoryItemId: id,
        qtyDelta,
        reason: draftReason.trim() || "Recepción / ajuste — Inventario",
      });
      setEditingId(null);
      setDraftReason("");
      router.refresh();
    });
  }

  return (
    <Card title={title}>
      <ul className="divide-y divide-ciruela/8 font-body text-sm text-ciruela">
        {items.map((item) => {
          const lowStock = item.qty < item.par;
          const isEditing = editingId === item.id;
          return (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p>{item.product}</p>
                <p className="text-xs text-ciruela/50">
                  {item.brand ? `${item.brand} · ` : ""}SKU {item.sku} · Par {item.par}
                  {item.category ? ` · ${item.category}` : ""}
                  {item.expiresOn ? ` · Vence ${item.expiresOn}` : ""}
                  {showPao && item.pao ? ` · Abierto ${item.opensOn} · PAO ${item.pao}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {lowStock && !isEditing && (
                  <span className="rounded-full bg-crepe/30 px-2 py-0.5 font-body text-xs text-ciruela">
                    Reponer
                  </span>
                )}
                {isEditing ? (
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        autoFocus
                        value={draftQty}
                        onChange={(e) => setDraftQty(e.target.value)}
                        className="w-16 rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 text-right font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                      />
                      <button
                        onClick={() => save(item.id)}
                        disabled={!canSave || isPending}
                        className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {isPending ? "Guardando…" : "Guardar"}
                      </button>
                    </div>
                    {isDecrease && (
                      <input
                        type="text"
                        value={draftReason}
                        onChange={(e) => setDraftReason(e.target.value)}
                        placeholder="Motivo de la baja (requerido)"
                        className="w-48 rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 text-right font-body text-xs text-ciruela placeholder:text-ciruela/40 focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                      />
                    )}
                  </div>
                ) : confirmRemoveId === item.id ? (
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs text-[#b3392f]">¿Eliminar de {item.location}?</span>
                    {removeError && <span className="max-w-[220px] text-right text-xs text-[#b3392f]">{removeError}</span>}
                    <div className="flex gap-3 text-xs">
                      <button
                        onClick={() => remove(item.id)}
                        disabled={isPending}
                        className="text-[#b3392f] underline disabled:opacity-50"
                      >
                        {isPending ? "Eliminando…" : "Sí, eliminar"}
                      </button>
                      <button
                        onClick={() => {
                          setConfirmRemoveId(null);
                          setRemoveError(null);
                        }}
                        className="text-ciruela underline"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="w-8 text-right">{item.qty}</span>
                    <button
                      onClick={() => {
                        setEditingId(item.id);
                        setDraftQty(String(item.qty));
                        setDraftReason("");
                      }}
                      className="rounded-full border border-ciruela/20 px-3 py-1 font-body text-xs text-ciruela hover:bg-ciruela/5"
                    >
                      Editar
                    </button>
                    {canRemove && (
                      <button
                        onClick={() => {
                          setRemoveError(null);
                          setConfirmRemoveId(item.id);
                        }}
                        className="font-body text-xs text-[#b3392f] underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
