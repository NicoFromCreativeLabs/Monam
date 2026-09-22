"use client";

import { useState } from "react";
import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { RETAIL_INVENTORY, TODAY_APPOINTMENTS } from "@/lib/mock-data";

// One shared feature feeding Checkout, commission attribution, and the
// attach-rate metric — not three separate implementations (spec §7.3).
export default function StaffRetailTags() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const client = TODAY_APPOINTMENTS[0];
  const [selected, setSelected] = useState<string[]>([RETAIL_INVENTORY[0].sku]);

  function toggle(sku: string) {
    setSelected((prev) => {
      if (prev.includes(sku)) return prev.filter((s) => s !== sku);
      if (prev.length >= 3) return prev;
      return [...prev, sku];
    });
  }

  return (
    <>
      <TopBar title="Recomendaciones de compra" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-xl">
          <Card title={`${client.client} — recomienda hasta 3 productos`}>
            <ul className="space-y-2">
              {RETAIL_INVENTORY.map((item) => {
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
            <button className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso">
              Guardar recomendaciones
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
