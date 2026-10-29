import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { LocationRecord } from "@/components/panel/LocationsContext";
import type { ProtocolRecord } from "@/components/panel/ProtocolsContext";
import type { AddOnRecord } from "@/components/panel/AddOnsContext";
import type { BusinessRules } from "@/components/panel/BusinessRulesContext";
import {
  EMPTY_TERMINAL_SETTINGS,
  type TerminalSettings,
  type TerminalSettingsByLocation,
} from "@/components/panel/TerminalSettingsContext";
import type { StaffMember } from "@/lib/mock-data";
import { TIER_DEPOSIT_SETTING_KEYS, parseTierDepositRules } from "@/lib/deposit-rules";

// Catalog data (Locations, Protocols, Add-ons, business rules, staff roster)
// is small, changes rarely, and used to be re-queried from Postgres (6
// parallel queries) on every single request because it was fetched directly
// in the root layout, which wraps every route. Cached here instead — every
// write path that touches one of these tables (lib/actions/catalog.ts,
// addons.ts, settings.ts, staff.ts, profile.ts) calls
// revalidateTag(CATALOG_CACHE_TAG) so an edit shows up immediately; the
// 5-minute revalidate is only a safety net in case a future write path
// forgets to.
export const CATALOG_CACHE_TAG = "catalog";

const TIER_FROM_DB = { TARGETED: "Targeted", SIGNATURE: "Signature" } as const;

const ROLE_LABEL: Record<string, string> = {
  OWNER: "Admin",
  FRONT_DESK: "Recepción",
  ESTHETICIAN: "Esteticista",
  CLINIC_MANAGER: "Gerente de clínica",
};
const STATUS_LABEL: Record<string, StaffMember["status"]> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  INVITED: "Invitado",
};

export interface CatalogData {
  locations: LocationRecord[];
  protocols: ProtocolRecord[];
  addOns: AddOnRecord[];
  businessRules: BusinessRules;
  terminalSettingsByLocation: TerminalSettingsByLocation;
  roster: StaffMember[];
}

async function loadCatalogData(): Promise<CatalogData> {
  const [locations, protocols, addOns, commissionRules, anomalySettings, terminalSettingRows, staff] =
    await Promise.all([
      prisma.location.findMany({ include: { rooms: true }, orderBy: { createdAt: "asc" } }),
      prisma.protocol.findMany({ where: { isActive: true }, include: { addOns: { include: { addOn: true } } } }),
      prisma.addOn.findMany({ include: { protocols: { include: { protocol: true } } } }),
      prisma.commissionRule.findMany({ where: { calcType: "PERCENTAGE", role: null } }),
      prisma.setting.findMany({
        where: {
          key: {
            in: ["anomaly.discountThresholdPct", "anomaly.refundThresholdMxn", "pnl.terminalFeePct", "pnl.stripeFeePct", "pnl.stripeFixedFeeMxn", ...TIER_DEPOSIT_SETTING_KEYS],
          },
        },
      }),
      prisma.setting.findMany({ where: { key: { startsWith: "terminal.redsysEcr:" } } }),
      prisma.appUser.findMany({ where: { archivedAt: null }, include: { locationAssignments: { include: { location: true } } }, orderBy: { name: "asc" } }),
    ]);

  const locationRecords: LocationRecord[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    isActive: l.isActive,
    rentCost: l.rentCostMxn,
    maintenanceCost: l.maintenanceCostMxn,
    rooms: l.rooms.map((r) => ({ id: r.id, name: r.name })),
  }));

  const protocolRecords: ProtocolRecord[] = protocols.map((p) => ({
    id: p.id,
    name: p.name,
    tier: TIER_FROM_DB[p.tier],
    duration: p.durationMin,
    price: p.priceMxn,
    cost: p.costMxn,
  }));

  const addOnRecords: AddOnRecord[] = addOns.map((a) => ({
    id: a.id,
    name: a.name,
    function: a.function,
    extraMinutes: a.extraMinutes,
    priceMxn: a.priceMxn,
    costMxn: a.costMxn,
    availableOn: a.protocols.map((link) => link.protocol.name),
  }));

  const settingNumber = (key: string, fallback: number) => {
    const row = anomalySettings.find((s) => s.key === key);
    return typeof row?.value === "number" ? row.value : fallback;
  };
  const tierDepositRules = parseTierDepositRules(anomalySettings);
  const businessRules: BusinessRules = {
    commissionServicePct: commissionRules.find((r) => r.basis === "SERVICE")?.rateOrAmount ?? 0,
    commissionRetailPct: commissionRules.find((r) => r.basis === "RETAIL")?.rateOrAmount ?? 0,
    anomalyDiscountThresholdPct: settingNumber("anomaly.discountThresholdPct", 15),
    anomalyRefundThresholdMXN: settingNumber("anomaly.refundThresholdMxn", 1500),
    terminalFeePct: settingNumber("pnl.terminalFeePct", 0),
    stripeFeePct: settingNumber("pnl.stripeFeePct", 0),
    stripeFixedFeeMxn: settingNumber("pnl.stripeFixedFeeMxn", 0),
    depositRequiredSignature: tierDepositRules.signature,
    depositRequiredTargeted: tierDepositRules.targeted,
  };

  const roster: StaffMember[] = staff.map((s) => {
    const locationNames = s.locationAssignments.map((a) => a.location.name);
    const location = locationNames.length > 1 ? "Ambas" : (locationNames[0] ?? "—");
    return {
      id: s.id,
      name: s.name,
      role: ROLE_LABEL[s.role] ?? s.role,
      location,
      status: STATUS_LABEL[s.status] ?? "Invitado",
      salary: s.salaryMxn ?? 0,
    };
  });

  const terminalSettingsByLocation: TerminalSettingsByLocation = Object.fromEntries(
    terminalSettingRows.map((row) => [
      row.key.slice("terminal.redsysEcr:".length),
      { ...EMPTY_TERMINAL_SETTINGS, ...(row.value as Partial<TerminalSettings>) },
    ]),
  );

  return {
    locations: locationRecords,
    protocols: protocolRecords,
    addOns: addOnRecords,
    businessRules,
    terminalSettingsByLocation,
    roster,
  };
}

export const getCatalogData = unstable_cache(loadCatalogData, ["root-catalog-data"], {
  tags: [CATALOG_CACHE_TAG],
  revalidate: 300,
});
