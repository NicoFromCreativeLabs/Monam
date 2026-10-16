"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";

// Saved cards for deposits — Phase 2 membership billing lives here too (spec
// §8.1). Deposits and packages are paid through Stripe Checkout per payment,
// so no card is stored on file yet; until saving cards is built, this shows
// an empty state instead of a placeholder card.
export default function ClientPaymentMethods() {
  const [showNotice, setShowNotice] = useState(false);

  return (
    <Card title="Métodos de pago">
      <p className="py-3 font-body text-sm text-ciruela/50">
        No tienes métodos de pago guardados. Tus depósitos y paquetes se pagan de forma segura en
        cada compra.
      </p>
      <button
        onClick={() => setShowNotice(true)}
        className="mt-4 rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela"
      >
        Agregar método de pago
      </button>
      {showNotice && (
        <p className="mt-2 font-body text-xs text-ciruela/50">
          Guardar tarjetas estará disponible próximamente.
        </p>
      )}
    </Card>
  );
}
