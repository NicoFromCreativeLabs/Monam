"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { adjustInventoryAction } from "@/lib/actions/commerce";

export interface InventoryRow {
  id: string;
  sku: string;
  product: string;
  location: string;
  qty: number;
  par: number;
  expiresOn?: string;
  opensOn?: string;
  pao?: string;
}

export function StaffInventoryView({
  retail,
  backbar,
  warehouse,
}: {
  retail: InventoryRow[];
  backbar: InventoryRow[];
  warehouse: InventoryRow[];
}) {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);

  return (
    <>
      <TopBar title="Inventario" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 space-y-6 px-8 py-6">
        <InventoryCard
          title={`Piso — ${identity.location}`}
          items={retail.filter((i) => i.location === identity.location)}
        />
        <InventoryCard
          title={`Backbar — ${identity.location}`}
          items={backbar.filter((i) => i.location === identity.location)}
          showPao
        />
        <InventoryCard
          title={`Warehouse — ${identity.location}`}
          items={warehouse.filter((i) => i.location === identity.location)}
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
  items: InventoryRow[];
  showPao?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftQty, setDraftQty] = useState("");
  const [draftReason, setDraftReason] = useState("");

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
                  SKU {item.sku} · Par {item.par}
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
