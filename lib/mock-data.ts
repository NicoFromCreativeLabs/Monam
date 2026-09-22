// Static mock fixtures for the UI-first build pass — no backend yet.
// Shapes are drawn directly from the data model design in the implementation
// plan (Phase 0/2/4/5/6 models) so wiring real data later is a drop-in swap.

// Seed data only — components read live location state (including
// isActive) from LocationsContext, not this array directly, so that
// activating Prado Norte in Settings is reflected everywhere (location
// switcher, booking flow, staff assignment) without a page reload.
export const LOCATIONS = [
  { id: "roma-norte", name: "Roma Norte", address: "Durango 258, Roma Norte, CDMX", isActive: true },
  { id: "prado-norte", name: "Prado Norte", address: "Av. Prado Norte 440, Lomas de Chapultepec, CDMX", isActive: false },
];

// `role` here is a display label (Spanish-first UI, spec §13), not the
// internal role/permission key — see StaffRole in StaffRoleContext.tsx for
// the English discriminant used in comparisons/logic.
export const OWNER = {
  name: "Emiliano Alvear Ocampo",
  role: "Admin" as const,
  email: "emiliano@monamskinstudio.com",
  phone: "+52 55 1111 2222",
};
export const FRONT_DESK_STAFF = {
  name: "Camila Ruiz",
  role: "Recepción" as const,
  email: "camila@monamskinstudio.com",
  phone: "+52 55 2222 3333",
  location: "Roma Norte",
};
export const ESTHETICIAN_STAFF = {
  name: "Ana Torres",
  role: "Esteticista" as const,
  email: "ana@monamskinstudio.com",
  phone: "+52 55 3333 4444",
  location: "Roma Norte",
};
export const CLIENT = {
  name: "Valentina Reyes",
  role: "Cliente" as const,
  email: "valentina.reyes@example.com",
  phone: "+52 55 3456 7890",
};

export const DASHBOARD_REVENUE = [
  { location: "Roma Norte", yesterday: 18400, today: 9200 },
  { location: "Prado Norte", yesterday: 0, today: 0 },
];

export const OCCUPANCY_7D = [
  { day: "Lun", roomsBooked: 6, roomsTotal: 4 * 7 },
  { day: "Mar", roomsBooked: 14, roomsTotal: 28 },
  { day: "Mié", roomsBooked: 19, roomsTotal: 28 },
  { day: "Jue", roomsBooked: 11, roomsTotal: 28 },
  { day: "Vie", roomsBooked: 22, roomsTotal: 28 },
  { day: "Sáb", roomsBooked: 25, roomsTotal: 28 },
  { day: "Dom", roomsBooked: 0, roomsTotal: 0 },
];

export const RETAIL_ATTACH_RATE = 0.34;
export const EXPRESS_SIGNATURE_MIX = { express: 0.58, signature: 0.42 };

export const LOW_STOCK_ALERTS = [
  { product: "SKIN1004 Centella Ampoule", ledger: "Backbar", location: "Roma Norte", qty: 2, par: 8 },
  { product: "Beauty of Joseon Sunscreen", ledger: "Retail", location: "Roma Norte", qty: 3, par: 10 },
  { product: "Anua Heartleaf Toner", ledger: "Backbar", location: "Roma Norte", qty: 1, par: 6 },
];

export const PENDING_APPROVALS = [
  { id: "apr-1", type: "Descuento", requestedBy: "Camila Ruiz", amount: "15%", client: "Sofía Marín", location: "Roma Norte" },
  { id: "apr-2", type: "Reembolso", requestedBy: "Camila Ruiz", amount: "$1,900 MXN", client: "Renata Lugo", location: "Roma Norte" },
];

export const PROTOCOL_RETAIL_LINK = [
  { protocol: "Glow", topProduct: "Beauty of Joseon Glow Serum", attachRate: 0.41 },
  { protocol: "Purify", topProduct: "Anua Heartleaf Toner", attachRate: 0.37 },
  { protocol: "Calm", topProduct: "SKIN1004 Centella Cream", attachRate: 0.29 },
];

export type AppointmentStatus = "Registrado" | "Esperando" | "Retrasado" | "Confirmado";
export type AppointmentTier = "Express" | "Signature";

