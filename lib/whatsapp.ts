// Real WhatsApp Business number pending from client (Landing Spec §12 asset
// checklist) — never hardcode a fake one. Falls back to a visibly-placeholder
// number so a missing env var is obvious in dev rather than silently wrong.
const PLACEHOLDER_NUMBER = "000000000000";

export function whatsappBookingLink(message: string) {
  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || PLACEHOLDER_NUMBER;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
