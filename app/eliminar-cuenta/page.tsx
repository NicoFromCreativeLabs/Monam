import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { verifyLinkToken } from "@/lib/signed-link-token";
import { DeleteAccountConfirm } from "./DeleteAccountConfirm";

export const metadata: Metadata = {
  title: "Eliminar cuenta · MONÂM Skin Studio",
  robots: { index: false, follow: false },
};

// Public page (see PUBLIC_PREFIXES in lib/supabase/proxy.ts) — reached from
// "eliminar tu cuenta" in the welcome/receipt email a client gets the first
// time she buys something at the counter, before she's ever logged in. The
// clientId + token pair is this page's only authorization; there is no
// session check.
export default async function DeleteAccountPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string; token?: string }>;
}) {
  const { clientId, token } = await searchParams;
  const valid = !!clientId && !!token && verifyLinkToken("delete-account", clientId, token);

  let clientName: string | null = null;
  let alreadyDeleted = false;
  if (valid && clientId) {
    const client = await prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.anonymizedAt) alreadyDeleted = true;
    else clientName = client.name;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-hueso px-4 py-10 text-ciruela">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-3xl tracking-[0.3em]">MONÂM</p>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.2em] text-ciruela/50">Skin Studio</p>

        <div className="mt-8 rounded-[18px] border border-ciruela/10 bg-white px-6 py-8">
          {!valid ? (
            <>
              <p className="font-display text-xl">Enlace no válido</p>
              <p className="mt-2 font-body text-sm text-ciruela/70">
                Este enlace venció o ya se usó. Escríbenos si necesitas ayuda.
              </p>
            </>
          ) : alreadyDeleted ? (
            <>
              <p className="font-display text-xl">Cuenta ya eliminada</p>
              <p className="mt-2 font-body text-sm text-ciruela/70">
                Esta cuenta ya no tiene datos personales en nuestro sistema.
              </p>
            </>
          ) : (
            <>
              <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">
                Eliminar cuenta y datos
              </p>
              <DeleteAccountConfirm clientId={clientId!} token={token!} clientName={clientName!} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
