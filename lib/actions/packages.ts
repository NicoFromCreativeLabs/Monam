"use server";

import { headers } from "next/headers";
import { requireClientOrPreview } from "@/lib/auth/dal";
import { createPendingPackagePurchaseCheckout } from "@/lib/packages-core";

// Mirrors createClientDepositCheckoutAction (lib/actions/booking.ts) — real
// Stripe Checkout, PackagePurchase only written once the webhook confirms
// payment (confirmPackagePurchase in lib/packages-core.ts).
export async function purchasePackageAction(
  packageOptionId: string,
): Promise<{ checkoutUrl: string } | { error: string }> {
  const { client } = await requireClientOrPreview();
  const origin = (await headers()).get("origin") ?? "";

  return createPendingPackagePurchaseCheckout(client.id, packageOptionId, {
    successUrl: `${origin}/my/packages?compraConfirmada=1`,
    cancelUrl: `${origin}/my/packages`,
  });
}