export interface TodayAppointment {
  id: string;
  time: string;
  client: string;
  tier: AppointmentTier;
  room: string;
  esthetician: string;
  status: AppointmentStatus;
  flags: string[];
}

export const TODAY_APPOINTMENTS: TodayAppointment[] = [
  {
    id: "apt-1",
    time: "09:00",
    client: "Sofía Marín",
    tier: "Signature",
    room: "Sala 1",
    esthetician: "Ana Torres",
    status: "Registrado",
    flags: ["Primera visita"],
  },
  {
    id: "apt-2",
    time: "09:30",
    client: "Renata Lugo",
    tier: "Express",
    room: "Sala 2",
    esthetician: "Ana Torres",
    status: "Esperando",
    flags: ["Alergia: Compositae"],
  },
  {
    id: "apt-3",
    time: "10:30",
    client: "Valentina Reyes",
    tier: "Signature",
    room: "Sala 1",
    esthetician: "Ana Torres",
    status: "Retrasado",
    flags: [],
  },
  {
    id: "apt-4",
    time: "11:30",
    client: "Camila Fuentes",
    tier: "Express",
    room: "Sala 3",
    esthetician: "Ana Torres",
    status: "Confirmado",
    flags: ["Paquete: 2 sesiones restantes"],
  },
];

export const CLIENT_SKIN_ID_PREVIEW = {
  skinType: "Mixta",
  allergies: ["Compositae"],
  medications: [] as string[],
  preferredEsthetician: "Ana Torres",
  beverage: "Té de manzanilla (sin Compositae — confirmar alternativa)",
  lastTreatment: "Glow — hace 3 semanas",
};

export const CLIENT_UPCOMING_APPOINTMENT = {
  date: "2026-09-28",
  time: "11:00",
  location: "Roma Norte",
  protocolTier: "Signature (60 min)",
  depositPaid: true,
};

export const CLIENT_PACKAGE_BALANCE = {
  name: "Pack Glow x5",
  sessionsRemaining: 2,
  expiresOn: "2026-12-15",
};

// ---------------------------------------------------------------------------
// Protocols (spec §0/§5.2 — the corrected real 8-protocol menu)
// ---------------------------------------------------------------------------
// `cost` = backbar product cost per treatment (COGS only — excludes labor,
// commission, rent). Feeds the per-protocol margin view on /admin/financials,
// which the client called out as unusually important to their blended
// margin (Express vs. Signature mix, spec §6.3).
export const PROTOCOLS = [
  { name: "Reset", tier: "Express" as const, duration: 30, price: 850, cost: 210 },
  { name: "Calm", tier: "Express" as const, duration: 30, price: 850, cost: 195 },
  { name: "Purify", tier: "Express" as const, duration: 30, price: 850, cost: 225 },
  { name: "Glow", tier: "Express" as const, duration: 30, price: 850, cost: 240 },
  { name: "Glow+", tier: "Signature" as const, duration: 60, price: 1900, cost: 410 },
  { name: "Purify+", tier: "Signature" as const, duration: 60, price: 1900, cost: 460 },
  { name: "Lift", tier: "Signature" as const, duration: 60, price: 1900, cost: 520 },
  { name: "Calm+", tier: "Signature" as const, duration: 60, price: 1900, cost: 380 },
];

// Times performed this period, feeding revenue/margin-per-protocol (spec §6.3).
export const PROTOCOL_PERFORMANCE = [
  { protocol: "Reset", tier: "Express" as const, timesPerformed: 14, revenue: 11900, cost: 2940 },
  { protocol: "Calm", tier: "Express" as const, timesPerformed: 11, revenue: 9350, cost: 2145 },
  { protocol: "Purify", tier: "Express" as const, timesPerformed: 9, revenue: 7650, cost: 2025 },
  { protocol: "Glow", tier: "Express" as const, timesPerformed: 14, revenue: 11900, cost: 3360 },
  { protocol: "Glow+", tier: "Signature" as const, timesPerformed: 12, revenue: 22800, cost: 4920 },
  { protocol: "Purify+", tier: "Signature" as const, timesPerformed: 8, revenue: 15200, cost: 3680 },
  { protocol: "Lift", tier: "Signature" as const, timesPerformed: 7, revenue: 13300, cost: 3640 },
  { protocol: "Calm+", tier: "Signature" as const, timesPerformed: 9, revenue: 17100, cost: 3420 },
];

