"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { usePanelAlerts } from "@/components/panel/PanelAlertsContext";
import { useAnomalies } from "@/components/panel/AnomaliesContext";
import {
  RETAIL_INVENTORY,
  BACKBAR_INVENTORY,
  WAREHOUSE_INVENTORY,
  type RetailInventoryItem,
  type BackbarInventoryItem,
  type WarehouseInventoryItem,
} from "@/lib/mock-data";

// Front Desk owns stock levels at their own location — receiving shipments,
// correcting counts, spotting what's below par. Admin's Inventory screen
// covers both locations and the full catalog (add/remove products, CSV
// export); this is the location-scoped, quantity-only slice staff need day
// to day.
export default function StaffInventory() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);

  return (
    <>
      <TopBar title="Inventario" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 space-y-6 px-8 py-6">
        <InventoryCard
          title={`Piso — ${identity.location}`}
          items={RETAIL_INVENTORY.filter((i) => i.location === identity.location)}
        />
        <InventoryCard
          title={`Backbar — ${identity.location}`}
          items={BACKBAR_INVENTORY.filter((i) => i.location === identity.location)}
          showPao
        />
        <InventoryCard
          title={`Warehouse — ${identity.location}`}
          items={WAREHOUSE_INVENTORY.filter((i) => i.location === identity.location)}
        />
      </div>
    </>
  );
}

function InventoryCard({
  title,
  items,
  showPao = false,
}: {
  title: string;
  items: (RetailInventoryItem | BackbarInventoryItem | WarehouseInventoryItem)[];
  showPao?: boolean;
}) {
  const { addAlert } = usePanelAlerts();
  const { addAnomaly } = useAnomalies();
  const [list, setList] = useState(items);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState("");
  const [draftReason, setDraftReason] = useState("");

  const editingItem = list.find((i) => i.sku === editingSku);
  const newQty = Math.max(0, Number(draftQty) || 0);
  // Only a decrease needs a reason — receiving stock or correcting a typo
  // upward isn't the shrinkage-relevant case a pentest flagged: silently
  // "fixing" a count down with zero note or trail is the easiest way to
  // cover unlogged usage or theft.
  const isDecrease = editingItem ? newQty < editingItem.qty : false;
  const canSave = !isDecrease || draftReason.trim().length > 0;

  function save(sku: string) {
    const item = list.find((i) => i.sku === sku);
    if (!item || !canSave) return;
    const qty = Math.max(0, Number(draftQty) || 0);
    if (qty < item.qty) {
      addAlert(
        `Inventario ${item.product} (SKU ${item.sku}) ajustado de ${item.qty} a ${qty} — motivo: ${draftReason.trim()}.`,
      );
      addAnomaly(
        "Merma",
        `${item.product} (SKU ${item.sku}) bajó de ${item.qty} a ${qty} — motivo: ${draftReason.trim()}.`,
      );
    }
    setList((prev) => prev.map((i) => (i.sku === sku ? { ...i, qty } : i)));
    setEditingSku(null);
    setDraftReason("");
  }

  return (
    <Card title={title}>
      <ul className="divide-y divide-ciruela/8 font-body text-sm text-ciruela">
        {list.map((item) => {
          const lowStock = item.qty < item.par;
          const isEditing = editingSku === item.sku;
          return (
            <li key={item.sku} className="flex items-center justify-between py-3">
              <div>
                <p>{item.product}</p>
                <p className="text-xs text-ciruela/50">
                  SKU {item.sku} · Par {item.par}
                  {"expiresOn" in item ? ` · Vence ${item.expiresOn}` : ""}
                  {showPao && "pao" in item ? ` · Abierto ${item.opensOn} · PAO ${item.pao}` : ""}
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
                        onClick={() => save(item.sku)}
                        disabled={!canSave}
                        className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Guardar
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
                ) : (
                  <>
                    <span className="w-8 text-right">{item.qty}</span>
                    <button
                      onClick={() => {
                        setEditingSku(item.sku);
                        setDraftQty(String(item.qty));
                        setDraftReason("");
                      }}
                      className="rounded-full border border-ciruela/20 px-3 py-1 font-body text-xs text-ciruela hover:bg-ciruela/5"
                    >
                      Editar
                    </button>
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
