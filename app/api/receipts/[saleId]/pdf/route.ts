import { type NextRequest, NextResponse } from "next/server";
import { getReceiptData } from "@/lib/receipts";
import { buildReceiptPdf } from "@/lib/pdf/receipt-pdf";
import { verifyLinkToken } from "@/lib/signed-link-token";

// "Descargar PDF" in the welcome/receipt email — reached by a client with no
// password yet, so this is authorized by a signed token scoped to this one
// saleId (see lib/signed-link-token.ts), not a login. No staff session
// check here on purpose: the email itself is the authorization.
export async function GET(request: NextRequest, { params }: { params: Promise<{ saleId: string }> }) {
  const { saleId } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!verifyLinkToken("receipt", saleId, token)) {
    return NextResponse.json({ error: "Enlace inválido o vencido." }, { status: 403 });
  }

  const data = await getReceiptData(saleId);
  if (!data) return NextResponse.json({ error: "Ticket no encontrado." }, { status: 404 });

  const pdf = await buildReceiptPdf({
    clientName: data.clientName,
    locationName: data.locationName,
    dateLabel: data.dateLabel,
    saleId,
    lines: data.lines,
    discountMxn: data.discountMxn,
    totalMxn: data.totalMxn,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-monam-${saleId.slice(0, 8)}.pdf"`,
    },
  });
}
