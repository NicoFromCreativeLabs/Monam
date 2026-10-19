// Real WhatsApp Business number pending from client (Landing Spec §12 asset
// checklist) — never hardcode a fake one. Falls back to a visibly-placeholder
// number so a missing env var is obvious in dev rather than silently wrong.
const PLACEHOLDER_NUMBER = "000000000000";

// wa.me only accepts the number as digits with the country code ("5255…") — a
// "+", spaces or dashes make it answer 404. The env var is typed the way people
// write a phone number, so it is cleaned up here.
export function whatsappDigits(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits || PLACEHOLDER_NUMBER;
}

export function whatsappBookingLink(message: string) {
  const number = whatsappDigits(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER);
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
