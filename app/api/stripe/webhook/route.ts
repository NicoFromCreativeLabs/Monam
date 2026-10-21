import { NextResponse } from "next/server";
import { STRIPE_ENABLED } from "@/lib/feature-flags";
import { constructWebhookEvent } from "@/lib/payments/stripe";
import { confirmDepositAndBook } from "@/lib/booking-core";
import { confirmPackagePurchase } from "@/lib/packages-core";
import { prisma } from "@/lib/prisma";
import { WHATSAPP_BOOKING_ENABLED } from "@/lib/feature-flags";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";

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
  const metadata = session.metadata;
  if (!metadata) {
    return NextResponse.json({ received: true });
  }

  // Package purchases (lib/packages-core.ts) tag their Checkout Session
  // metadata.kind = "package" — everything else is a booking deposit, the
  // original shape this webhook was built for (client_reference_id, not a
  // metadata tag, since that path predates packages).
  if (metadata.kind === "package") {
    const { clientId, packageOptionId } = metadata;
    if (clientId && packageOptionId) {
      await confirmPackagePurchase(clientId, packageOptionId);
    }
    return NextResponse.json({ received: true });
  }

  const depositId = session.client_reference_id;
  if (!depositId) {
    return NextResponse.json({ received: true });
  }

  const { locationName, date, time, durationTier, protocolName, addOnIds, clientId } = metadata;
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
      addOnIds: addOnIds ? addOnIds.split(",").filter(Boolean) : [],
    },
    clientId,
  );

  // A booking that started in the WhatsApp bot: tell the person how it went.
  if (metadata.notifyPhone && WHATSAPP_BOOKING_ENABLED) {
    const text =
      "error" in result
        ? "Recibimos tu depósito, pero ese horario ya se ocupó. Te contactaremos para reagendar tu cita sin costo."
        : `¡Listo! Recibimos tu depósito y tu cita quedó confirmada: ${date} a las ${time} en ${locationName}. Te esperamos 💆`;
    await sendWhatsAppMessage(metadata.notifyPhone, text).catch((err) =>
      console.error("Could not send the WhatsApp deposit confirmation:", err),
    );
  }

  if ("error" in result) {
    // Payment succeeded but the slot is gone — not a webhook failure, a
    // real booking conflict Front Desk needs to follow up on by hand.
    console.error("Stripe deposit paid but booking failed:", depositId, result.error);
    // Surface it in the panel's alerts too: the client has paid and has no
    // appointment, so Front Desk has to book it by hand or refund the deposit.
    await prisma.alert
      .create({
        data: {
          text: `Depósito pagado sin cita: ${date} ${time} (${durationTier}, ${locationName}). ${result.error} Reserva a mano o reembolsa el depósito.`,
          severity: "WARNING",
          sourceType: "DEPOSIT_NO_BOOKING",
          sourceId: depositId,
        },
      })
      .catch((err) => console.error("Could not create the unbooked-deposit alert:", err));
  }

  return NextResponse.json({ received: true });
}
