"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CLIENT_PACKAGE_BALANCE } from "@/lib/mock-data";

export interface ClientPackageBalance {
  name: string;
  sessionsRemaining: number;
  expiresOn: string;
}

const ClientBookingContext = createContext<{
  packageBalance: ClientPackageBalance;
  purchasePackage: (pack: { name: string; sessions: number }) => void;
} | null>(null);

// Appointments are real Appointment rows now (Booking phase — see
// lib/actions/booking.ts, ClientAppointmentsView.tsx). This Context now only
// holds packageBalance/purchasePackage, pending the Commerce phase's real
// PackagePurchase table.
export function ClientBookingProvider({ children }: { children: ReactNode }) {
  const [packageBalance, setPackageBalance] = useState<ClientPackageBalance>({
    ...CLIENT_PACKAGE_BALANCE,
  });

  function purchasePackage(pack: { name: string; sessions: number }) {
    const expires = new Date();
    expires.setDate(expires.getDate() + 90);
    setPackageBalance({
      name: pack.name,
      sessionsRemaining: pack.sessions,
      expiresOn: expires.toISOString().slice(0, 10),
    });
  }

  return (
    <ClientBookingContext.Provider value={{ packageBalance, purchasePackage }}>
      {children}
    </ClientBookingContext.Provider>
  );
}

export function useClientBooking() {
  const ctx = useContext(ClientBookingContext);
  if (!ctx) throw new Error("useClientBooking must be used within ClientBookingProvider");
  return ctx;
}
