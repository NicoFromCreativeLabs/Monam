"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import {
  RETAIL_INVENTORY,
  BACKBAR_INVENTORY,
  type RetailInventoryItem,
  type BackbarInventoryItem,
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
          title={`Retail — ${identity.location}`}
          items={RETAIL_INVENTORY.filter((i) => i.location === identity.location)}
        />
        <InventoryCard
          title={`Backbar — ${identity.location}`}
          items={BACKBAR_INVENTORY.filter((i) => i.location === identity.location)}
          showPao
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
  items: (RetailInventoryItem | BackbarInventoryItem)[];
  showPao?: boolean;
}) {
  const [list, setList] = useState(items);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState("");

  function save(sku: string) {
    setList((prev) =>
      prev.map((i) => (i.sku === sku ? { ...i, qty: Math.max(0, Number(draftQty) || 0) } : i))
    );
    setEditingSku(null);
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
                  {showPao && "pao" in item ? ` · PAO ${item.pao}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {lowStock && !isEditing && (
                  <span className="rounded-full bg-crepe/30 px-2 py-0.5 font-body text-xs text-ciruela">
                    Reponer
                  </span>
                )}
                {isEditing ? (
                  <>
                    <input
                      type="number"
                      autoFocus
                      value={draftQty}
                      onChange={(e) => setDraftQty(e.target.value)}
                      className="w-16 rounded-lg border border-ciruela/20 bg-hueso px-2 py-1 text-right font-body text-sm text-ciruela focus:outline-none focus:ring-1 focus:ring-ciruela/40"
                    />
                    <button
                      onClick={() => save(item.sku)}
                      className="rounded-full bg-ciruela px-3 py-1 font-body text-xs text-hueso"
                    >
                      Guardar
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-8 text-right">{item.qty}</span>
                    <button
                      onClick={() => {
                        setEditingSku(item.sku);
                        setDraftQty(String(item.qty));
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
