import { prisma } from "@/lib/prisma";
import { AdminPnlView } from "@/components/panel/AdminPnlView";
import { getReportingSnapshotAction } from "@/lib/actions/reporting";

// P&L — exact line-item structure per client spec (16-page admin review,
// Sep 2026). Every figure is real now: Sale/SaleLineItem/CommissionEntry/
// Location/AppUser aggregation via lib/reporting.ts. A few lines
// (Comisión de terminal, Operación del local, Marketing local, Insumos de
// add-ons, Paquetes vencidos no usados) have no real data source anywhere
// in the schema yet — they read real $0 (nothing recorded against them),
// not mocked-and-forgotten. Objetivo only exists for the two lines with a
// real KpiTarget row (Ingreso neto, EBITDA del local); every other line's
// Objetivo/Var. $ reads "—" rather than a fabricated per-line target.
export default async function AdminPnlPage() {
  const locations = await prisma.location.findMany({ orderBy: { createdAt: "asc" } });
  const snapshot = await getReportingSnapshotAction(
    locations.map((l) => l.name),
    "Mes en curso",
    "Mes anterior",
  );

  return <AdminPnlView initialSnapshot={snapshot} />;
}
