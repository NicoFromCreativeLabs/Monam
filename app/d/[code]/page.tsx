import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { discountSummary, normalizeCode } from "@/lib/discount-codes";

export const metadata: Metadata = {
  title: "Descuento · MONÂM Skin Studio",
  robots: { index: false, follow: false },
};

function formatDate(d: Date) {
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Mexico_City" });
}

// Public page (see PUBLIC_PREFIXES in lib/supabase/proxy.ts): what a client sees
// when she scans a discount QR with her phone camera. The front desk redeems it
// by scanning the same QR inside Cobro / POS, or by typing the code.
export default async function DiscountPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: raw } = await params;
  const code = normalizeCode(decodeURIComponent(raw));
  const row = code ? await prisma.discountCode.findUnique({ where: { code } }) : null;

  const now = new Date();
  const expired = !!row?.validUntil && now > row.validUntil;
  const notYet = !!row?.validFrom && now < row.validFrom;
  const usable = !!row && row.isActive && !expired && !notYet;

  return (
    <main className="flex min-h-screen items-center justify-center bg-hueso px-4 py-10 text-ciruela">
      <div className="w-full max-w-sm text-center">
        <p className="font-display text-3xl tracking-[0.3em]">MONÂM</p>
        <p className="mt-1 font-body text-xs uppercase tracking-[0.2em] text-ciruela/50">Skin Studio</p>

        <div className="mt-8 rounded-[18px] border border-ciruela/10 bg-white px-6 py-8">
          {row ? (
            <>
              <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">Tu descuento</p>
              <p className="mt-2 font-display text-2xl">{row.name}</p>
              <p className="mt-1 font-body text-sm text-ciruela/70">{discountSummary(row)}</p>
              {row.mode === "CHECKOUT" && (
                <p className="mt-5 rounded-lg bg-ciruela/5 px-4 py-3 font-display text-xl tracking-[0.15em]">{row.code}</p>
              )}
              {row.mode === "ACCOUNT" && (
                <a
                  href={row.accountGrant === "SIGNUP" ? "/signup" : "/my/packages"}
                  className="mt-5 inline-block rounded-full bg-ciruela px-5 py-2.5 font-body text-sm text-hueso"
                >
                  {row.accountGrant === "SIGNUP" ? "Crear mi cuenta" : "Ir a mi cuenta"}
                </a>
              )}
              {usable && row.mode === "ACCOUNT" ? (
                <p className="mt-5 font-body text-sm text-ciruela/70">
                  {row.accountGrant === "SIGNUP"
                    ? "Crea tu cuenta y este descuento se agrega solo para tu primera visita."
                    : "Reclámalo en tu cuenta (Paquetes → Mis descuentos) y úsalo en tu cita."}
                  {row.validUntil ? ` Válido hasta el ${formatDate(row.validUntil)}.` : ""}
                </p>
              ) : usable ? (
                <p className="mt-5 font-body text-sm text-ciruela/70">
                  Muestra este código en recepción al pagar para aplicarlo.
                  {row.validUntil ? ` Válido hasta el ${formatDate(row.validUntil)}.` : ""}
                </p>
              ) : (
                <p className="mt-5 font-body text-sm text-[#b3392f]">
                  {expired ? "Este descuento ya venció." : notYet ? "Este descuento todavía no está vigente." : "Este descuento ya no está disponible."}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-display text-xl">Código no válido</p>
              <p className="mt-2 font-body text-sm text-ciruela/70">Revisa el código o pregunta en recepción.</p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
