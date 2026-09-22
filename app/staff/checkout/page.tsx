"use client";

import { TopBar } from "@/components/panel/TopBar";
import { Card } from "@/components/panel/Card";
import { staffIdentity, useStaffRole } from "@/components/panel/StaffRoleContext";
import { CHECKOUT_TICKET } from "@/lib/mock-data";

// Payment, CFDI request, retail sale pulling from tagged recommendations,
// rebooking — presented as one flow, not three (spec §7.2-7.3).
export default function StaffCheckout() {
  const { role } = useStaffRole();
  const identity = staffIdentity(role);
  const t = CHECKOUT_TICKET;
  const retailTotal = t.retailItems.reduce((sum, i) => sum + i.price, 0);
  const subtotal = t.service.price + retailTotal;
  const total = subtotal + t.depositCredit + t.tip;

  return (
    <>
      <TopBar title="Cobro / POS" userName={identity.name} userRole={identity.role} />
      <div className="flex-1 px-8 py-6">
        <div className="mx-auto max-w-lg">
          <Card title={`Ticket — ${t.client}`}>
            <ul className="divide-y divide-ciruela/8 font-body text-sm text-ciruela">
              <li className="flex justify-between py-2">
                <span>{t.service.name}</span>
                <span>${t.service.price} MXN</span>
              </li>
              {t.retailItems.map((item) => (
                <li key={item.name} className="flex justify-between py-2">
                  <div>
                    <p>{item.name}</p>
                    <p className="text-xs text-ciruela/50">Recomendado por {item.recommendedBy}</p>
                  </div>
                  <span>${item.price} MXN</span>
                </li>
              ))}
              <li className="flex justify-between py-2 text-oliva">
                <span>Crédito de depósito</span>
                <span>-${Math.abs(t.depositCredit)} MXN</span>
              </li>
              <li className="flex justify-between py-2">
                <span>Propina</span>
                <span>${t.tip} MXN</span>
              </li>
            </ul>
            <div className="mt-3 flex justify-between border-t border-ciruela/15 pt-3 font-body text-base font-medium text-ciruela">
              <span>Total</span>
              <span>${total} MXN</span>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              {["Efectivo", "Tarjeta", "SPEI"].map((m) => (
                <button
                  key={m}
                  className="rounded-full border border-ciruela px-3 py-2 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
                >
                  {m}
                </button>
              ))}
            </div>
            <label className="mt-4 flex items-center gap-2 font-body text-xs text-ciruela/70">
              <input type="checkbox" className="h-4 w-4 accent-ciruela" />
              Solicitar factura (CFDI)
            </label>
            <button className="mt-6 w-full rounded-full bg-ciruela px-5 py-3 font-body text-sm text-hueso">
              Cobrar y reagendar
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}
