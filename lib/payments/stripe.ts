import "server-only";
import Stripe from "stripe";
import { STRIPE_ENABLED } from "@/lib/feature-flags";

// Swappable-processor boundary per spec §11.2 ("build the checkout flow
// against a swappable processor interface rather than hardcoding one") —
// Stripe is the first/only implementation, but nothing outside this file
// should import the `stripe` package directly. Lazily constructed so the
// module can be imported even when STRIPE_ENABLED is false (e.g. at build
// time, with no key set yet) without throwing.
let client: Stripe | null = null;
function getClient(): Stripe {
  if (!STRIPE_ENABLED) {
    throw new Error("Stripe is not configured — check STRIPE_ENABLED before calling this.");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return client;
}

export interface DepositCheckoutInput {
  depositId: string; // becomes the Checkout Session's client_reference_id — how the webhook finds the Deposit row back
  amountMxn: number;
  clientName: string;
  clientEmail?: string;
  description: string; // e.g. "Depósito — Cita Signature, 12 oct 10:00"
  successUrl: string;
  cancelUrl: string;
  // The pending booking's own fields (location/date/time/tier/protocol),
  // carried on the Checkout Session itself — Stripe echoes metadata back on
  // every webhook event, so the webhook can reconstruct and insert the
  // appointment without a round trip to look anything else up.
  metadata: Record<string, string>;
}

export interface DepositCheckoutResult {
  checkoutUrl: string;
  sessionId: string;
}

// Called right after a Deposit row is created with status PENDING_PAYMENT
// (see lib/actions/booking.ts). amountMxn is pesos, not centavos — Stripe
// wants the smallest currency unit, hence the *100.
export async function createDepositCheckout(
  input: DepositCheckoutInput,
): Promise<DepositCheckoutResult> {
  const stripe = getClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: input.depositId,
    customer_email: input.clientEmail,
    line_items: [
      {
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(input.amountMxn * 100),
          product_data: { name: input.description },
        },
        quantity: 1,
      },
    ],
    metadata: { depositId: input.depositId, clientName: input.clientName, ...input.metadata },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  });

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }
  return { checkoutUrl: session.url, sessionId: session.id };
}

// Verifies the webhook came from Stripe (not a forged request hitting the
// public endpoint) before anything in the payload is trusted — the one
// security-critical step of this whole integration.
export function constructWebhookEvent(rawBody: string, signature: string): Stripe.Event {
  const stripe = getClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set — cannot verify webhook signatures.");
  }
  return stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
}
