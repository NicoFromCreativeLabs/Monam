"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { CLIENT_PAYMENT_METHODS } from "@/lib/mock-data";

// Saved cards for deposits — Phase 2 membership billing lives here too (spec
// §8.1). Real card entry needs the Stripe integration (not built yet); until
// then "Agregar método de pago" says so explicitly instead of doing nothing.
export default function ClientPaymentMethods() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <Card title="Métodos de pago">
      <ul className="divide-y divide-ciruela/8">
        {CLIENT_PAYMENT_METHODS.map((pm) => (
          <li key={pm.id} className="flex items-center justify-between py-3">
            <span className="font-body text-sm text-ciruela">
              {pm.brand} •••• {pm.last4}
            </span>
            <span className="font-body text-xs text-ciruela/50">Vence {pm.expiresOn}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={() => setShowNotice(true)}
        className="mt-4 rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
      >
        Agregar método de pago
      </button>
      {showNotice && (
        <p className="mt-2 font-body text-xs text-ciruela/50">
          Agregar tarjetas requiere la integración con Stripe — pendiente de conectar.
        </p>
      )}
    </Card>
  );
}
