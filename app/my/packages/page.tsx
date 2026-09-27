import { Card } from "@/components/panel/Card";
import { CLIENT_PACKAGE_BALANCE, PACKAGE_OPTIONS } from "@/lib/mock-data";

// Sessions remaining, expiry, which location redeemed each session (spec §8.1).
export default function ClientPackages() {
  const pack = CLIENT_PACKAGE_BALANCE;

  return (
    <div className="space-y-6">
      <Card title="Mis paquetes">
        <div className="flex items-center justify-between border-b border-ciruela/8 pb-4">
          <div>
            <p className="font-display text-lg text-ciruela">{pack.name}</p>
            <p className="font-body text-sm text-ciruela/60">Vence el {pack.expiresOn}</p>
          </div>
          <p className="font-display text-2xl text-ciruela">
            {pack.sessionsRemaining}{" "}
            <span className="font-body text-sm text-ciruela/50">sesiones restantes</span>
          </p>
        </div>
        <ul className="mt-4 divide-y divide-ciruela/8 font-body text-sm text-ciruela">
          <li className="flex justify-between py-2">
            <span>Sesión 1 — usada</span>
            <span className="text-ciruela/50">2026-08-24 · Roma Norte</span>
          </li>
          <li className="flex justify-between py-2">
            <span>Sesión 2 — usada</span>
            <span className="text-ciruela/50">2026-09-21 · Roma Norte</span>
          </li>
        </ul>
      </Card>

      <Card title="Comprar un paquete">
        <p className="mb-3 font-body text-xs text-ciruela/50">
          Prepaga varias sesiones y ahorra vs. reservar una por una.
        </p>
        <ul className="divide-y divide-ciruela/8">
          {PACKAGE_OPTIONS.map((p) => (
            <li key={p.name} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-sm text-ciruela">{p.name}</p>
                <p className="font-body text-xs text-ciruela/50">
                  {p.sessions} sesiones · {p.tier}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-body text-sm text-ciruela">${p.price.toLocaleString()} MXN</p>
                  <p className="font-body text-xs text-ciruela/40 line-through">
                    ${p.listPrice.toLocaleString()} MXN
                  </p>
                </div>
                <button className="rounded-full bg-ciruela px-3 py-1.5 font-body text-xs text-hueso">
                  Comprar
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
