import { NextResponse } from "next/server";
import { WHATSAPP_BOOKING_ENABLED } from "@/lib/feature-flags";
import { sendWhatsAppMessage } from "@/lib/whatsapp/client";
import { handleIncomingMessage } from "@/lib/whatsapp/conversation";
import { verifyMetaSignature } from "@/lib/whatsapp/signature";

// Registers at https://<domain>/api/whatsapp/webhook in Meta's App Dashboard
// (WhatsApp → Configuration → Webhook). Meta calls GET once, at setup time,
// to prove you control this URL; every real message after that arrives as
// a POST.

// Meta's one-time handshake: echo back hub.challenge only if hub.verify_token
// matches the value you set when subscribing the webhook (WHATSAPP_VERIFY_TOKEN).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// Cloud API payload shape for an inbound text message — only the fields
// this handler actually reads; Meta's payload has a lot more (statuses,
// read receipts, media messages, …) that this ignores for now.
interface WhatsAppWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        messages?: { from: string; type: string; text?: { body: string } }[];
      };
    }[];
  }[];
}

export async function POST(request: Request) {
  if (!WHATSAPP_BOOKING_ENABLED) {
    return NextResponse.json({ error: "WhatsApp booking not configured" }, { status: 503 });
  }

  // Meta signs every call with the app secret: with WHATSAPP_APP_SECRET set, a
  // call that is not signed by Meta is refused, so nobody else can post messages
  // to the bot. (Without the variable the check is skipped — set it.)
  const rawBody = await request.text();
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (appSecret) {
    if (!verifyMetaSignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    console.warn("WHATSAPP_APP_SECRET is not set: WhatsApp webhook calls are not being verified.");
  }

  let payload: WhatsAppWebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
  } catch {
    return NextResponse.json({ received: true });
  }
  const messages = payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];

  for (const message of messages) {
    if (message.type !== "text" || !message.text?.body) {
      // Voice notes, photos, stickers…: the bot only reads text.
      await sendWhatsAppMessage(
        message.from,
        "Por ahora solo puedo leer mensajes de texto 🙂 Escribe \"cita\" para agendar tu cita.",
      ).catch((err) => console.error("WhatsApp reply error for", message.from, err));
      continue;
    }
    try {
      const { reply } = await handleIncomingMessage(message.from, message.text.body);
      await sendWhatsAppMessage(message.from, reply);
    } catch (err) {
      // Never let one bad message take the webhook endpoint down — Meta
      // disables a webhook URL that errors too often, which would break
      // every other inbound conversation too.
      console.error("WhatsApp webhook error for", message.from, err);
    }
  }

  // Always 200 — WhatsApp retries on anything else, and a stuck message
  // (e.g. one this handler can't parse) would otherwise resend forever.
  return NextResponse.json({ received: true });
}
