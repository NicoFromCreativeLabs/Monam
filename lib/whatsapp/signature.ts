import { createHmac, timingSafeEqual } from "node:crypto";

// Meta signs every webhook call: the header `X-Hub-Signature-256` is
// "sha256=" + HMAC-SHA256 of the raw request body, keyed with the app secret.
// Checking it proves the call really came from Meta, so nobody else can post
// fake messages to the booking bot.
export function verifyMetaSignature(rawBody: string, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const received = header.slice("sha256=".length);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
