import type { Metadata } from "next";
import { Fraunces, Inter, Prata, Beau_Rivage } from "next/font/google";
import { LocationsProvider } from "@/components/panel/LocationsContext";
import { ProtocolsProvider } from "@/components/panel/ProtocolsContext";
import { PanelAlertsProvider } from "@/components/panel/PanelAlertsContext";
import { StaffRosterProvider } from "@/components/panel/StaffRosterContext";
import { ClientBookingProvider } from "@/components/panel/ClientBookingContext";
import { ApprovalsProvider } from "@/components/panel/ApprovalsContext";
import { BusinessRulesProvider } from "@/components/panel/BusinessRulesContext";
import { AnomaliesProvider } from "@/components/panel/AnomaliesContext";
import { PendingCheckoutsProvider } from "@/components/panel/PendingCheckoutsContext";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${fraunces.variable} ${inter.variable} ${prata.variable} ${beauRivage.variable} h-full scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="min-h-full flex flex-col">
        <LoadingCurtain />
        <LocationsProvider>
          <ProtocolsProvider>
            <StaffRosterProvider>
              <PanelAlertsProvider>
                <ClientBookingProvider>
                  <BusinessRulesProvider>
                    <AnomaliesProvider>
                      <ApprovalsProvider>
                        <PendingCheckoutsProvider>{children}</PendingCheckoutsProvider>
                      </ApprovalsProvider>
                    </AnomaliesProvider>
                  </BusinessRulesProvider>
                </ClientBookingProvider>
              </PanelAlertsProvider>
            </StaffRosterProvider>
          </ProtocolsProvider>
        </LocationsProvider>
      </body>
    </html>
  );
}
