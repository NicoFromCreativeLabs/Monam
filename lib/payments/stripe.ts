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

export interface PackageCheckoutInput {
  amountMxn: number;
  clientEmail?: string;
  description: string; // e.g. "Pack Targeted x5"
  successUrl: string;
  cancelUrl: string;
  // Tagged "kind: package" so the webhook (app/api/stripe/webhook/route.ts)
  // can tell a package purchase apart from a booking deposit — both share
  // the same checkout.session.completed event type.
  metadata: Record<string, string>;
}

// A client buying a session pack straight from /my/packages — same real
// Stripe Checkout pattern as createDepositCheckout, just no
// client_reference_id (nothing else needs to look this session up by it).
export async function createPackageCheckout(
  input: PackageCheckoutInput,
): Promise<DepositCheckoutResult> {
  const stripe = getClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
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
    metadata: { kind: "package", ...input.metadata },
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

export interface CounterPaymentInput {
  amountMxn: number;
  description: string; // e.g. "Monâm Skin Studio — Roma Norte"
  metadata: Record<string, string>;
}

// In-clinic charge: Front Desk shows a QR to our own branded page
// (/pagar/<id>), where the client pays with Stripe's embedded Payment Element
// (card / Apple Pay / Google Pay). Card data goes straight from the browser to
// Stripe — it never touches this server. The Sale row is only written after
// the PaymentIntent is confirmed succeeded (createSaleAction verifies it).
// Tagged "kind: counter" so it can't be mistaken for a deposit or package.
// Which payment methods appear is managed in the Stripe Dashboard.
export async function createCounterPaymentIntent(input: CounterPaymentInput): Promise<{ paymentId: string }> {
  const stripe = getClient();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(input.amountMxn * 100),
    currency: "mxn",
    description: input.description,
    metadata: { ...input.metadata, kind: "counter" },
  });
  return { paymentId: intent.id };
}

export interface PaymentStatus {
  paid: boolean;
  canceled: boolean;
  amountMxn: number;
  kind: string | null;
}

export async function getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
  const stripe = getClient();
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  return {
    paid: intent.status === "succeeded",
    canceled: intent.status === "canceled",
    // amount_received is what actually settled; amount is what was asked for.
    amountMxn: (intent.status === "succeeded" ? intent.amount_received : intent.amount) / 100,
    kind: intent.metadata?.kind ?? null,
  };
}

// A counter payment link is for the person standing at the desk. Past this
// age the /pagar page stops accepting payment, so an abandoned QR can't be
// paid later with no sale on our side to match it.
const COUNTER_LINK_LIFETIME_SECONDS = 30 * 60;

export interface PayPageIntent extends PaymentStatus {
  clientSecret: string | null;
  linkExpired: boolean;
}

// Everything the public /pagar page needs, fetched server-side by intent id.
export async function getPayPageIntent(paymentId: string): Promise<PayPageIntent> {
  const stripe = getClient();
  const intent = await stripe.paymentIntents.retrieve(paymentId);
  return {
    paid: intent.status === "succeeded",
    canceled: intent.status === "canceled",
    amountMxn: intent.amount / 100,
    kind: intent.metadata?.kind ?? null,
    clientSecret: intent.client_secret,
    linkExpired: Math.floor(Date.now() / 1000) - intent.created > COUNTER_LINK_LIFETIME_SECONDS,
  };
}

export async function cancelPaymentIntent(paymentId: string): Promise<void> {
  const stripe = getClient();
  await stripe.paymentIntents.cancel(paymentId);
}

// Refunds part or all of a payment made through a PaymentIntent (the counter
// "En línea" charges). Amounts are pesos; Stripe wants centavos.
export async function refundPayment(paymentId: string, amountMxn: number): Promise<{ refundId: string }> {
  const stripe = getClient();
  const refund = await stripe.refunds.create({ payment_intent: paymentId, amount: Math.round(amountMxn * 100) });
  return { refundId: refund.id };
}
