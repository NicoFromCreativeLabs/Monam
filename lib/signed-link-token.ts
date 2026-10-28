import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

// Short-lived-by-rotation, purpose-scoped tokens for links that must work
// without a login — the welcome/receipt email is sent to a client who has no
// password yet, so "Descargar PDF" and "Eliminar mi cuenta" can't sit behind
// requireClient(). Signs {purpose}:{id} with HMAC-SHA256, keyed off the
// Supabase service-role key (already a strong, server-only secret unique to
// this project — no separate secret to configure) so a forged id/purpose
// combination is computationally infeasible, and rotating that key
// invalidates every outstanding link as a side effect, not a goal.
function secretKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — cannot sign/verify link tokens.");
  return key;
}

export function signLinkToken(purpose: string, id: string): string {
  return createHmac("sha256", secretKey()).update(`${purpose}:${id}`).digest("hex");
}

export function verifyLinkToken(purpose: string, id: string, token: string | null | undefined): boolean {
  if (!token) return false;
  const expected = signLinkToken(purpose, id);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(token, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
