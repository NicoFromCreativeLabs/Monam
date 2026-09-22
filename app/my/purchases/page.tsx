import { Card } from "@/components/panel/Card";
import { CLIENT_PURCHASES } from "@/lib/mock-data";

// Retail purchase history — feeds MONAM's replenishment logic (spec §8.1, Phase 2).
export default function ClientPurchases() {
  return (
    <Card title="Mis compras">
      <ul className="divide-y divide-ciruela/8">
        {CLIENT_PURCHASES.map((p, i) => (
          <li key={i} className="flex items-center justify-between py-3">
            <div>
              <p className="font-body text-sm text-ciruela">{p.product}</p>
              <p className="font-body text-xs text-ciruela/50">
                {p.size} · {p.date}
              </p>
            </div>
            <span className="font-body text-sm text-ciruela">${p.price} MXN</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
