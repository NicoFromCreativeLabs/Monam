// Rules of the discount codes — pure (no database, no clock of its own), shared
// by the server actions, the pages and the tests. A code is checked again on the
// server every time; nothing the browser says about a discount is trusted.

export type DiscountCodeKind = "PERCENT" | "AMOUNT" | "FREE_ADD_ON" | "FREE_PRODUCT";
export type DiscountScope = "ALL" | "SERVICES" | "PRODUCTS";
export type DiscountMode = "CHECKOUT" | "ACCOUNT";
export type AccountGrant = "SIGNUP" | "CLAIM";

export interface DiscountCodeRule {
  code: string;
  name: string;
  kind: DiscountCodeKind;
  value: number;
  scope: DiscountScope;
  mode: DiscountMode;
  accountGrant: AccountGrant | null;
  addOnId: string | null;
  productSku: string | null;
  validFrom: Date | null;
  validUntil: Date | null;
  claimUntil: Date | null;
  maxUses: number | null; // CHECKOUT: total uses. ACCOUNT + CLAIM: total claims
  onePerClient: boolean;
  isActive: boolean;
}

// What is on the ticket, in pesos.
export interface TicketContext {
  now: Date;
  usesSoFar: number; // redemptions of this code so far
  clientUsesSoFar: number; // redemptions of this code by this client
  hasClient: boolean;
  // ACCOUNT codes: whether this client has the discount in her account, and if
  // she already used it.
  claim: { exists: boolean; used: boolean };
  servicePrice: number;
  addOns: { addOnId: string; price: number }[];
  retail: { sku: string; price: number; qty: number }[];
}

export type CodeEvaluation = { ok: true; amountMxn: number; summary: string } | { ok: false; error: string };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I

