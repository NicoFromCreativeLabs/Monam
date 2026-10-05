// Features that are built but deliberately not shown right now. Flip back
// to true to bring one back — the UI/logic stays in the codebase behind
// this flag instead of being deleted and having to be rebuilt later.

// CFDI (Mexican electronic invoicing) needs a PAC vendor decision (spec
// §14, still open) before it should appear anywhere a real client or the
// accountant would see it — turned off everywhere: the checkout receipt
// and the admin Caja y cobros summary.
export const CFDI_ENABLED = false;

// These two auto-activate the moment real credentials exist — no code
// change needed, no flag to remember to flip. Until then every call site
// falls back to today's manual behavior (deposits created without a real
// charge, "Book via WhatsApp" staying a deep link instead of a bot).
// Never hardcode `true` here — the moment any of these is empty, Stripe/the
// WhatsApp webhook would throw on first use instead of degrading gracefully.

// lib/payments/stripe.ts
export const STRIPE_ENABLED = Boolean(process.env.STRIPE_SECRET_KEY);

// app/api/whatsapp/webhook/route.ts, lib/whatsapp/*
export const WHATSAPP_BOOKING_ENABLED = Boolean(
  process.env.WHATSAPP_API_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_VERIFY_TOKEN,
);
