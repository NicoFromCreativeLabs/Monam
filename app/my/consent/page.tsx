"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { CLIENT_CONSENTS } from "@/lib/mock-data";

// View current consent status per document/version; revoke marketing/photo
// consent independently of treatment consent (spec §8.1, §5.1).
export default function ClientConsent() {
  const [revoked, setRevoked] = useState<string[]>([]);

  return (
    <Card title="Centro de consentimiento">
      <ul className="divide-y divide-ciruela/8">
        {CLIENT_CONSENTS.map((c) => {
          const isRevoked = revoked.includes(c.type);
          return (
            <li key={c.type} className="flex items-center justify-between py-3">
              <div>
                <p className="font-body text-sm text-ciruela">{c.type}</p>
                <p className="font-body text-xs text-ciruela/50">
                  {c.version} · aceptado {c.acceptedAt}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={isRevoked ? "neutral" : "positive"}>
                  {isRevoked ? "Revocado" : "Vigente"}
                </Badge>
                {c.revocable && !isRevoked && (
                  <button
                    onClick={() => setRevoked((prev) => [...prev, c.type])}
                    className="rounded-full border border-crepe px-3 py-1 font-body text-xs text-ciruela"
                  >
                    Revocar
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 font-body text-xs text-ciruela/40">
        El consentimiento de tratamiento y el aviso de privacidad no son revocables mientras
        tengas un expediente clínico activo.
      </p>
    </Card>
  );
}
