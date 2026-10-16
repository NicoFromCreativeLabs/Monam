import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STRIPE_ENABLED } from "@/lib/feature-flags";
import { cancelPaymentIntent, getPayPageIntent, type PayPageIntent } from "@/lib/payments/stripe";
import { PayForm, PayMessage } from "@/components/pay/PayForm";

export const metadata: Metadata = {
  title: "Pago · MONÂM Skin Studio",
  robots: { index: false, follow: false },
};

// Public page (see PUBLIC_PREFIXES in lib/supabase/proxy.ts): the client scans
// the QR from Front Desk's screen and pays here without logging in. Only
// counter payments (metadata.kind === "counter") are served.
export default async function PayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const { paymentId } = await params;
  if (!STRIPE_ENABLED || !/^pi_[A-Za-z0-9]+$/.test(paymentId)) notFound();

  let intent: PayPageIntent;
  try {
    intent = await getPayPageIntent(paymentId);
  } catch {
    notFound();
  }
  if (intent.kind !== "counter") notFound();

  let content: React.ReactNode;

  if (intent.paid) {
    content = <PayMessage title="Pago recibido" body="Gracias por tu compra. Ya puedes cerrar esta página." />;
  } else if (intent.canceled || intent.linkExpired || !intent.clientSecret) {
    // Canceled in Stripe too, so the expired QR can't be paid afterwards.
    if (!intent.canceled) await cancelPaymentIntent(paymentId).catch(() => {});
    content = (
      <PayMessage
        title="Este link de pago venció"
        body="Pídele al personal del estudio que genere uno nuevo."
      />
    );
  } else {
    content = (
      <>
        <div className="mb-6 text-center">
          <p className="font-body text-xs uppercase tracking-[0.14em] text-ciruela/50">MONÂM Skin Studio</p>
          <p className="mt-2 font-display text-4xl text-ciruela">${intent.amountMxn} MXN</p>
        </div>
        <PayForm clientSecret={intent.clientSecret} amountMxn={intent.amountMxn} />
      </>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-hueso px-6 py-10">
      <div className="w-full max-w-sm">{content}</div>
    </main>
  );
}
