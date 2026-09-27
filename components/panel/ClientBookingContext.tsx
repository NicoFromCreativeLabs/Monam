"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { CLIENT_APPOINTMENTS_LIST, CLIENT_PACKAGE_BALANCE } from "@/lib/mock-data";

export interface ClientAppointment {
  id: string;
  date: string;
  time: string;
  location: string;
  protocolTier: string;
  depositPaid: boolean;
}

export interface ClientPackageBalance {
  name: string;
  sessionsRemaining: number;
  expiresOn: string;
}

const ClientBookingContext = createContext<{
  upcoming: ClientAppointment[];
  addAppointment: (appt: Omit<ClientAppointment, "id">) => void;
  cancelAppointment: (id: string) => void;
  packageBalance: ClientPackageBalance;
  purchasePackage: (pack: { name: string; sessions: number }) => void;
} | null>(null);

// Fixes a real gap the newbie-persona UX pass surfaced: the booking wizard's
// "confirm" step only flipped local component state, so a completed booking
// never showed up anywhere else (not "Próxima cita", not "Mi rutina"), and
// Cancelar/Reagendar/Comprar had no onClick at all. Same pattern as
// LocationsContext/ProtocolsContext — app-wide client-side state so booking,
// "Mi rutina", and "Paquetes" all read and write the same source, instead of
// each holding a frozen copy of the mock data.
export function ClientBookingProvider({ children }: { children: ReactNode }) {
  const [upcoming, setUpcoming] = useState<ClientAppointment[]>(
    CLIENT_APPOINTMENTS_LIST.upcoming.map((a) => ({ ...a })),
  );
  const [packageBalance, setPackageBalance] = useState<ClientPackageBalance>({
    ...CLIENT_PACKAGE_BALANCE,
  });

  function addAppointment(appt: Omit<ClientAppointment, "id">) {
    setUpcoming((prev) => [...prev, { ...appt, id: `ca-${Date.now()}` }]);
  }

  function cancelAppointment(id: string) {
    setUpcoming((prev) => prev.filter((a) => a.id !== id));
  }

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
    <ClientBookingContext.Provider
      value={{ upcoming, addAppointment, cancelAppointment, packageBalance, purchasePackage }}
    >
      {children}
    </ClientBookingContext.Provider>
  );
}

export function useClientBooking() {
  const ctx = useContext(ClientBookingContext);
  if (!ctx) throw new Error("useClientBooking must be used within ClientBookingProvider");
  return ctx;
}
