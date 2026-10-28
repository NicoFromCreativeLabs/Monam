// Pure HTML builder for the "welcome + ticket" email — no DB/network access,
// so it's testable on its own. Sent once, right after the first sale closes
// for a client created at the counter with no password yet (StaffCheckoutView's
// "Agregar clienta" → "no la encontramos, crear cuenta"): doubles as her
// receipt and her account-setup link, instead of two separate emails.
export interface ReceiptLine {
  label: string;
  priceMxn: number;
}

export interface WelcomeReceiptEmailInput {
  clientName: string;
  locationName: string;
  dateLabel: string; // already formatted, e.g. "28 de octubre de 2026"
  lines: ReceiptLine[];
  discountMxn: number; // positive pesos taken off, 0 if none
  totalMxn: number;
  passwordSetupUrl: string;
}

function money(mxn: number): string {
  return `$${mxn.toLocaleString("es-MX")} MXN`;
}

export function buildWelcomeReceiptEmailHtml(input: WelcomeReceiptEmailInput): string {
  const rows = input.lines
    .map(
      (l) => `<tr>
        <td style="padding:6px 0;color:#3f0215;font-size:14px;">${escapeHtml(l.label)}</td>
        <td style="padding:6px 0;color:#3f0215;font-size:14px;text-align:right;">${money(l.priceMxn)}</td>
      </tr>`,
    )
    .join("");

  const discountRow =
    input.discountMxn > 0
      ? `<tr>
          <td style="padding:6px 0;color:#b3392f;font-size:14px;">Descuento</td>
          <td style="padding:6px 0;color:#b3392f;font-size:14px;text-align:right;">-${money(input.discountMxn)}</td>
        </tr>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f3ece7;font-family:Georgia,serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3ece7;padding:32px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background-color:#fffdfb;border-radius:16px;padding:32px;">
            <tr>
              <td style="font-size:20px;color:#3f0215;padding-bottom:4px;">MONÂM Skin Studio</td>
            </tr>
            <tr>
              <td style="font-size:14px;color:#3f021599;padding-bottom:20px;">${escapeHtml(input.locationName)} · ${escapeHtml(input.dateLabel)}</td>
            </tr>
            <tr>
              <td style="font-size:15px;color:#3f0215;padding-bottom:16px;">
                Hola ${escapeHtml(input.clientName)}, gracias por tu compra. Aquí está tu ticket y, de paso,
                te creamos una cuenta para que veas tu historial y tus descuentos la próxima vez.
              </td>
            </tr>
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #3f021522;border-bottom:1px solid #3f021522;padding:8px 0;">
                  ${rows}
                  ${discountRow}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:12px;font-size:16px;color:#3f0215;font-weight:bold;text-align:right;">
                Total: ${money(input.totalMxn)}
              </td>
            </tr>
            <tr>
              <td style="padding-top:28px;">
                <a href="${input.passwordSetupUrl}" style="display:inline-block;background-color:#3f0215;color:#fffdfb;text-decoration:none;padding:12px 24px;border-radius:999px;font-size:14px;">
                  Crea tu contraseña
                </a>
              </td>
            </tr>
            <tr>
              <td style="padding-top:16px;font-size:12px;color:#3f021580;">
                Con tu cuenta puedes ver tus citas, tus compras y tus descuentos activos en monam.mx.
                Si no reconoces esta compra, ignora este correo.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