// ---------------------------------------------------------------------------
// Admin — Calendar
// ---------------------------------------------------------------------------
export const CALENDAR_ROOMS = ["Sala 1", "Sala 2", "Sala 3", "Sala 4 (LED)"];

export const CALENDAR_APPOINTMENTS = [
  { id: "cal-1", room: "Sala 1", start: 9, span: 1, client: "Sofía Marín", esthetician: "Ana Torres", tier: "Signature" as const },
  { id: "cal-2", room: "Sala 2", start: 9.5, span: 0.5, client: "Renata Lugo", esthetician: "Ana Torres", tier: "Express" as const },
  { id: "cal-3", room: "Sala 1", start: 10.5, span: 1, client: "Valentina Reyes", esthetician: "Ana Torres", tier: "Signature" as const },
  { id: "cal-4", room: "Sala 3", start: 11.5, span: 0.5, client: "Camila Fuentes", esthetician: "Diana Cruz", tier: "Express" as const },
  { id: "cal-5", room: "Sala 4 (LED)", start: 12, span: 0.5, client: "Renata Lugo", esthetician: "Diana Cruz", tier: "Express" as const },
  { id: "cal-6", room: "Sala 2", start: 13, span: 1, client: "Mariana Solís", esthetician: "Ana Torres", tier: "Signature" as const },
];
export const CALENDAR_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17];

// ---------------------------------------------------------------------------
// Admin — Clients directory + one full detail record
// ---------------------------------------------------------------------------
export const CLIENTS_LIST = [
  { id: "cl-1", name: "Sofía Marín", phone: "+52 55 1234 5678", location: "Roma Norte", skinType: "Grasa", lastVisit: "2026-09-21", flags: ["Primera visita"] },
  { id: "cl-2", name: "Renata Lugo", phone: "+52 55 2345 6789", location: "Roma Norte", skinType: "Sensible", lastVisit: "2026-09-21", flags: ["Alergia: Compositae"] },
  { id: "cl-3", name: "Valentina Reyes", phone: "+52 55 3456 7890", location: "Roma Norte", skinType: "Mixta", lastVisit: "2026-09-21", flags: [] },
  { id: "cl-4", name: "Camila Fuentes", phone: "+52 55 4567 8901", location: "Roma Norte", skinType: "Seca", lastVisit: "2026-09-14", flags: ["Pack activo"] },
  { id: "cl-5", name: "Mariana Solís", phone: "+52 55 5678 9012", location: "Roma Norte", skinType: "Normal", lastVisit: "2026-08-30", flags: [] },
  { id: "cl-6", name: "Daniela Ponce", phone: "+52 55 6789 0123", location: "Roma Norte", skinType: "Grasa", lastVisit: "2026-08-12", flags: ["Retinoide tópico"] },
];

