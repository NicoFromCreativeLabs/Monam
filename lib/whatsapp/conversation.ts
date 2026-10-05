import "server-only";
import { prisma } from "@/lib/prisma";
import type { WhatsAppBookingStep } from "@/lib/generated/prisma/client";
import {
  insertAppointment,
  findClientByPhone,
  findOrCreateClientByPhone,
  createPendingDepositCheckout,
  DEPOSIT_AMOUNT_MXN,
} from "@/lib/booking-core";
import { STRIPE_ENABLED } from "@/lib/feature-flags";

// The WhatsApp booking bot (spec §11.1 "highest priority" integration,
// §8.2's booking engine reused via lib/booking-core.ts). A short, numbered-
// menu conversation rather than free-text NLP — WhatsApp users are typing
// on a phone keyboard, and a wrong guess at "what did they mean" is worse
// than asking them to reply "1" or "2". One row per phone number in
// WhatsAppConversation carries the in-progress draft between messages,
// since each inbound webhook call is a fresh, stateless request.

interface BookingDraft {
  locationName?: string;
  durationTier?: "Targeted" | "Signature";
  protocolName?: string | null;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  name?: string;
}

const CANCEL_WORDS = ["cancelar", "cancel", "salir", "no"];

function normalize(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, ""); // strip accents so "sábado"/"sabado" both match
}

// Picks a numbered-list reply ("1", "2", …) or an exact-ish name match.
function matchOption<T extends { label: string }>(text: string, options: T[]): T | null {
  const t = normalize(text);
  const asIndex = Number(t);
  if (Number.isInteger(asIndex) && asIndex >= 1 && asIndex <= options.length) {
    return options[asIndex - 1];
  }
  return options.find((o) => normalize(o.label).includes(t) || t.includes(normalize(o.label))) ?? null;
}

function listMessage(title: string, options: { label: string }[]) {
  return [title, ...options.map((o, i) => `${i + 1}. ${o.label}`)].join("\n");
}

