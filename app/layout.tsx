import type { Metadata } from "next";
import { Fraunces, Inter, Prata, Beau_Rivage } from "next/font/google";
import { prisma } from "@/lib/prisma";
import { LocationsProvider, type LocationRecord } from "@/components/panel/LocationsContext";
import { PeriodProvider } from "@/components/panel/PeriodContext";
import { CompareProvider } from "@/components/panel/CompareContext";
import { ProtocolsProvider, type ProtocolRecord } from "@/components/panel/ProtocolsContext";
import { AddOnsProvider, type AddOnRecord } from "@/components/panel/AddOnsContext";
import { StaffRosterProvider } from "@/components/panel/StaffRosterContext";
import type { StaffMember } from "@/lib/mock-data";
import { ClientBookingProvider } from "@/components/panel/ClientBookingContext";
import { BusinessRulesProvider, type BusinessRules } from "@/components/panel/BusinessRulesContext";
import { LoadingCurtain } from "@/components/LoadingCurtain";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const prata = Prata({
  variable: "--font-prata",
  subsets: ["latin"],
  weight: "400",
});

const beauRivage = Beau_Rivage({
  variable: "--font-beau-rivage",
  subsets: ["latin"],
  weight: "400",
});

// metadataBase makes the auto-generated opengraph-image URL (and any other
// relative metadata URL) resolve to the real domain instead of defaulting
// to localhost — without it, a shared link's preview image 404s in
// production even though it renders fine in local dev.
const SITE_URL = "https://monam.mx";
const SITE_DESCRIPTION = "Wellness Hub · Skincare Studio en Ciudad de México.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "MONÂM Skin Studio",
  description: SITE_DESCRIPTION,
  openGraph: {
    title: "MONÂM Skin Studio",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "MONÂM Skin Studio",
    locale: "es_MX",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MONÂM Skin Studio",
    description: SITE_DESCRIPTION,
  },
};

const TIER_FROM_DB = { TARGETED: "Targeted", SIGNATURE: "Signature" } as const;

// Catalog data (Locations, Protocols, Add-ons) is small, public-ish menu
// data read on every request regardless of panel or auth state — fetched
// once here and handed to each Context as its initial value, instead of
// each panel re-fetching or reading a frozen mock array. Write paths
// (lib/actions/catalog.ts) persist to the same tables and revalidate this
// layout's cache.
const ROLE_LABEL: Record<string, string> = {
  OWNER: "Admin",
  FRONT_DESK: "Recepción",
  ESTHETICIAN: "Esteticista",
  CLINIC_MANAGER: "Gerente de clínica",
  ACCOUNTANT: "Contador",
};
const STATUS_LABEL: Record<string, StaffMember["status"]> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  INVITED: "Invitado",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locations, protocols, addOns, commissionRules, anomalySettings, staff] = await Promise.all([
    prisma.location.findMany({ include: { rooms: true }, orderBy: { createdAt: "asc" } }),
    prisma.protocol.findMany({ where: { isActive: true }, include: { addOns: { include: { addOn: true } } } }),
    prisma.addOn.findMany({ include: { protocols: { include: { protocol: true } } } }),
    prisma.commissionRule.findMany({ where: { calcType: "PERCENTAGE", role: null } }),
    prisma.setting.findMany({ where: { key: { in: ["anomaly.discountThresholdPct", "anomaly.refundThresholdMxn"] } } }),
    prisma.appUser.findMany({ include: { locationAssignments: { include: { location: true } } }, orderBy: { name: "asc" } }),
  ]);

  const initialLocations: LocationRecord[] = locations.map((l) => ({
    id: l.id,
    name: l.name,
    address: l.address,
    isActive: l.isActive,
    rentCost: l.rentCostMxn,
    maintenanceCost: l.maintenanceCostMxn,
    rooms: l.rooms.map((r) => ({ id: r.id, name: r.name })),
  }));

  const initialProtocols: ProtocolRecord[] = protocols.map((p) => ({
    id: p.id,
    name: p.name,
    tier: TIER_FROM_DB[p.tier],
    duration: p.durationMin,
    price: p.priceMxn,
    cost: p.costMxn,
  }));

  const initialAddOns: AddOnRecord[] = addOns.map((a) => ({
    id: a.id,
    name: a.name,
    function: a.function,
    extraMinutes: a.extraMinutes,
    availableOn: a.protocols.map((link) => link.protocol.name),
  }));

  const settingNumber = (key: string, fallback: number) => {
    const row = anomalySettings.find((s) => s.key === key);
    return typeof row?.value === "number" ? row.value : fallback;
  };
  const initialBusinessRules: BusinessRules = {
    commissionServicePct: commissionRules.find((r) => r.basis === "SERVICE")?.rateOrAmount ?? 0,
    commissionRetailPct: commissionRules.find((r) => r.basis === "RETAIL")?.rateOrAmount ?? 0,
    anomalyDiscountThresholdPct: settingNumber("anomaly.discountThresholdPct", 15),
    anomalyRefundThresholdMXN: settingNumber("anomaly.refundThresholdMxn", 1500),
  };

  const initialRoster: StaffMember[] = staff.map((s) => {
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

  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${prata.variable} ${beauRivage.variable} h-full scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="min-h-full flex flex-col">
        <LoadingCurtain />
        <LocationsProvider initialLocations={initialLocations}>
          <PeriodProvider>
            <CompareProvider>
              <ProtocolsProvider initialProtocols={initialProtocols}>
                <AddOnsProvider addOns={initialAddOns}>
                  <StaffRosterProvider initialRoster={initialRoster}>
                    <ClientBookingProvider>
                      <BusinessRulesProvider initialRules={initialBusinessRules}>{children}</BusinessRulesProvider>
                    </ClientBookingProvider>
                  </StaffRosterProvider>
                </AddOnsProvider>
              </ProtocolsProvider>
            </CompareProvider>
          </PeriodProvider>
        </LocationsProvider>
      </body>
    </html>
  );
}