// "monam15", "  MONAM-15 ", or a scanned "https://monam.mx/d/MONAM15?x=1" → "MONAM15".
export function normalizeCode(raw: string): string {
  let t = raw.trim();
  const fromUrl = t.match(/\/d\/([^/?#\s]+)/i);
  if (fromUrl) t = fromUrl[1];
  return t.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export function suggestCode(random: () => number = Math.random): string {
  let out = "MONAM-";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)];
  return out;
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]{2,39}$/.test(code);
}

export function discountSummary(rule: Pick<DiscountCodeRule, "kind" | "value" | "scope" | "addOnId" | "productSku">): string {
  const scope = rule.scope === "SERVICES" ? " en servicios" : rule.scope === "PRODUCTS" ? " en productos" : "";
  switch (rule.kind) {
    case "PERCENT":
      return `${rule.value}% de descuento${scope}`;
    case "AMOUNT":
      return `$${rule.value} MXN de descuento${scope}`;
    case "FREE_ADD_ON":
      return "Add-on de cortesía";
    case "FREE_PRODUCT":
      return "Producto de cortesía";
  }
}

// Whether the code can be used right now and what it takes off this ticket.
export function evaluateCode(rule: DiscountCodeRule, ctx: TicketContext): CodeEvaluation {
  if (!rule.isActive) return { ok: false, error: "Este código está desactivado." };
  if (rule.validFrom && ctx.now < rule.validFrom) return { ok: false, error: "Este código todavía no es válido." };
  if (rule.validUntil && ctx.now > rule.validUntil) return { ok: false, error: "Este código ya venció." };
  if (rule.mode === "ACCOUNT") {
    // Lives in the client's account: she must have it, and it is used once.
    if (!ctx.hasClient) {
      return { ok: false, error: "Este descuento está en la cuenta de la clienta: cobra desde su cita para identificarla." };
    }
    if (!ctx.claim.exists) return { ok: false, error: "Esta clienta no tiene este descuento en su cuenta." };
    if (ctx.claim.used) return { ok: false, error: "Esta clienta ya usó este descuento." };
  } else if (rule.maxUses !== null && ctx.usesSoFar >= rule.maxUses) {
    return { ok: false, error: "Este código ya se agotó." };
  }
  if (rule.mode === "CHECKOUT" && rule.onePerClient) {
    if (!ctx.hasClient) {
      return { ok: false, error: "Este código es de un solo uso por clienta: cobra desde la cita para identificarla." };
    }
    if (ctx.clientUsesSoFar > 0) return { ok: false, error: "Esta clienta ya usó este código." };
  }

  const servicesBase = ctx.servicePrice + ctx.addOns.reduce((s, a) => s + a.price, 0);
  const productsBase = ctx.retail.reduce((s, r) => s + r.price * r.qty, 0);

  let amount = 0;
  if (rule.kind === "PERCENT" || rule.kind === "AMOUNT") {
    const base = rule.scope === "SERVICES" ? servicesBase : rule.scope === "PRODUCTS" ? productsBase : servicesBase + productsBase;
    if (base <= 0) {
      return {
        ok: false,
        error:
          rule.scope === "PRODUCTS"
            ? "Este código aplica a productos y no hay ninguno en el ticket."
            : rule.scope === "SERVICES"
              ? "Este código aplica a servicios y no hay ninguno en el ticket."
              : "No hay nada en el ticket a lo que aplicar el código.",
      };
    }
    amount = rule.kind === "PERCENT" ? Math.round((base * rule.value) / 100) : Math.min(rule.value, base);
  } else if (rule.kind === "FREE_ADD_ON") {
    const line = ctx.addOns.find((a) => a.addOnId === rule.addOnId);
    if (!line) return { ok: false, error: "Este código regala un add-on que no está en esta cita." };
    amount = line.price;
  } else {
    const line = ctx.retail.find((r) => r.sku === rule.productSku && r.qty > 0);
    if (!line) return { ok: false, error: "Este código regala un producto que no está en el ticket." };
    amount = line.price;
  }

  if (amount <= 0) return { ok: false, error: "Este código no descuenta nada en este ticket." };
  return { ok: true, amountMxn: amount, summary: discountSummary(rule) };
}

// Checks the data of a code someone is creating; returns an error message or null.
export function validateNewCode(input: {
  code: string;
  name: string;
  kind: DiscountCodeKind;
  value: number;
  addOnId?: string | null;
  productSku?: string | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  maxUses?: number | null;
  mode?: DiscountMode;
  accountGrant?: AccountGrant | null;
  claimUntil?: Date | null;
}): string | null {
  if (!isValidCode(input.code)) return "El código debe tener de 3 a 40 letras, números o guiones.";
  if (input.name.trim().length < 2) return "Ponle un nombre al descuento.";
  if (input.kind === "PERCENT" && !(Number.isInteger(input.value) && input.value >= 1 && input.value <= 100)) {
    return "El porcentaje debe estar entre 1 y 100.";
  }
  if (input.kind === "AMOUNT" && !(Number.isInteger(input.value) && input.value >= 1)) {
    return "El monto debe ser un número de pesos mayor a 0.";
  }
  if (input.kind === "FREE_ADD_ON" && !input.addOnId) return "Elige el add-on de cortesía.";
  if (input.kind === "FREE_PRODUCT" && !input.productSku) return "Elige el producto de cortesía.";
  if (input.mode === "ACCOUNT" && !input.accountGrant) return "Elige cómo llega el descuento a la cuenta.";
  if (input.claimUntil && input.validUntil && input.claimUntil > input.validUntil) {
    return "El periodo para reclamarlo no puede terminar después de la fecha límite de uso.";
  }
  if (input.validFrom && input.validUntil && input.validUntil < input.validFrom) {
    return "La fecha de fin debe ser posterior a la de inicio.";
  }
  if (input.maxUses !== null && input.maxUses !== undefined && !(Number.isInteger(input.maxUses) && input.maxUses >= 1)) {
    return "El máximo de usos debe ser 1 o más.";
  }
  return null;
}

export const MODE_LABEL: Record<"CHECKOUT" | "SIGNUP" | "CLAIM", string> = {
  CHECKOUT: "QR en caja · recurrente",
  SIGNUP: "Cuenta nueva · una vez por cuenta",
  CLAIM: "Se reclama en la cuenta · una vez por cuenta",
};

export function modeKey(rule: Pick<DiscountCodeRule, "mode" | "accountGrant">): "CHECKOUT" | "SIGNUP" | "CLAIM" {
  if (rule.mode === "CHECKOUT") return "CHECKOUT";
  return rule.accountGrant === "SIGNUP" ? "SIGNUP" : "CLAIM";
}

// Can this client claim an account discount right now (it shows up in her account
// as "Reclamar")? Pure; the server checks it again on the claim.
export function claimCheck(
  rule: DiscountCodeRule,
  ctx: { now: Date; claimsSoFar: number; alreadyClaimed: boolean },
): { ok: true } | { ok: false; error: string } {
  if (rule.mode !== "ACCOUNT" || rule.accountGrant !== "CLAIM") return { ok: false, error: "Este descuento no se reclama." };
  if (!rule.isActive) return { ok: false, error: "Este descuento ya no está disponible." };
  if (ctx.alreadyClaimed) return { ok: false, error: "Ya lo reclamaste." };
  if (rule.validFrom && ctx.now < rule.validFrom) return { ok: false, error: "Todavía no se puede reclamar." };
  const lastDay = rule.claimUntil ?? rule.validUntil;
  if (lastDay && ctx.now > lastDay) return { ok: false, error: "El periodo para reclamarlo terminó." };
  if (rule.maxUses !== null && ctx.claimsSoFar >= rule.maxUses) return { ok: false, error: "Ya se agotaron." };
  return { ok: true };
}

// Is this a launch discount that a brand-new account gets automatically?
export function grantsOnSignup(rule: DiscountCodeRule, ctx: { now: Date; claimsSoFar: number }): boolean {
  if (rule.mode !== "ACCOUNT" || rule.accountGrant !== "SIGNUP" || !rule.isActive) return false;
  if (rule.validFrom && ctx.now < rule.validFrom) return false;
  if (rule.validUntil && ctx.now > rule.validUntil) return false;
  if (rule.maxUses !== null && ctx.claimsSoFar >= rule.maxUses) return false;
  return true;
}
