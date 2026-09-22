import { Card } from "@/components/panel/Card";
import { CLIENT_PACKAGE_BALANCE } from "@/lib/mock-data";

// Sessions remaining, expiry, which location redeemed each session (spec §8.1).
export default function ClientPackages() {
  const pack = CLIENT_PACKAGE_BALANCE;

  return (
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
  );
}
