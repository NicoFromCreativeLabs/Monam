import { prisma } from "@/lib/prisma";
import {
  AdminSettingsView,
  type OperationalSettings,
  type KpiTargetRow,
} from "@/components/panel/AdminSettingsView";

function settingBool(rows: { key: string; value: unknown }[], key: string, fallback: boolean) {
  const row = rows.find((r) => r.key === key);
  return typeof row?.value === "boolean" ? row.value : fallback;
}
function settingNumber(rows: { key: string; value: unknown }[], key: string, fallback: number) {
  const row = rows.find((r) => r.key === key);
  return typeof row?.value === "number" ? row.value : fallback;
}

function formatTarget(value: number, unit: string) {
  if (unit === "pct") return `${value}%`;
  if (unit === "MXN") return `$${value.toLocaleString()} MXN`;
  return `${value}`;
}

// Locations/Protocols/Add-ons already read/write real tables via their own
// Contexts (seeded in app/layout.tsx). Operational settings (deposit/
// cancellation/discount) and KPI targets are the two pieces still owned by
// this page specifically — real Setting/KpiTarget rows now, fetched here
// and persisted via lib/actions/settings.ts.
export default async function AdminSettingsPage() {
  const [settingRows, kpiTargets] = await Promise.all([
    prisma.setting.findMany({
      where: {
        key: {
          in: [
            "deposit.requiredFirstTime",
            "deposit.requiredSignature",
            "cancellation.windowHours",
            "discount.approvalThresholdPct",
          ],
        },
      },
    }),
    prisma.kpiTarget.findMany({ orderBy: { kpi: "asc" } }),
  ]);

  const initialOperationalSettings: OperationalSettings = {
    depositRequiredFirstTime: settingBool(settingRows, "deposit.requiredFirstTime", true),
    depositRequiredSignature: settingBool(settingRows, "deposit.requiredSignature", true),
    cancellationWindowHours: settingNumber(settingRows, "cancellation.windowHours", 24),
    discountApprovalThresholdPct: settingNumber(settingRows, "discount.approvalThresholdPct", 10),
  };

  const initialKpiTargets: KpiTargetRow[] = kpiTargets.map((k) => ({
    kpi: k.kpi,
    target: formatTarget(k.targetValue, k.targetUnit),
    vigencia: String(k.vigenciaYear),
  }));

  return (
    <AdminSettingsView
      initialOperationalSettings={initialOperationalSettings}
      initialKpiTargets={initialKpiTargets}
    />
  );
}