export const CLIENT_DETAIL = {
  id: "cl-3",
  name: "Valentina Reyes",
  phone: "+52 55 3456 7890",
  email: "valentina.reyes@example.com",
  location: "Roma Norte",
  skinId: {
    skinType: "Mixta",
    allergies: ["Compositae"],
    medications: [] as string[],
    pregnancyOrBreastfeeding: false,
    recentProcedures: "Ninguno en los últimos 6 meses",
    sunExposure: "Moderada",
    visitObjective: "Luminosidad e hidratación",
  },
  preferences: {
    preferredEsthetician: "Ana Torres",
    beverage: "Té de manzanilla (sin Compositae — confirmar alternativa)",
    music: "Instrumental, volumen bajo",
    aromatherapy: "Lavanda",
    conversation: "Silencio",
    productsOwned: ["Beauty of Joseon Glow Serum", "Anua Heartleaf Toner"],
    wishlist: ["SKIN1004 Centella Cream"],
  },
  consents: [
    { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-06-02", status: "Vigente" },
    { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-06-02", status: "Vigente" },
    { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-06-02", status: "Vigente" },
  ],
  treatmentHistory: [
    { date: "2026-09-21", protocol: "Glow", esthetician: "Ana Torres", location: "Roma Norte" },
    { date: "2026-08-24", protocol: "Purify", esthetician: "Ana Torres", location: "Roma Norte" },
    { date: "2026-07-20", protocol: "Reset", esthetician: "Ana Torres", location: "Roma Norte" },
  ],
  auditTrail: [
    { user: "Ana Torres", action: "Vio el expediente", timestamp: "2026-09-21 09:58" },
    { user: "Camila Ruiz", action: "Editó preferencias", timestamp: "2026-09-14 10:20" },
  ],
};

// ---------------------------------------------------------------------------
// Admin — Inventory ledgers
// ---------------------------------------------------------------------------
// `cost` = wholesale cost per unit, for retail margin reporting.
export interface RetailInventoryItem {
  sku: string;
  product: string;
  location: string;
  qty: number;
  par: number;
  price: number;
  cost: number;
  expiresOn: string;
}

export const RETAIL_INVENTORY: RetailInventoryItem[] = [
  { sku: "BOJ-GS-30", product: "Beauty of Joseon Glow Serum", location: "Roma Norte", qty: 14, par: 10, price: 620, cost: 260, expiresOn: "2027-03-01" },
  { sku: "BOJ-SC-50", product: "Beauty of Joseon Sunscreen", location: "Roma Norte", qty: 3, par: 10, price: 480, cost: 195, expiresOn: "2027-01-15" },
  { sku: "AN-HT-150", product: "Anua Heartleaf Toner", location: "Roma Norte", qty: 9, par: 8, price: 550, cost: 230, expiresOn: "2027-05-20" },
  { sku: "S1004-CC-50", product: "SKIN1004 Centella Cream", location: "Roma Norte", qty: 11, par: 8, price: 590, cost: 245, expiresOn: "2027-04-10" },
  { sku: "BOJ-GS-30-PN", product: "Beauty of Joseon Glow Serum", location: "Prado Norte", qty: 6, par: 10, price: 620, cost: 260, expiresOn: "2027-06-01" },
];

export interface BackbarInventoryItem {
  sku: string;
  product: string;
  location: string;
  qty: number;
  par: number;
  opensOn: string;
  pao: string;
}

export const BACKBAR_INVENTORY: BackbarInventoryItem[] = [
  { sku: "S1004-CA-30B", product: "SKIN1004 Centella Ampoule", location: "Roma Norte", qty: 2, par: 8, opensOn: "2026-09-01", pao: "6 meses" },
  { sku: "AN-HT-500B", product: "Anua Heartleaf Toner (backbar)", location: "Roma Norte", qty: 1, par: 6, opensOn: "2026-08-15", pao: "12 meses" },
  { sku: "PUR-CS-200B", product: "Purito Centella Serum (backbar)", location: "Roma Norte", qty: 5, par: 6, opensOn: "2026-09-10", pao: "9 meses" },
  { sku: "S1004-CA-30B-PN", product: "SKIN1004 Centella Ampoule", location: "Prado Norte", qty: 4, par: 8, opensOn: "2026-09-18", pao: "6 meses" },
];

// ---------------------------------------------------------------------------
// Admin — Financials
// ---------------------------------------------------------------------------
export const FINANCIALS_SUMMARY = {
  revenueSplit: { service: 0.71, retail: 0.29 },
  averageTicket: 1640,
  rebookingRate: 0.62,
  newVsReturning: { new: 0.31, returning: 0.69 },
  outstandingPrepaidLiability: 84200,
  inventoryValue: 156300,
};

export const REVENUE_BY_CATEGORY = [
  { category: "Servicios — Express", amount: 41200 },
  { category: "Servicios — Signature", amount: 68300 },
  { category: "Retail", amount: 44800 },
  { category: "Paquetes", amount: 19500 },
];

// Gross margin summary — COGS only (backbar product cost for services,
// wholesale cost for retail); excludes labor, commission, and rent, which
// aren't modeled here. Derived from PROTOCOL_PERFORMANCE + a blended
// estimate for retail/paquetes; kept as static figures since this is a
// mock, not a live rollup.
export const MARGIN_SUMMARY = {
  revenue: 173800,
  cogs: 49400,
  grossMargin: 124400,
  grossMarginPct: 0.716,
  serviceCogs: 26130,
  retailCogs: 18800,
  packageCogsEstimate: 4470,
};

// Weekly revenue trend, Roma Norte only (Prado Norte pre-opening — spec §4).
export const WEEKLY_REVENUE_TREND = [
  { week: "Sem 1", revenue: 38500 },
  { week: "Sem 2", revenue: 41200 },
  { week: "Sem 3", revenue: 39800 },
  { week: "Sem 4", revenue: 44100 },
  { week: "Sem 5", revenue: 42600 },
  { week: "Sem 6", revenue: 47300 },
  { week: "Sem 7", revenue: 45900 },
  { week: "Sem 8", revenue: 49800 },
];

// Esthetician occupancy — complements room occupancy on the Dashboard;
// spec §6.3 asks for room/esthetician occupancy, not room only.
export const ESTHETICIAN_OCCUPANCY = [
  { name: "Ana Torres", hoursBooked: 34, hoursAvailable: 40 },
  { name: "Diana Cruz", hoursBooked: 27, hoursAvailable: 40 },
];

// Backbar consumption value this period, alongside on-hand inventory value —
// spec §6.3 asks for "inventory value/consumption", not value alone.
export const INVENTORY_CONSUMPTION = {
  backbarValueConsumed: 26130,
  retailCogsSold: 18800,
};

// ---------------------------------------------------------------------------
// Admin — Commissions
// ---------------------------------------------------------------------------
export const COMMISSION_ENTRIES = [
  { staff: "Ana Torres", role: "Esteticista", period: "Sep 2026", service: 8400, retail: 1200, total: 9600 },
  { staff: "Diana Cruz", role: "Esteticista", period: "Sep 2026", service: 6100, retail: 800, total: 6900 },
  { staff: "Camila Ruiz", role: "Recepción", period: "Sep 2026", service: 0, retail: 2100, total: 2100 },
];

export const ATTRIBUTION_LOG = [
  { id: "attr-1", sale: "Beauty of Joseon Glow Serum → Sofía Marín", defaultTo: "Camila Ruiz", overriddenTo: "Ana Torres", by: "Emiliano Alvear Ocampo", reason: "Recomendación en cabina confirmada por la clienta", date: "2026-09-18" },
];

// ---------------------------------------------------------------------------
// Admin — Staff roster
// ---------------------------------------------------------------------------
export interface StaffMember {
  id: string;
  name: string;
  role: string;
  location: string;
  status: "Activo" | "Inactivo" | "Invitado";
}

export const STAFF_ROSTER: StaffMember[] = [
  { id: "st-1", name: "Emiliano Alvear Ocampo", role: "Admin", location: "Ambas", status: "Activo" },
  { id: "st-2", name: "Juana de las Carreras", role: "Admin", location: "Ambas", status: "Activo" },
  { id: "st-3", name: "Camila Ruiz", role: "Recepción", location: "Roma Norte", status: "Activo" },
  { id: "st-4", name: "Ana Torres", role: "Esteticista", location: "Roma Norte", status: "Activo" },
  { id: "st-5", name: "Diana Cruz", role: "Esteticista", location: "Roma Norte", status: "Activo" },
];

// ---------------------------------------------------------------------------
// Admin — Approvals (full queue) + Audit log + anomaly flags
// ---------------------------------------------------------------------------
export const APPROVALS_QUEUE = [
  { id: "apr-1", type: "Descuento", requestedBy: "Camila Ruiz", amount: "15%", client: "Sofía Marín", date: "2026-09-21", status: "Pendiente" },
  { id: "apr-2", type: "Reembolso", requestedBy: "Camila Ruiz", amount: "$1,900 MXN", client: "Renata Lugo", date: "2026-09-21", status: "Pendiente" },
  { id: "apr-3", type: "Ajuste de inventario", requestedBy: "Ana Torres", amount: "-2 uds. SKIN1004 Centella Ampoule", client: "—", date: "2026-09-20", status: "Aprobado" },
  { id: "apr-4", type: "Cortesía", requestedBy: "Camila Ruiz", amount: "$850 MXN", client: "Daniela Ponce", date: "2026-09-19", status: "Rechazado" },
];

export const AUDIT_LOG = [
  { id: "log-1", actor: "Ana Torres", action: "Vio expediente", entity: "Valentina Reyes", timestamp: "2026-09-21 09:58" },
  { id: "log-2", actor: "Camila Ruiz", action: "Editó preferencias", entity: "Valentina Reyes", timestamp: "2026-09-14 10:20" },
  { id: "log-3", actor: "Emiliano Alvear Ocampo", action: "Anuló transacción", entity: "Venta #4021", timestamp: "2026-09-12 18:03" },
  { id: "log-4", actor: "Camila Ruiz", action: "Intento de exportación (bloqueado)", entity: "Base de clientes", timestamp: "2026-09-10 11:47" },
];

export const ANOMALY_FLAGS = [
  { id: "flag-1", type: "Descuento inusual", detail: "20% aplicado sin aprobación previa", status: "Abierto" },
  { id: "flag-2", type: "Tratamiento sin cobro", detail: "Cita completada sin pago registrado", status: "Abierto" },
  { id: "flag-3", type: "Merma", detail: "Conteo físico por debajo del consumo esperado — Anua Heartleaf Toner", status: "Resuelto" },
];

// ---------------------------------------------------------------------------
// Admin — Settings
// ---------------------------------------------------------------------------
export const SETTINGS = {
  depositRequiredFirstTime: true,
  depositRequiredSignature: true,
  cancellationWindowHours: 24,
  discountApprovalThresholdPct: 10,
};

// ---------------------------------------------------------------------------
// Staff — Check-in queue, Checkout ticket, My Schedule
// ---------------------------------------------------------------------------
export const CHECKIN_QUEUE = TODAY_APPOINTMENTS;

export const CHECKOUT_TICKET = {
  client: "Sofía Marín",
  service: { name: "Glow (Signature)", price: 1900 },
  retailItems: [
    { name: "Beauty of Joseon Glow Serum", price: 620, recommendedBy: "Ana Torres" },
  ],
  depositCredit: -500,
  tip: 200,
};

export const MY_SCHEDULE_WEEK = [
  { day: "Lun", date: "22", appointments: 5 },
  { day: "Mar", date: "23", appointments: 7 },
  { day: "Mié", date: "24", appointments: 6 },
  { day: "Jue", date: "25", appointments: 4 },
  { day: "Vie", date: "26", appointments: 8 },
  { day: "Sáb", date: "27", appointments: 9 },
  { day: "Dom", date: "28", appointments: 0 },
];

// ---------------------------------------------------------------------------
// Cliente — Appointments, purchases, consents, payment methods
// ---------------------------------------------------------------------------
export const CLIENT_APPOINTMENTS_LIST = {
  upcoming: [
    { id: "ca-1", date: "2026-09-28", time: "11:00", location: "Roma Norte", protocolTier: "Signature (60 min)", depositPaid: true },
  ],
  past: [
    { id: "ca-2", date: "2026-09-21", time: "10:30", location: "Roma Norte", protocol: "Glow" },
    { id: "ca-3", date: "2026-08-24", time: "10:00", location: "Roma Norte", protocol: "Purify" },
    { id: "ca-4", date: "2026-07-20", time: "10:00", location: "Roma Norte", protocol: "Reset" },
  ],
};

export const CLIENT_PURCHASES = [
  { date: "2026-09-21", product: "Beauty of Joseon Glow Serum", size: "30 ml", price: 620 },
  { date: "2026-08-24", product: "Anua Heartleaf Toner", size: "150 ml", price: 550 },
];

export const CLIENT_CONSENTS = [
  { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-06-02", revocable: false },
  { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-06-02", revocable: true },
  { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-06-02", revocable: false },
];

export const CLIENT_PAYMENT_METHODS = [
  { id: "pm-1", brand: "Visa", last4: "4242", expiresOn: "08/28" },
];
