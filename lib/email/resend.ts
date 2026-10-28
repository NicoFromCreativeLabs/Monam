import "server-only";

// Transactional email (receipts, account-setup links) — separate from
// Supabase Auth's own templated emails (confirm signup, reset password; see
// docs/supabase-email/README.md), which only cover auth flows, not a custom
// message like "here's your ticket". Same Resend account, called directly
// over its HTTP API instead of through Supabase, so the message can carry
// real content (line items, a total) built per-sale.
const FROM = "MONÂM Skin Studio <no-reply@mail.monam.mx>";

export type SendEmailResult = { ok: true } | { ok: false; error: string };

// Never throws — a failed email must never roll back or block the sale (or
// whatever action triggered it) that already succeeded. Callers log/ignore
// the result as appropriate.
export async function sendEmail(input: { to: string; subject: string; html: string }): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY no está configurada." };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [input.to], subject: input.subject, html: input.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Resend respondió ${res.status}: ${body.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error desconocido enviando el correo." };
  }
}
