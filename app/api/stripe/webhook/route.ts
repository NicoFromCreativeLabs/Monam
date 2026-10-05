import { NextResponse } from "next/server";
import { STRIPE_ENABLED } from "@/lib/feature-flags";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { confirmDepositAndBook } from "@/lib/booking-core";

// Registers at https://<domain>/api/stripe/webhook in the Stripe Dashboard
// (Developers → Webhooks), subscribed to checkout.session.completed. Stripe
// retries on any non-2xx, so every branch below returns 200 once the event
// is understood (even "ignored, not our deposit") — only a genuinely
// unexpected server error should make Stripe retry.
export async function POST(request: Request) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event;
  try {
    event = constructWebhookEvent(rawBody, signature);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as {
    client_reference_id?: string | null;
    metadata?: Record<string, string> | null;
  };
  const depositId = session.client_reference_id;
  const metadata = session.metadata;
  if (!depositId || !metadata) {
    return NextResponse.json({ received: true });
  }

  const { locationName, date, time, durationTier, protocolName, clientId } = metadata;
  if (!locationName || !date || !time || !durationTier || !clientId) {
    return NextResponse.json({ received: true });
  }

  const result = await confirmDepositAndBook(
    depositId,
    {
      locationName,
      date,
      time,
      durationTier: durationTier === "Signature" ? "Signature" : "Targeted",
      protocolName: protocolName || null,
    },
    clientId,
  );

  if ("error" in result) {
    // Payment succeeded but the slot is gone — not a webhook failure, a
    // real booking conflict Front Desk needs to follow up on by hand.
    console.error("Stripe deposit paid but booking failed:", depositId, result.error);
  }

  return NextResponse.json({ received: true });
}
