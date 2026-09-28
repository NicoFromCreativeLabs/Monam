"use client";

import { useState, useTransition } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { saveRetailTagsAction } from "@/lib/actions/treatment";

export interface RetailCatalogItem {
  sku: string;
  product: string;
  price: number;
}

export interface RetailTagsClient {
  appointmentId: string;
  clientName: string;
}

// One shared feature feeding Checkout, commission attribution, and the
// attach-rate metric — not three separate implementations (spec §7.3).
// `client` is the esthetician's own most recently completed treatment today
// (Treatment phase); tags write to the real RetailRecommendationTag table.
export function StaffRetailTagsView({
  client,
  catalog,
  initialSelected,
}: {
  client: RetailTagsClient | null;
  catalog: RetailCatalogItem[];
  initialSelected: string[];
}) {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function toggle(sku: string) {
    setSelected((prev) => {
      if (prev.includes(sku)) return prev.filter((s) => s !== sku);
      if (prev.length >= 3) return prev;
      return [...prev, sku];
    });
    setSaved(false);
  }

  function save() {
    if (!client) return;
    startTransition(async () => {
      await saveRetailTagsAction(client.appointmentId, selected);
      setSaved(true);
    });
  }

  return (
    <>
      <TopBar title="Recomendaciones de compra" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-xl">
          {!client ? (
            <Card title="Sin tratamiento reciente">
              <p className="py-4 text-center font-body text-sm text-ciruela/50">
                Completa un tratamiento primero para poder recomendar productos.
              </p>
            </Card>
          ) : (
            <Card title={`${client.clientName} — recomienda hasta 3 productos`}>
              <ul className="space-y-2">
                {catalog.map((item) => {
                  const active = selected.includes(item.sku);
                  return (
                    <li key={item.sku}>
                      <button
                        onClick={() => toggle(item.sku)}
                        className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left font-body text-sm ${
                          active
                            ? "border-ciruela bg-ciruela text-hueso"
                            : "border-ciruela/20 text-ciruela hover:bg-ciruela/5"
                        }`}
                      >
                        <span>{item.product}</span>
                        <span className={active ? "text-hueso/80" : "text-ciruela/50"}>
                          ${item.price} MXN
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <button
                onClick={save}
                disabled={isPending}
                className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso disabled:opacity-50"
              >
                {isPending ? "Guardando…" : "Guardar recomendaciones"}
              </button>
              {saved && (
                <p className="mt-2 text-center font-body text-xs text-oliva">
                  Recomendaciones guardadas.
                </p>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
