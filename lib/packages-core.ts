import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Real package purchases (Commerce phase) — same "money has to actually
// clear before the row gets written" shape as booking-core.ts's Stripe
// deposit flow: createPendingPackagePurchaseCheckout asks Stripe for a
// Checkout Session, and only confirmPackagePurchase (called from the
// webhook once Stripe confirms payment) writes the real PackagePurchase row.

export interface PackageBalanceView {
  name: string;
  sessionsRemaining: number;
  expiresOn: string;
}

// The client's single active (not fully used, not expired) pack, if any —
// "active" meaning the one a redemption at checkout would draw from.
export async function getActivePackageBalance(clientId: string): Promise<PackageBalanceView | null> {
  const purchases = await prisma.packagePurchase.findMany({
    where: { clientId },
    include: { packageOption: true },
    orderBy: { purchasedAt: "desc" },
  });
  const active = purchases.find((p) => {
    const remaining = p.packageOption.sessions - p.sessionsUsed;
    const notExpired = !p.expiresOn || p.expiresOn > new Date();
    return remaining > 0 && notExpired;
  });
  if (!active) return null;
  return {
    name: active.packageOption.name,
    sessionsRemaining: active.packageOption.sessions - active.sessionsUsed,
    expiresOn: active.expiresOn ? active.expiresOn.toISOString().slice(0, 10) : "—",
  };
}

const PACKAGE_VALIDITY_DAYS = 90;

export async function createPendingPackagePurchaseCheckout(
  clientId: string,
  packageOptionId: string,
  urls: { successUrl: string; cancelUrl: string },
): Promise<{ checkoutUrl: string } | { error: string }> {
  const { STRIPE_ENABLED } = await import("@/lib/feature-flags");
  if (!STRIPE_ENABLED) return { error: "Stripe no está configurado todavía." };
  const { createPackageCheckout } = await import("@/lib/payments/stripe");

  const [client, packageOption] = await Promise.all([
    prisma.client.findUnique({ where: { id: clientId } }),
    prisma.packageOption.findUnique({ where: { id: packageOptionId } }),
  ]);
  if (!client) return { error: "Clienta no encontrada." };
  if (!packageOption || !packageOption.isActive) return { error: "Paquete no disponible." };

  try {
    const checkout = await createPackageCheckout({
      amountMxn: packageOption.priceMxn,
      clientEmail: client.email ?? undefined,
      description: packageOption.name,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      metadata: { clientId, packageOptionId },
    });
    return { checkoutUrl: checkout.checkoutUrl };
  } catch {
    return { error: "No se pudo generar el link de pago — intenta de nuevo." };
  }
}

// Called by the Stripe webhook once a package-purchase Checkout Session
// actually completes — writes the real PackagePurchase row only now, same
// "paid, so now it's real" precedent as confirmDepositAndBook.
export async function confirmPackagePurchase(clientId: string, packageOptionId: string): Promise<void> {
  const packageOption = await prisma.packageOption.findUnique({ where: { id: packageOptionId } });
  if (!packageOption) return;

  const expiresOn = new Date();
  expiresOn.setDate(expiresOn.getDate() + PACKAGE_VALIDITY_DAYS);

  await prisma.packagePurchase.create({
    data: { clientId, packageOptionId, expiresOn },
  });
  revalidatePath("/my/packages");
  revalidatePath("/my");
}
