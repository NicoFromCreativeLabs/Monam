import "server-only";
import { WHATSAPP_BOOKING_ENABLED } from "@/lib/feature-flags";

// Sends a plain-text message via the WhatsApp Cloud API (Meta's hosted
// Business Platform — not Twilio or another BSP; swap the fetch URL/body
// shape here if the studio ends up on a different provider). Graph API
// version is pinned so Meta deprecating a newer version doesn't silently
// break this — bump deliberately, not automatically.
const GRAPH_API_VERSION = "v21.0";

export async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  if (!WHATSAPP_BOOKING_ENABLED) {
    throw new Error("WhatsApp booking is not configured — check WHATSAPP_BOOKING_ENABLED before calling this.");
  }
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_API_TOKEN;

  const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`WhatsApp send failed (${res.status}): ${errorBody}`);
  }
}
