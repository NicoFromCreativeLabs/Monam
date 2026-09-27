"use client";

import { useState } from "react";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { CLIENT_CONSENTS } from "@/lib/mock-data";

// View current consent status per document/version; revoke marketing/photo
// consent independently of treatment consent (spec §8.1, §5.1).
export default function ClientConsent() {
  const [revoked, setRevoked] = useState<string[]>([]);
  const [pendingRevoke, setPendingRevoke] = useState<(typeof CLIENT_CONSENTS)[number] | null>(null);

  function confirmRevoke() {
    if (!pendingRevoke) return;
    setRevoked((prev) => [...prev, pendingRevoke.type]);
    setPendingRevoke(null);
  }

  return (
    <>
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
                      onClick={() => setPendingRevoke(c)}
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

      {pendingRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ciruela/40 px-4"
          onClick={() => setPendingRevoke(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xs rounded-2xl bg-hueso p-5 shadow-xl"
          >
            <p className="font-display text-sm text-ciruela">¿Estás segura?</p>
            <p className="mt-2 font-body text-sm text-ciruela/70">
              Vas a revocar &ldquo;{pendingRevoke.type}&rdquo;. Esta acción no se puede deshacer
              desde aquí — tendrías que aceptarlo de nuevo si cambias de opinión.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingRevoke(null)}
                className="rounded-full border border-ciruela px-4 py-1.5 font-body text-xs text-ciruela hover:bg-ciruela hover:text-hueso"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRevoke}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso"
              >
                Revocar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