// Accepts "hoy", "mañana", "DD/MM", "DD/MM/YYYY", or "YYYY-MM-DD". No
// natural-language date parsing beyond that — same reasoning as the
// numbered menus above.
function parseDate(text: string): string | null {
  const t = normalize(text);
  const today = new Date();
  if (t === "hoy" || t === "today") return today.toISOString().slice(0, 10);
  if (t === "manana" || t === "tomorrow") {
    const d = new Date(today);
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  const isoMatch = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return t;
  const dmyMatch = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = y ?? String(today.getFullYear());
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

function parseTime(text: string): string | null {
  const t = normalize(text).replace(/\s+/g, "");
  const match = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!match) return null;
  const [, hStr, mStr, ampm] = match;
  let h = Number(hStr);
  const m = mStr ? Number(mStr) : 0;
  if (ampm === "pm" && h < 12) h += 12;
  if (ampm === "am" && h === 12) h = 0;
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

async function getActiveLocations() {
  return prisma.location.findMany({ where: { isActive: true }, orderBy: { createdAt: "asc" } });
}

async function getSignatureProtocols() {
  return prisma.protocol.findMany({ where: { tier: "SIGNATURE", isActive: true }, orderBy: { name: "asc" } });
}

export interface ConversationResult {
  reply: string;
}

export async function handleIncomingMessage(phone: string, text: string): Promise<ConversationResult> {
  const existingClient = await findClientByPhone(phone);

  let convo = await prisma.whatsAppConversation.findUnique({ where: { phone } });
  const normalizedText = normalize(text);

  if (CANCEL_WORDS.includes(normalizedText) && convo) {
    await prisma.whatsAppConversation.delete({ where: { phone } }).catch(() => {});
    return { reply: "Listo, cancelé la reserva en curso. Escribe \"cita\" cuando quieras empezar de nuevo." };
  }

  if (!convo || convo.step === "DONE") {
    convo = await prisma.whatsAppConversation.upsert({
      where: { phone },
      create: { phone, step: "AWAITING_LOCATION", draft: {}, clientId: existingClient?.id },
      update: { step: "AWAITING_LOCATION", draft: {}, clientId: existingClient?.id },
    });
    const locations = await getActiveLocations();
    if (locations.length === 0) {
      return { reply: "En este momento no hay sucursales disponibles para reservar. Intenta más tarde." };
    }
    if (locations.length === 1) {
      return advanceAfterLocation(phone, locations[0].name);
    }
    return {
      reply: listMessage(
        "¡Hola! Vamos a agendar tu cita 💆\n¿En qué sucursal?",
        locations.map((l) => ({ label: l.name })),
      ),
    };
  }

  const draft = (convo.draft ?? {}) as BookingDraft;

  switch (convo.step) {
    case "AWAITING_LOCATION": {
      const locations = await getActiveLocations();
      const picked = matchOption(
        text,
        locations.map((l) => ({ label: l.name })),
      );
      if (!picked) {
        return {
          reply: listMessage("No reconocí esa sucursal. Elige una opción:", locations.map((l) => ({ label: l.name }))),
        };
      }
      return advanceAfterLocation(phone, picked.label);
    }

    case "AWAITING_TIER": {
      const options = [{ label: "Targeted (30 min)" }, { label: "Signature (60 min)" }];
      const picked = matchOption(text, options);
      if (!picked) {
        return { reply: listMessage("No entendí. ¿Qué duración prefieres?", options) };
      }
      const tier: "Targeted" | "Signature" = picked.label.startsWith("Signature") ? "Signature" : "Targeted";
      if (tier === "Targeted") {
        return advanceToDate(phone, { ...draft, durationTier: "Targeted", protocolName: null });
      }
      const protocols = await getSignatureProtocols();
      await updateConvo(phone, "AWAITING_PROTOCOL", { ...draft, durationTier: "Signature" });
      return {
        reply: listMessage(
          "¿Qué facial Signature te gustaría?",
          protocols.map((p) => ({ label: `${p.name} · $${p.priceMxn} MXN` })),
        ),
      };
    }

    case "AWAITING_PROTOCOL": {
      const protocols = await getSignatureProtocols();
      const picked = matchOption(
        text,
        protocols.map((p) => ({ label: p.name })),
      );
      if (!picked) {
        return {
          reply: listMessage("No reconocí ese protocolo. Elige una opción:", protocols.map((p) => ({ label: p.name }))),
        };
      }
      return advanceToDate(phone, { ...draft, protocolName: picked.label });
    }

    case "AWAITING_DATE": {
      const date = parseDate(text);
      if (!date) {
        return { reply: "No entendí la fecha. Escribe \"hoy\", \"mañana\", o una fecha como 15/10." };
      }
      await updateConvo(phone, "AWAITING_TIME", { ...draft, date });
      return { reply: "¿A qué hora? (ej. 10:00 o 2pm)" };
    }

    case "AWAITING_TIME": {
      const time = parseTime(text);
      if (!time) {
        return { reply: "No entendí la hora. Escribe algo como 10:00 o 2pm." };
      }
      const nextDraft = { ...draft, time };
      if (existingClient) {
        await updateConvo(phone, "AWAITING_CONFIRM", nextDraft);
        return { reply: confirmMessage(nextDraft) };
      }
      await updateConvo(phone, "AWAITING_NAME", nextDraft);
      return { reply: "¿Cuál es tu nombre completo?" };
    }

    case "AWAITING_NAME": {
      const name = text.trim();
      if (name.length < 2) {
        return { reply: "¿Cuál es tu nombre completo?" };
      }
      const nextDraft = { ...draft, name };
      await updateConvo(phone, "AWAITING_CONFIRM", nextDraft);
      return { reply: confirmMessage(nextDraft) };
    }

    case "AWAITING_CONFIRM": {
      if (!["si", "sí", "confirmar", "confirmo", "yes"].includes(normalizedText)) {
        return { reply: "Responde \"sí\" para confirmar, o \"cancelar\" para empezar de nuevo." };
      }
      return finalizeBooking(phone, draft, existingClient?.id);
    }

    default:
      await prisma.whatsAppConversation.delete({ where: { phone } }).catch(() => {});
      return { reply: "Algo salió mal. Escribe \"cita\" para empezar de nuevo." };
  }
}

async function updateConvo(phone: string, step: WhatsAppBookingStep, draft: BookingDraft) {
  await prisma.whatsAppConversation.update({
    where: { phone },
    data: { step, draft: draft as object },
  });
}

async function advanceAfterLocation(phone: string, locationName: string): Promise<ConversationResult> {
  await updateConvo(phone, "AWAITING_TIER", { locationName });
  return {
    reply: listMessage("¿Qué duración prefieres?", [{ label: "Targeted (30 min)" }, { label: "Signature (60 min)" }]),
  };
}

async function advanceToDate(phone: string, draft: BookingDraft): Promise<ConversationResult> {
  await updateConvo(phone, "AWAITING_DATE", draft);
  return { reply: "¿Qué día te gustaría venir? (ej. mañana, o 15/10)" };
}

function confirmMessage(draft: BookingDraft): string {
  const lines = [
    "Confirma tu cita:",
    `📍 ${draft.locationName}`,
    `🕐 ${draft.durationTier} ${draft.protocolName ? `— ${draft.protocolName}` : ""}`.trim(),
    `📅 ${draft.date} ${draft.time}`,
  ];
  if (draft.durationTier === "Signature") {
    lines.push(`Se requiere un depósito de $${DEPOSIT_AMOUNT_MXN} MXN para confirmar.`);
  }
  lines.push('Responde "sí" para confirmar, o "cancelar".');
  return lines.join("\n");
}

async function finalizeBooking(
  phone: string,
  draft: BookingDraft,
  existingClientId: string | undefined,
): Promise<ConversationResult> {
  if (!draft.locationName || !draft.durationTier || !draft.date || !draft.time) {
    await prisma.whatsAppConversation.delete({ where: { phone } }).catch(() => {});
    return { reply: "Algo salió mal con tu reserva. Escribe \"cita\" para intentar de nuevo." };
  }

  const client = existingClientId
    ? await prisma.client.findUnique({ where: { id: existingClientId } })
    : await findOrCreateClientByPhone(phone, draft.name ?? "Cliente WhatsApp");
  if (!client) {
    return { reply: "No encontramos tu perfil. Escribe \"cita\" para intentar de nuevo." };
  }

  await prisma.whatsAppConversation.update({ where: { phone }, data: { step: "DONE", clientId: client.id } });

  const bookingInput = {
    locationName: draft.locationName,
    date: draft.date,
    time: draft.time,
    durationTier: draft.durationTier,
    protocolName: draft.protocolName ?? null,
  };

  // Signature requires a deposit — if Stripe is wired up, collect it for
  // real before the slot is reserved; otherwise fall back to today's
  // manual behavior (a HELD deposit with no real charge yet, same as every
  // other booking entry point until a processor is configured).
  if (draft.durationTier === "Signature" && STRIPE_ENABLED) {
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://monamskinstudio.com";
    const checkout = await createPendingDepositCheckout(
      { ...bookingInput, clientId: client.id },
      { successUrl: `${origin}/my`, cancelUrl: `${origin}/my/book` },
    );
    if ("error" in checkout) return { reply: `No pudimos generar tu link de pago: ${checkout.error}` };
    return {
      reply: `Para confirmar tu cita, paga el depósito aquí:\n${checkout.checkoutUrl}\n\nTu cita se reserva en cuanto el pago se confirme.`,
    };
  }

  let depositId: string | undefined;
  if (draft.durationTier === "Signature") {
    const deposit = await prisma.deposit.create({
      data: { clientId: client.id, amountMxn: DEPOSIT_AMOUNT_MXN, status: "HELD" },
    });
    depositId = deposit.id;
  }

  const result = await insertAppointment({ ...bookingInput, clientId: client.id, depositId });
  if ("error" in result) {
    return { reply: `${result.error}\nEscribe "cita" para elegir otro horario.` };
  }
  return { reply: "¡Listo! Tu cita quedó confirmada. Te esperamos 💆" };
}
