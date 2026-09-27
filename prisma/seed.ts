import { prisma } from "../lib/prisma";
import {
  LOCATIONS,
  PROTOCOLS,
  ADD_ONS,
  PACKAGE_OPTIONS,
  RETAIL_INVENTORY,
  BACKBAR_INVENTORY,
  PROTOCOL_RETAIL_LINK,
  KPI_TARGETS,
  SETTINGS,
  BUSINESS_RULES_EXTRA,
} from "../lib/mock-data";

// Seeds reference/configuration data only — the studio's real locations,
// menu, add-ons, physical rooms/devices, package pricing, starting
// inventory catalog, KPI targets, and default business-rule settings.
//
// Deliberately NOT seeded: Client, Appointment, Sale, CommissionEntry,
// ClinicalIncident, or any AppUser row. This is a real client's production
// Supabase project, not a throwaway dev sandbox — seeding fictional people,
// visits, or transactions (the mock UI's "Sofía Marín", "Renata Lugo", etc.)
// into it would pollute real data. AppUser rows specifically can't be
// fabricated anyway: AppUser.id must equal a real Supabase auth.users.id,
// which only exists once someone actually signs up/is invited — that's an
// Auth API call for the Owners to do once login is wired up, not a seed.

async function main() {
  // --- Locations --------------------------------------------------------
  const locationByName = new Map<string, string>(); // name -> id
  for (const l of LOCATIONS) {
    const row = await prisma.location.upsert({
      where: { id: l.id },
      create: {
        id: l.id,
        name: l.name,
        address: l.address,
        isActive: l.isActive,
        rentCostMxn: l.rentCost,
        maintenanceCostMxn: l.maintenanceCost,
      },
      update: {
        name: l.name,
        address: l.address,
        isActive: l.isActive,
        rentCostMxn: l.rentCost,
        maintenanceCostMxn: l.maintenanceCost,
      },
    });
    locationByName.set(row.name, row.id);
  }

  // --- Rooms & devices ----------------------------------------------------
  // CALENDAR_ROOMS mocks the shared LED panel as a fourth "room" — the real
  // schema models it correctly as a conflict-checked Device instead (spec
  // §5.2: shared/portable devices are booking-conflict resources too, not
  // rooms). Roma Norte is the only open location (spec: 4 treatment rooms
  // at Roma Norte per the Discovery Doc, one shared LED panel).
  const romaNorteId = locationByName.get("Roma Norte");
  if (romaNorteId) {
    for (const name of ["Sala 1", "Sala 2", "Sala 3"]) {
      const existing = await prisma.room.findFirst({ where: { locationId: romaNorteId, name } });
      if (!existing) await prisma.room.create({ data: { locationId: romaNorteId, name } });
    }
    const existingDevice = await prisma.device.findFirst({
      where: { locationId: romaNorteId, name: "Panel LED" },
    });
    if (!existingDevice) {
      await prisma.device.create({ data: { locationId: romaNorteId, name: "Panel LED" } });
    }
  }

  // --- Protocols ----------------------------------------------------------
  const protocolByName = new Map<string, string>();
  for (const p of PROTOCOLS) {
    const row = await prisma.protocol.upsert({
      where: { name: p.name },
      create: {
        name: p.name,
        tier: p.tier === "Signature" ? "SIGNATURE" : "TARGETED",
        durationMin: p.duration,
        priceMxn: p.price,
        costMxn: p.cost,
      },
      update: {
        tier: p.tier === "Signature" ? "SIGNATURE" : "TARGETED",
        durationMin: p.duration,
        priceMxn: p.price,
        costMxn: p.cost,
      },
    });
    protocolByName.set(row.name, row.id);
  }

  // --- Add-ons + protocol compatibility ------------------------------------
  for (const a of ADD_ONS) {
    await prisma.addOn.upsert({
      where: { id: a.id },
      create: { id: a.id, name: a.name, function: a.function, extraMinutes: a.extraMinutes },
      update: { name: a.name, function: a.function, extraMinutes: a.extraMinutes },
    });
    for (const protocolName of a.availableOn) {
      const protocolId = protocolByName.get(protocolName);
      if (!protocolId) continue;
      await prisma.addOnProtocol.upsert({
        where: { addOnId_protocolId: { addOnId: a.id, protocolId } },
        create: { addOnId: a.id, protocolId },
        update: {},
      });
    }
  }

  // --- Package options ------------------------------------------------------
  for (const pkg of PACKAGE_OPTIONS) {
    const existing = await prisma.packageOption.findFirst({ where: { name: pkg.name } });
    const data = {
      name: pkg.name,
      sessions: pkg.sessions,
      tier: (pkg.tier === "Signature" ? "SIGNATURE" : "TARGETED") as "SIGNATURE" | "TARGETED",
      listPriceMxn: pkg.listPrice,
      priceMxn: pkg.price,
    };
    if (existing) {
      await prisma.packageOption.update({ where: { id: existing.id }, data });
    } else {
      await prisma.packageOption.create({ data });
    }
  }

  // --- Retail + backbar catalog (dedupe by product name across locations) --
  const productByName = new Map<string, string>();
  async function upsertProduct(name: string, sku: string, ledger: "RETAIL" | "BACKBAR") {
    const existing = productByName.get(name);
    if (existing) return existing;
    const row = await prisma.product.upsert({
      where: { sku },
      create: { sku, name, ledger },
      update: { name, ledger },
    });
    productByName.set(name, row.id);
    return row.id;
  }

  for (const item of RETAIL_INVENTORY) {
    const locationId = locationByName.get(item.location);
    if (!locationId) continue;
    const productId = await upsertProduct(item.product, item.sku, "RETAIL");
    await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: {
        productId,
        locationId,
        qty: item.qty,
        par: item.par,
        priceMxn: item.price,
        costMxn: item.cost,
        expiresOn: new Date(item.expiresOn),
      },
      update: {
        qty: item.qty,
        par: item.par,
        priceMxn: item.price,
        costMxn: item.cost,
        expiresOn: new Date(item.expiresOn),
      },
    });
  }

  for (const item of BACKBAR_INVENTORY) {
    const locationId = locationByName.get(item.location);
    if (!locationId) continue;
    const productId = await upsertProduct(item.product, item.sku, "BACKBAR");
    await prisma.inventoryItem.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: {
        productId,
        locationId,
        qty: item.qty,
        par: item.par,
        openedOn: new Date(item.opensOn),
        paoDays: parsePaoMeses(item.pao),
      },
      update: {
        qty: item.qty,
        par: item.par,
        openedOn: new Date(item.opensOn),
        paoDays: parsePaoMeses(item.pao),
      },
    });
  }

  // --- Protocol → retail link (reference only; the real attach-rate is a
  // view over TreatmentRecord/RetailRecommendationTag/SaleLineItem, never
  // stored — see the architecture plan) ------------------------------------
  for (const link of PROTOCOL_RETAIL_LINK) {
    const protocolId = protocolByName.get(link.protocol);
    const productId = productByName.get(link.topProduct);
    if (!protocolId || !productId) continue;
    await prisma.protocolRetailLink.upsert({
      where: { protocolId_productId: { protocolId, productId } },
      create: { protocolId, productId },
      update: {},
    });
  }

  // --- KPI targets ("$520,000 MXN" -> 520000/"MXN", "80%" -> 80/"pct") -----
  for (const k of KPI_TARGETS) {
    const { value, unit } = parseKpiTarget(k.target);
    await prisma.kpiTarget.upsert({
      where: { kpi: k.kpi },
      create: { kpi: k.kpi, targetValue: value, targetUnit: unit, vigenciaYear: Number(k.vigencia) },
      update: { targetValue: value, targetUnit: unit, vigenciaYear: Number(k.vigencia) },
    });
  }

  // --- Settings (deposit/cancellation/discount rules) ----------------------
  const settingsEntries: [string, unknown][] = [
    ["deposit.requiredFirstTime", SETTINGS.depositRequiredFirstTime],
    ["deposit.requiredSignature", SETTINGS.depositRequiredSignature],
    ["cancellation.windowHours", SETTINGS.cancellationWindowHours],
    ["discount.approvalThresholdPct", SETTINGS.discountApprovalThresholdPct],
    ["anomaly.discountThresholdPct", BUSINESS_RULES_EXTRA.anomalyDiscountThresholdPct],
    ["anomaly.refundThresholdMxn", BUSINESS_RULES_EXTRA.anomalyRefundThresholdMXN],
  ];
  for (const [key, value] of settingsEntries) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value: value as never },
      update: { value: value as never },
    });
  }

  // --- Commission rules — placeholder rates from BUSINESS_RULES_EXTRA; spec
  // §14 flags final percentages as still "to define" (open question #5 in
  // the architecture plan) — these are seeded so the app has *something*
  // to calculate against, not a final client-confirmed number. --------------
  const commissionRules: { basis: "SERVICE" | "RETAIL"; rate: number }[] = [
    { basis: "SERVICE", rate: BUSINESS_RULES_EXTRA.commissionServicePct },
    { basis: "RETAIL", rate: BUSINESS_RULES_EXTRA.commissionRetailPct },
  ];
  for (const rule of commissionRules) {
    const existing = await prisma.commissionRule.findFirst({
      where: { basis: rule.basis, calcType: "PERCENTAGE" },
    });
    if (!existing) {
      await prisma.commissionRule.create({
        data: { basis: rule.basis, calcType: "PERCENTAGE", rateOrAmount: rule.rate },
      });
    }
  }

  console.log("Seed complete: locations, rooms/devices, protocols, add-ons, packages, " +
    "product catalog + starting inventory, KPI targets, settings, commission rules.");
}

function parsePaoMeses(text: string): number | undefined {
  const match = /(\d+)\s*mes/i.exec(text);
  return match ? Number(match[1]) * 30 : undefined;
}

function parseKpiTarget(text: string): { value: number; unit: string } {
  if (text.includes("%")) return { value: Number(text.replace(/[^\d.]/g, "")), unit: "pct" };
  if (text.includes("MXN")) return { value: Number(text.replace(/[^\d.]/g, "")), unit: "MXN" };
  return { value: Number(text.replace(/[^\d.]/g, "")) || 0, unit: "count" };
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
