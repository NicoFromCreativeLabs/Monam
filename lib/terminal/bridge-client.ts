"use client";

// Browser-side caller for terminal-bridge/server.js — fetch(), not a Server
// Action, because the bridge lives on the shop's LAN, which a Vercel-hosted
// Next.js server can't reach but the staff tablet's own browser can (it's on
// the same network as the PAX A910S). See lib/terminal/redsys-ecr.ts and
// terminal-bridge/README.md for the full picture.

export interface TerminalChargeConfig {
  bridgeUrl: string;
  terminalIp: string;
  terminalPort: number;
  fuc: string;
  terminalId: string;
}

export type TerminalChargeResult =
  | { approved: true; authCode?: string; message: string }
  | { approved: false; message: string };

export async function chargeViaTerminal(
  config: TerminalChargeConfig,
  amountMxn: number,
  ticketId: string,
): Promise<TerminalChargeResult> {
  try {
    const res = await fetch(`${config.bridgeUrl.replace(/\/$/, "")}/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amountMxn,
        ticketId,
        terminalIp: config.terminalIp,
        terminalPort: config.terminalPort,
        fuc: config.fuc,
        terminalId: config.terminalId,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { approved: false, message: data.error ?? "No se pudo cobrar en la terminal." };
    }
    return data.approved
      ? { approved: true, authCode: data.authCode, message: data.message }
      : { approved: false, message: data.message ?? "La terminal rechazó el cobro." };
  } catch {
    return {
      approved: false,
      message: "No se pudo contactar al puente de la terminal. Revisa que esté corriendo en esta red.",
    };
  }
}
