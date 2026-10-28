import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { ReceiptLine } from "@/lib/email/receipt";

// Pure-ish (pdf-lib itself is the only side effect, no DB/network) PDF
// builder for the "Descargar PDF" link in the welcome/receipt email — the
// same line items as the HTML email, laid out as a simple printable ticket.
export interface ReceiptPdfInput {
  clientName: string;
  locationName: string;
  dateLabel: string;
  saleId: string;
  lines: ReceiptLine[];
  discountMxn: number;
  totalMxn: number;
}

function money(mxn: number): string {
  return `$${mxn.toLocaleString("es-MX")} MXN`;
}

export async function buildReceiptPdf(input: ReceiptPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([320, 500]); // narrow, receipt-shaped
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.247, 0.008, 0.082); // #3f0215, the app's ciruela

  let y = 460;
  const left = 24;
  const right = 296;

  const title = (text: string, size: number, font_ = bold) => {
    page.drawText(text, { x: left, y, size, font: font_, color: ink });
    y -= size + 8;
  };
  const row = (labelText: string, valueText: string, size = 10) => {
    page.drawText(labelText, { x: left, y, size, font, color: ink });
    const w = font.widthOfTextAtSize(valueText, size);
    page.drawText(valueText, { x: right - w, y, size, font, color: ink });
    y -= size + 8;
  };
  const rule = () => {
    page.drawLine({ start: { x: left, y }, end: { x: right, y }, thickness: 0.5, color: ink });
    y -= 14;
  };

  title("MONÂM Skin Studio", 16);
  page.drawText(`${input.locationName} · ${input.dateLabel}`, { x: left, y, size: 9, font, color: ink });
  y -= 24;
  page.drawText(`Clienta: ${input.clientName}`, { x: left, y, size: 10, font, color: ink });
  y -= 10;
  page.drawText(`Ticket: ${input.saleId}`, { x: left, y, size: 8, font, color: ink });
  y -= 20;
  rule();

  for (const line of input.lines) row(line.label, money(line.priceMxn));
  if (input.discountMxn > 0) row("Descuento", `-${money(input.discountMxn)}`);

  rule();
  row("Total", money(input.totalMxn), 12);

  return doc.save();
}
