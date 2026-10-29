import type { Metadata } from "next";
import { Fraunces, Inter, Prata, Beau_Rivage } from "next/font/google";
import { LocationsProvider } from "@/components/panel/LocationsContext";
import { PeriodProvider } from "@/components/panel/PeriodContext";
import { CompareProvider } from "@/components/panel/CompareContext";
import { ProtocolsProvider } from "@/components/panel/ProtocolsContext";
import { AddOnsProvider } from "@/components/panel/AddOnsContext";
import { StaffRosterProvider } from "@/components/panel/StaffRosterContext";
import { BusinessRulesProvider } from "@/components/panel/BusinessRulesContext";
import { TerminalSettingsProvider } from "@/components/panel/TerminalSettingsContext";
import { LoadingCurtain } from "@/components/LoadingCurtain";
import { getCatalogData } from "@/lib/catalog-cache";
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

// Catalog data (Locations, Protocols, Add-ons, business rules, staff
// roster) is small, public-ish menu data read on every request regardless
// of panel or auth state — fetched once (and cached: see lib/catalog-cache.ts)
// here and handed to each Context as its initial value, instead of each
// panel re-fetching or reading a frozen mock array. Write paths
// (lib/actions/catalog.ts, addons.ts, settings.ts, staff.ts, profile.ts)
// persist to the same tables and revalidate that cache.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const {
    locations: initialLocations,
    protocols: initialProtocols,
    addOns: initialAddOns,
    businessRules: initialBusinessRules,
    terminalSettingsByLocation: initialTerminalSettingsByLocation,
    roster: initialRoster,
  } = await getCatalogData();

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
                    <BusinessRulesProvider initialRules={initialBusinessRules}>
                      <TerminalSettingsProvider initialSettingsByLocation={initialTerminalSettingsByLocation}>
                        {children}
                      </TerminalSettingsProvider>
                    </BusinessRulesProvider>
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
