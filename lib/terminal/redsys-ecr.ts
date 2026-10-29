// Redsys "Integración ECR" (a.k.a. TPV integrado / POS-ECR) protocol for the
// PAX A910S terminal BBVA activates on a merchant's card terminal. This is a
// LOCAL protocol: the terminal listens on a TCP port on the shop's LAN and
// exchanges fixed-format messages directly with the point-of-sale app — it
// is NOT a cloud/REST API, so there is no public endpoint to call.
//
// STATUS: placeholder. BBVA/Redsys has not yet handed over the real ECR-POS
// manual (the doc that specifies the exact message format, field order and
// terminal port) for this merchant — see CLAUDE.md / the chat where this was
// scoped. Everything below is a best-effort skeleton so the rest of the
// checkout flow (settings, bridge, UI) can be wired up now; replace
// buildChargeMessage/parseResponseMessage with the real format from the
// manual once BBVA provides it. Do not trust the field names here as final.

export interface EcrChargeRequest {
  amountMxn: number; // whole pesos — converted to centavos below, confirm against the real manual
  ticketId: string; // our Sale-quote reference, echoed back in the response for reconciliation
  fuc: string; // Código de comercio Redsys
  terminalId: string; // Código de terminal Redsys
}

export interface EcrChargeResponse {
  approved: boolean;
  authCode?: string; // authorization code printed on the terminal receipt
  message: string; // human-readable result, shown to the vendedora
  rawResponse: string; // unparsed terminal response, kept for troubleshooting
}

// TODO(redsys-ecr-protocol): replace with the real message format once the
// ECR-POS manual is in hand. This placeholder guesses a simple delimited
// format so the bridge has something concrete to send; it will very likely
// need to change to match what the PAX A910S actually expects.
export function buildChargeMessage(req: EcrChargeRequest): string {
  const amountCentavos = Math.round(req.amountMxn * 100);
  return [
    "VENTA", // operation code — confirm against the manual (may be numeric, e.g. "01")
    String(amountCentavos).padStart(12, "0"),
    req.fuc,
    req.terminalId,
    req.ticketId,
  ].join("|");
}

// TODO(redsys-ecr-protocol): replace with the real response parser.
export function parseResponseMessage(raw: string): EcrChargeResponse {
  const fields = raw.trim().split("|");
  const [status, authCode, ...rest] = fields;
  const approved = status === "OK" || status === "00";
  return {
    approved,
    authCode: authCode || undefined,
    message: approved ? "Pago aprobado por la terminal." : `Terminal rechazó el cobro (${rest.join(" ") || "sin detalle"}).`,
    rawResponse: raw,
  };
}
