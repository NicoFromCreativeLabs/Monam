import type { Metadata } from "next";
import { Fraunces, Inter, Prata, Beau_Rivage } from "next/font/google";
import { LocationsProvider } from "@/components/panel/LocationsContext";
import { ProtocolsProvider } from "@/components/panel/ProtocolsContext";
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

export const metadata: Metadata = {
  title: "MONÂM Skin Studio",
  description: "Wellness Hub · Skincare Studio",
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
          <ProtocolsProvider>{children}</ProtocolsProvider>
        </LocationsProvider>
      </body>
    </html>
  );
}
