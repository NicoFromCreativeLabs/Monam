import { Card } from "@/components/panel/Card";
import { CLIENT_PAYMENT_METHODS } from "@/lib/mock-data";

// Saved cards for deposits — Phase 2 membership billing lives here too (spec §8.1).
export default function ClientPaymentMethods() {
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
      <button className="mt-4 rounded-full border border-ciruela px-4 py-2 font-body text-xs text-ciruela">
        Agregar método de pago
      </button>
    </Card>
  );
}
