"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/panel/Card";
import { Badge } from "@/components/panel/Badge";
import { revokeOwnConsentAction } from "@/lib/actions/clients";

export interface ConsentView {
  id: string;
  label: string;
  version: string;
  acceptedAt: string;
  revoked: boolean;
  revocable: boolean;
}

export function ClientConsentList({ consents }: { consents: ConsentView[] }) {
  const [pendingRevoke, setPendingRevoke] = useState<ConsentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function confirmRevoke() {
    if (!pendingRevoke) return;
    const target = pendingRevoke;
    startTransition(async () => {
      const result = await revokeOwnConsentAction(target.id);
      setError(result.error ?? null);
      setPendingRevoke(null);
    });
  }

  return (
    <>
      <Card title="Centro de consentimiento">
        {consents.length === 0 ? (
          <p className="py-3 font-body text-sm text-ciruela/50">
            Aún no hay consentimientos registrados en tu cuenta.
          </p>
        ) : (
          <ul className="divide-y divide-ciruela/8">
            {consents.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-body text-sm text-ciruela">{c.label}</p>
                  <p className="font-body text-xs text-ciruela/50">
                    {c.version} · aceptado {c.acceptedAt}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={c.revoked ? "neutral" : "positive"}>
                    {c.revoked ? "Revocado" : "Vigente"}
                  </Badge>
                  {c.revocable && !c.revoked && (
                    <button
                      onClick={() => setPendingRevoke(c)}
                      className="rounded-full border border-crepe px-3 py-1 font-body text-xs text-ciruela"
                    >
                      Revocar
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="mt-3 font-body text-xs text-[#b3392f]">{error}</p>}
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
              Vas a revocar &ldquo;{pendingRevoke.label}&rdquo;. Esta acción no se puede deshacer
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
                disabled={isPending}
                className="rounded-full bg-[#b3392f] px-4 py-1.5 font-body text-xs text-hueso disabled:opacity-60"
              >
                {isPending ? "Revocando…" : "Revocar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
