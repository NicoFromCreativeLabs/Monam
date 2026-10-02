// Static mock fixtures for the UI-first build pass — no backend yet.
// Shapes are drawn directly from the data model design in the implementation
// plan (Phase 0/2/4/5/6 models) so wiring real data later is a drop-in swap.

// LOCATIONS/PROTOCOLS/ADD_ONS below are prisma/seed.ts's data source, not
// something app code reads directly anymore — LocationsContext,
// ProtocolsContext, and AddOnsContext now seed from a real Prisma query in
// app/layout.tsx instead. Kept here (rather than moved into the seed script
// itself) so there's exactly one authored copy of these values, not two.
//
// Rooms: only 3 "Sala N" rooms are real per location — the 4th, "Sala 4
// (LED)", is modeled as a Device instead (prisma/seed.ts), matching the
// schema's own correctness note that a shared/portable LED panel is a
// booking-conflict resource in its own right, not a room. This array's
// `rooms` list reflects that (3 entries), not the mock UI's old flattened
// 4-room shortcut.
export const LOCATIONS = [
  // rentCost/maintenanceCost for Roma Norte match the consolidated P&L
  // "Renta" (-$70,000) and "Mantenimiento y servicios" (-$11,200) lines —
  // it's the only active location, so it currently accounts for all of it.
  {
    id: "roma-norte", name: "Roma Norte", address: "Durango 258, Roma Nte., Cuauhtémoc, 06700 Ciudad de México, CDMX, México", isActive: true, rentCost: 70000, maintenanceCost: 11200,
    rooms: [
      { id: "roma-norte-sala-1", name: "Sala 1" },
      { id: "roma-norte-sala-2", name: "Sala 2" },
      { id: "roma-norte-sala-3", name: "Sala 3" },
    ],
  },
  // Prado Norte doesn't have a confirmed real address yet and isn't open —
  // "Próximamente" (Coming Soon) instead of a placeholder/fake address.
  // Costs below are the projected pre-opening estimate, not a signed lease.
  // No rooms configured yet either — set up in Settings once the layout is confirmed.
  { id: "prado-norte", name: "Prado Norte", address: "Próximamente", isActive: false, rentCost: 32000, maintenanceCost: 5500, rooms: [] },
];

// ---------------------------------------------------------------------------
// Business hours — authoritative for BOTH the public "Visítanos" display
// (content/*.json's location.hours, kept in sync with this table by hand
// since content is static JSON) AND the booking engine's slot generation
// (app/my/book/page.tsx). Times are 24h "HH:MM". Tuesday closes earlier
// than the rest of the week — intentional, not a typo. `close` is the
// public-facing closing time; `lastStart60`/`lastStart30` are the last
// bookable start times for a 60-min (Signature) or 30-min (Targeted) visit.
// ---------------------------------------------------------------------------
export interface DayHours {
  day: string;
  open: string;
  lastStart60: string;
  lastStart30: string;
  close: string;
}

export const BUSINESS_HOURS: DayHours[] = [
  { day: "Lunes", open: "10:00", lastStart60: "19:00", lastStart30: "19:30", close: "20:00" },
  { day: "Martes", open: "10:00", lastStart60: "17:00", lastStart30: "17:30", close: "18:00" },
  { day: "Miércoles", open: "10:00", lastStart60: "19:00", lastStart30: "19:30", close: "20:00" },
  { day: "Jueves", open: "10:00", lastStart60: "19:00", lastStart30: "19:30", close: "20:00" },
  { day: "Viernes", open: "10:00", lastStart60: "19:00", lastStart30: "19:30", close: "20:00" },
  { day: "Sábado", open: "11:00", lastStart60: "18:00", lastStart30: "18:30", close: "19:00" },
  { day: "Domingo", open: "10:00", lastStart60: "14:00", lastStart30: "14:30", close: "15:00" },
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

// Prado Norte isn't active yet (no real rooms/appointments), so its
// occupancy is illustrative — same ~43% relative-size convention as
// PNL_LINES_BY_LOCATION, with a smaller room count (2 vs. Roma Norte's 4).
export const OCCUPANCY_7D_BY_LOCATION: Record<string, typeof OCCUPANCY_7D> = {
  "Roma Norte": OCCUPANCY_7D,
  "Prado Norte": [
    { day: "Lun", roomsBooked: 3, roomsTotal: 14 },
    { day: "Mar", roomsBooked: 6, roomsTotal: 14 },
    { day: "Mié", roomsBooked: 8, roomsTotal: 14 },
    { day: "Jue", roomsBooked: 5, roomsTotal: 14 },
    { day: "Vie", roomsBooked: 9, roomsTotal: 14 },
    { day: "Sáb", roomsBooked: 11, roomsTotal: 14 },
    { day: "Dom", roomsBooked: 0, roomsTotal: 0 },
  ],
};

export const RETAIL_ATTACH_RATE = 0.34;
// Renamed from EXPRESS_SIGNATURE_MIX — the 30-min tier is now "Targeted"
// (single bookable item), not "Express".
export const TARGETED_SIGNATURE_MIX = { targeted: 0.58, signature: 0.42 };

export const LOW_STOCK_ALERTS = [
  { product: "SKIN1004 Centella Ampoule", ledger: "Backbar", location: "Roma Norte", qty: 2, par: 8 },
  { product: "Beauty of Joseon Sunscreen", ledger: "Retail", location: "Roma Norte", qty: 3, par: 10 },
  { product: "Anua Heartleaf Toner", ledger: "Backbar", location: "Roma Norte", qty: 1, par: 6 },
];

export const PROTOCOL_RETAIL_LINK = [
  { protocol: "Targeted", topProduct: "Beauty of Joseon Glow Serum", attachRate: 0.41 },
  { protocol: "Purify", topProduct: "Anua Heartleaf Toner", attachRate: 0.37 },
  { protocol: "Microbiomic", topProduct: "SKIN1004 Centella Cream", attachRate: 0.29 },
];

export type AppointmentStatus = "Registrado" | "Esperando" | "Retrasado" | "Confirmado";
export type AppointmentTier = "Targeted" | "Signature";

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
    tier: "Targeted",
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
    tier: "Targeted",
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
  lastTreatment: "Targeted — hace 3 semanas",
};

export const CLIENT_PACKAGE_BALANCE = {
  name: "Pack Targeted x5",
  sessionsRemaining: 2,
  expiresOn: "2026-12-15",
};

// Packages available for purchase — priced at a discount vs. buying each
// session individually at list price (Targeted $850, Signature $1,900).
export const PACKAGE_OPTIONS = [
  { name: "Pack Targeted x5", sessions: 5, tier: "Targeted" as const, listPrice: 4250, price: 3800 },
  { name: "Pack Signature x5", sessions: 5, tier: "Signature" as const, listPrice: 9500, price: 8500 },
  { name: "Pack Signature x10", sessions: 10, tier: "Signature" as const, listPrice: 19000, price: 16500 },
];

// PROTOCOLS/ADD_ONS below are prisma/seed.ts's data source (see the note
// above LOCATIONS) — ProtocolsContext/AddOnsContext now seed from a real
// Prisma query in app/layout.tsx, not these arrays directly.
export const PROTOCOLS = [
  // Single bookable Targeted item — no client-facing formula choice; the
  // esthetician selects the ampoule after an in-person evaluation.
  { name: "Targeted", tier: "Targeted" as const, duration: 30, price: 850, cost: 220 },
  { name: "Purify", tier: "Signature" as const, duration: 60, price: 1900, cost: 460 },
  { name: "Lift", tier: "Signature" as const, duration: 60, price: 1900, cost: 520 },
  { name: "Longevity", tier: "Signature" as const, duration: 60, price: 1900, cost: 540 },
  { name: "Microbiomic", tier: "Signature" as const, duration: 60, price: 1900, cost: 470 },
];

export interface AddOn {
  id: string;
  name: string;
  function: string;
  extraMinutes: number;
  // Protocol names (PROTOCOLS[].name) this add-on is compatible with.
  availableOn: string[];
}

export const ADD_ONS: AddOn[] = [
  {
    id: "neck-chest-mask",
    name: "Neck & Chest Rejuvenating Mask",
    function: "Cuello y escote",
    extraMinutes: 10,
    availableOn: ["Purify", "Lift"],
  },
  {
    id: "theraface-wand",
    name: "Theraface Depuffing Wand",
    function: "Desinflamar mirada",
    extraMinutes: 10,
    availableOn: ["Purify", "Lift"],
  },
  {
    id: "faq101-rf-led",
    name: "FAQ 101 RF + LED",
    function: "Firmeza y tersura",
    extraMinutes: 10,
    availableOn: ["Purify"],
  },
  {
    id: "cryo-sticks",
    name: "Cryo sticks",
    function: "Frescura y poro",
    extraMinutes: 10,
    availableOn: ["Purify"],
  },
  {
    id: "facial-cupping",
    name: "Facial cupping",
    function: "Contorno definido",
    extraMinutes: 10,
    availableOn: ["Lift"],
  },
];

// Times performed this period, feeding revenue/margin-per-protocol (spec §6.3).
export const PROTOCOL_PERFORMANCE = [
  { protocol: "Targeted", tier: "Targeted" as const, timesPerformed: 48, revenue: 40800, cost: 10560 },
  { protocol: "Purify", tier: "Signature" as const, timesPerformed: 8, revenue: 15200, cost: 3680 },
  { protocol: "Lift", tier: "Signature" as const, timesPerformed: 7, revenue: 13300, cost: 3640 },
  { protocol: "Longevity", tier: "Signature" as const, timesPerformed: 6, revenue: 11400, cost: 3240 },
  { protocol: "Microbiomic", tier: "Signature" as const, timesPerformed: 9, revenue: 17100, cost: 4230 },
];

// Same ~43% Prado Norte ratio as the other Ventas breakdowns, so the
// protocolo table also responds to the "Local" filter.
export const PROTOCOL_PERFORMANCE_BY_LOCATION: Record<string, typeof PROTOCOL_PERFORMANCE> = {
  "Roma Norte": PROTOCOL_PERFORMANCE,
  "Prado Norte": [
    { protocol: "Targeted", tier: "Targeted" as const, timesPerformed: 21, revenue: 17500, cost: 4540 },
    { protocol: "Purify", tier: "Signature" as const, timesPerformed: 3, revenue: 6500, cost: 1580 },
    { protocol: "Lift", tier: "Signature" as const, timesPerformed: 3, revenue: 5700, cost: 1570 },
    { protocol: "Longevity", tier: "Signature" as const, timesPerformed: 3, revenue: 4900, cost: 1390 },
    { protocol: "Microbiomic", tier: "Signature" as const, timesPerformed: 4, revenue: 7400, cost: 1820 },
  ],
};

// ---------------------------------------------------------------------------
// Admin — Calendar
// ---------------------------------------------------------------------------
// Rooms are real now (Catalog phase) — admin/calendar/page.tsx queries them
// directly. CALENDAR_APPOINTMENTS/CALENDAR_HOURS below are still mock,
// pending the Booking phase.
export const CALENDAR_APPOINTMENTS = [
  { id: "cal-1", room: "Sala 1", start: 9, span: 1, client: "Sofía Marín", esthetician: "Ana Torres", tier: "Signature" as const },
  { id: "cal-2", room: "Sala 2", start: 9.5, span: 0.5, client: "Renata Lugo", esthetician: "Ana Torres", tier: "Targeted" as const },
  { id: "cal-3", room: "Sala 1", start: 10.5, span: 1, client: "Valentina Reyes", esthetician: "Ana Torres", tier: "Signature" as const },
  { id: "cal-4", room: "Sala 3", start: 11.5, span: 0.5, client: "Camila Fuentes", esthetician: "Diana Cruz", tier: "Targeted" as const },
  { id: "cal-5", room: "Sala 4 (LED)", start: 12, span: 0.5, client: "Renata Lugo", esthetician: "Diana Cruz", tier: "Targeted" as const },
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
    { date: "2026-09-21", protocol: "Targeted", esthetician: "Ana Torres", location: "Roma Norte" },
    { date: "2026-08-24", protocol: "Purify", esthetician: "Ana Torres", location: "Roma Norte" },
    { date: "2026-07-20", protocol: "Targeted", esthetician: "Ana Torres", location: "Roma Norte" },
  ],
  auditTrail: [
    { user: "Ana Torres", action: "Vio el expediente", timestamp: "2026-09-21 09:58" },
    { user: "Camila Ruiz", action: "Editó preferencias", timestamp: "2026-09-14 10:20" },
  ],
};

// One full record per CLIENTS_LIST entry — added after the persona QA pass
// found admin/clients/[id] (and the single-client staff/clients view) always
// rendering CLIENT_DETAIL ("Valentina Reyes") regardless of which client's
// record was actually opened. Each entry's skinId/flags stay consistent with
// CLIENTS_LIST (Renata's Compositae allergy, Camila's active package
// matching CLIENT_PACKAGE_BALANCE, Daniela's topical retinoid).
export const CLIENT_DETAILS_BY_ID: Record<string, Omit<typeof CLIENT_DETAIL, "id">> = {
  "cl-1": {
    name: "Sofía Marín",
    phone: "+52 55 1234 5678",
    email: "sofia.marin@example.com",
    location: "Roma Norte",
    skinId: {
      skinType: "Grasa",
      allergies: [],
      medications: [],
      pregnancyOrBreastfeeding: false,
      recentProcedures: "Ninguno en los últimos 6 meses",
      sunExposure: "Alta",
      visitObjective: "Limpieza",
    },
    preferences: {
      preferredEsthetician: "Ana Torres",
      beverage: "Té verde",
      music: "Sin preferencia",
      aromatherapy: "Naranja",
      conversation: "Conversación",
      productsOwned: [] as string[],
      wishlist: ["Beauty of Joseon Sunscreen"],
    },
    consents: [
      { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-09-21", status: "Vigente" },
      { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-09-21", status: "Vigente" },
      { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-09-21", status: "Vigente" },
    ],
    treatmentHistory: [] as { date: string; protocol: string; esthetician: string; location: string }[],
    auditTrail: [{ user: "Camila Ruiz", action: "Registró llegada", timestamp: "2026-09-28 09:00" }],
  },
  "cl-2": {
    name: "Renata Lugo",
    phone: "+52 55 2345 6789",
    email: "renata.lugo@example.com",
    location: "Roma Norte",
    skinId: {
      skinType: "Sensible",
      allergies: ["Compositae"],
      medications: [] as string[],
      pregnancyOrBreastfeeding: false,
      recentProcedures: "Ninguno en los últimos 6 meses",
      sunExposure: "Moderada",
      visitObjective: "Calmar",
    },
    preferences: {
      preferredEsthetician: "Ana Torres",
      beverage: "Té de menta/hierbabuena",
      music: "Instrumental, volumen bajo",
      aromatherapy: "Eucalipto",
      conversation: "Silencio",
      productsOwned: ["Anua Heartleaf Toner"],
      wishlist: [] as string[],
    },
    consents: [
      { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-05-10", status: "Vigente" },
      { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-05-10", status: "Vigente" },
      { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-05-10", status: "Vigente" },
    ],
    treatmentHistory: [
      { date: "2026-09-21", protocol: "Targeted", esthetician: "Ana Torres", location: "Roma Norte" },
      { date: "2026-08-20", protocol: "Targeted", esthetician: "Ana Torres", location: "Roma Norte" },
    ],
    auditTrail: [{ user: "Ana Torres", action: "Vio el expediente", timestamp: "2026-09-21 09:25" }],
  },
  "cl-3": {
    name: CLIENT_DETAIL.name,
    phone: CLIENT_DETAIL.phone,
    email: CLIENT_DETAIL.email,
    location: CLIENT_DETAIL.location,
    skinId: CLIENT_DETAIL.skinId,
    preferences: CLIENT_DETAIL.preferences,
    consents: CLIENT_DETAIL.consents,
    treatmentHistory: CLIENT_DETAIL.treatmentHistory,
    auditTrail: CLIENT_DETAIL.auditTrail,
  },
  "cl-4": {
    name: "Camila Fuentes",
    phone: "+52 55 4567 8901",
    email: "camila.fuentes@example.com",
    location: "Roma Norte",
    skinId: {
      skinType: "Seca",
      allergies: [] as string[],
      medications: [] as string[],
      pregnancyOrBreastfeeding: false,
      recentProcedures: "Ninguno en los últimos 6 meses",
      sunExposure: "Leve",
      visitObjective: "Hidratación",
    },
    preferences: {
      preferredEsthetician: "Diana Cruz",
      beverage: "Té de manzanilla",
      music: "Pop suave",
      aromatherapy: "Lemongrass",
      conversation: "Conversación",
      productsOwned: ["SKIN1004 Centella Cream"],
      wishlist: ["Anua Heartleaf Toner"],
    },
    consents: [
      { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-04-02", status: "Vigente" },
      { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-04-02", status: "Vigente" },
      { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-04-02", status: "Vigente" },
    ],
    treatmentHistory: [
      { date: "2026-09-14", protocol: "Targeted", esthetician: "Diana Cruz", location: "Roma Norte" },
      { date: "2026-08-17", protocol: "Targeted", esthetician: "Diana Cruz", location: "Roma Norte" },
      { date: "2026-07-20", protocol: "Targeted", esthetician: "Diana Cruz", location: "Roma Norte" },
    ],
    auditTrail: [{ user: "Diana Cruz", action: "Vio el expediente", timestamp: "2026-09-14 11:35" }],
  },
  "cl-5": {
    name: "Mariana Solís",
    phone: "+52 55 5678 9012",
    email: "mariana.solis@example.com",
    location: "Roma Norte",
    skinId: {
      skinType: "Normal",
      allergies: [] as string[],
      medications: [] as string[],
      pregnancyOrBreastfeeding: false,
      recentProcedures: "Ninguno en los últimos 6 meses",
      sunExposure: "Moderada",
      visitObjective: "Prevención",
    },
    preferences: {
      preferredEsthetician: "Ana Torres",
      beverage: "Té verde",
      music: "Sin preferencia",
      aromatherapy: "Menta",
      conversation: "Conversación",
      productsOwned: [] as string[],
      wishlist: [] as string[],
    },
    consents: [
      { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-03-15", status: "Vigente" },
      { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-03-15", status: "Vigente" },
      { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-03-15", status: "Vigente" },
    ],
    treatmentHistory: [
      { date: "2026-08-30", protocol: "Purify", esthetician: "Ana Torres", location: "Roma Norte" },
    ],
    auditTrail: [{ user: "Ana Torres", action: "Vio el expediente", timestamp: "2026-08-30 13:10" }],
  },
  "cl-6": {
    name: "Daniela Ponce",
    phone: "+52 55 6789 0123",
    email: "daniela.ponce@example.com",
    location: "Roma Norte",
    skinId: {
      skinType: "Grasa",
      allergies: [] as string[],
      medications: ["Retinoide tópico"],
      pregnancyOrBreastfeeding: false,
      recentProcedures: "Retinoide tópico — confirmar con dermatólogo antes de peelings",
      sunExposure: "Moderada",
      visitObjective: "Recuperación",
    },
    preferences: {
      preferredEsthetician: "Ana Torres",
      beverage: "Té de manzanilla",
      music: "Instrumental, volumen bajo",
      aromatherapy: "Lavanda",
      conversation: "Silencio",
      productsOwned: [] as string[],
      wishlist: [] as string[],
    },
    consents: [
      { type: "Tratamiento y responsabilidad", version: "v2.0", acceptedAt: "2026-01-20", status: "Vigente" },
      { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-01-20", status: "Revocado" },
      { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-01-20", status: "Vigente" },
    ],
    treatmentHistory: [
      { date: "2026-08-12", protocol: "Targeted", esthetician: "Ana Torres", location: "Roma Norte" },
    ],
    auditTrail: [{ user: "Emiliano Alvear Ocampo", action: "Rechazó cortesía", timestamp: "2026-09-19 16:40" }],
  },
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

// A third ledger, distinct from Piso (retail floor) and Backbar (opened,
// in active clinic use): sealed bulk stock received but not yet moved to
// either — no price (nothing's sold straight from the warehouse) and no
// opensOn/PAO (unopened), but still tracks cost (for inventory valuation)
// and a lot expiry, same as Piso.
export interface WarehouseInventoryItem {
  sku: string;
  product: string;
  location: string;
  qty: number;
  par: number;
  cost: number;
  expiresOn: string;
}

export const WAREHOUSE_INVENTORY: WarehouseInventoryItem[] = [
  { sku: "BOJ-GS-30-WH", product: "Beauty of Joseon Glow Serum", location: "Roma Norte", qty: 24, par: 12, cost: 260, expiresOn: "2027-11-01" },
  { sku: "AN-HT-150-WH", product: "Anua Heartleaf Toner", location: "Roma Norte", qty: 18, par: 10, cost: 230, expiresOn: "2027-10-20" },
  { sku: "S1004-CA-30B-WH", product: "SKIN1004 Centella Ampoule", location: "Roma Norte", qty: 15, par: 10, cost: 190, expiresOn: "2027-12-15" },
  { sku: "PUR-CS-200B-WH", product: "Purito Centella Serum (backbar)", location: "Roma Norte", qty: 4, par: 8, cost: 175, expiresOn: "2027-09-05" },
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
  { category: "Servicios — Targeted", amount: 41200 },
  { category: "Servicios — Signature", amount: 68300 },
  { category: "Retail", amount: 44800 },
  { category: "Paquetes", amount: 19500 },
];

// Per-location breakdown so Análisis · Ventas actually responds to the
// "Local" filter instead of always showing Roma Norte's numbers (same bug
// class already fixed on P&L — see PNL_LINES_BY_LOCATION). Prado Norte
// figures are illustrative, ~43% of Roma Norte's — the same ratio already
// established there, consistent with its smaller footprint.
export const REVENUE_BY_CATEGORY_BY_LOCATION: Record<string, Record<string, number>> = {
  "Roma Norte": {
    "Servicios — Targeted": 41200,
    "Servicios — Signature": 68300,
    "Retail": 44800,
    "Paquetes": 19500,
  },
  "Prado Norte": {
    "Servicios — Targeted": 17700,
    "Servicios — Signature": 29400,
    "Retail": 19300,
    "Paquetes": 8400,
  },
};

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

// Same ~43% Prado Norte ratio as REVENUE_BY_CATEGORY_BY_LOCATION, so the
// weekly trend chart also responds to the "Local" filter.
export const WEEKLY_REVENUE_TREND_BY_LOCATION: Record<string, { week: string; revenue: number }[]> = {
  "Roma Norte": WEEKLY_REVENUE_TREND,
  "Prado Norte": [
    { week: "Sem 1", revenue: 16600 },
    { week: "Sem 2", revenue: 17700 },
    { week: "Sem 3", revenue: 17100 },
    { week: "Sem 4", revenue: 19000 },
    { week: "Sem 5", revenue: 18300 },
    { week: "Sem 6", revenue: 20300 },
    { week: "Sem 7", revenue: 19700 },
    { week: "Sem 8", revenue: 21400 },
  ],
};

// Esthetician occupancy — complements room occupancy on the Dashboard;
// spec §6.3 asks for room/esthetician occupancy, not room only. Both are
// Roma Norte's real staff — Prado Norte has no roster yet (not active), so
// selecting it alone correctly shows nobody rather than repeating these.
export const ESTHETICIAN_OCCUPANCY = [
  { name: "Ana Torres", location: "Roma Norte", hoursBooked: 34, hoursAvailable: 40 },
  { name: "Diana Cruz", location: "Roma Norte", hoursBooked: 27, hoursAvailable: 40 },
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
// All three are Roma Norte's real staff — Prado Norte has no roster yet
// (not active), so selecting it alone correctly shows nobody.
export const COMMISSION_ENTRIES = [
  { staff: "Ana Torres", role: "Esteticista", location: "Roma Norte", period: "Sep 2026", service: 8400, retail: 1200, total: 9600 },
  { staff: "Diana Cruz", role: "Esteticista", location: "Roma Norte", period: "Sep 2026", service: 6100, retail: 800, total: 6900 },
  { staff: "Camila Ruiz", role: "Recepción", location: "Roma Norte", period: "Sep 2026", service: 0, retail: 2100, total: 2100 },
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
  salary: number;
}

// salary = sueldo mensual bruto (MXN) — sums into P&L's "Nómina base" line
// for active staff (Análisis → P&L, GASTOS DE PERSONAL); these five sum to
// the $68,000 that line already showed before this became a live rollup.
export const STAFF_ROSTER: StaffMember[] = [
  { id: "st-1", name: "Emiliano Alvear Ocampo", role: "Admin", location: "Ambas", status: "Activo", salary: 20000 },
  { id: "st-2", name: "Juana de las Carreras", role: "Admin", location: "Ambas", status: "Activo", salary: 20000 },
  { id: "st-3", name: "Camila Ruiz", role: "Recepción", location: "Roma Norte", status: "Activo", salary: 8000 },
  { id: "st-4", name: "Ana Torres", role: "Esteticista", location: "Roma Norte", status: "Activo", salary: 10000 },
  { id: "st-5", name: "Diana Cruz", role: "Esteticista", location: "Roma Norte", status: "Activo", salary: 10000 },
];

// ---------------------------------------------------------------------------
// Admin — Approvals (full queue) + Audit log + anomaly flags
// ---------------------------------------------------------------------------
// Single source for both the dashboard's "Aprobaciones pendientes" widget
// and the full Control > Aprobaciones queue — these were two separate mock
// arrays (PENDING_APPROVALS + APPROVALS_QUEUE) seeded with the same first
// two rows, which is exactly the duplication the architecture plan already
// flagged as "the same concept mocked twice." Collapsed into one list, read
// through ApprovalsContext, so approving/rejecting shows up in both places
// instead of the dashboard's buttons doing nothing.
export type ApprovalStatus = "Pendiente" | "Aprobado" | "Rechazado";
export const APPROVALS_QUEUE = [
  { id: "apr-1", type: "Descuento", requestedBy: "Camila Ruiz", amount: "15%", client: "Sofía Marín", location: "Roma Norte", reason: undefined as string | undefined, date: "2026-09-21", status: "Pendiente" as ApprovalStatus },
  { id: "apr-2", type: "Reembolso", requestedBy: "Camila Ruiz", amount: "$1,900 MXN", client: "Renata Lugo", location: "Roma Norte", reason: "Servicio no satisfactorio" as string | undefined, date: "2026-09-21", status: "Pendiente" as ApprovalStatus },
  { id: "apr-3", type: "Ajuste de inventario", requestedBy: "Ana Torres", amount: "-2 uds. SKIN1004 Centella Ampoule", client: "—", location: "Roma Norte", reason: undefined as string | undefined, date: "2026-09-20", status: "Aprobado" as ApprovalStatus },
  { id: "apr-4", type: "Cortesía", requestedBy: "Camila Ruiz", amount: "$850 MXN", client: "Daniela Ponce", location: "Roma Norte", reason: undefined as string | undefined, date: "2026-09-19", status: "Rechazado" as ApprovalStatus },
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
  service: { name: "Longevity (Signature)", price: 1900 },
  retailItems: [
    { name: "Beauty of Joseon Glow Serum", price: 620, recommendedBy: "Ana Torres" },
  ],
  // Fed from the client's own wishlist (spec: wishlist should surface to
  // Front Desk right when the ticket is closing, as an upsell prompt — not
  // just sit unused on the client's own preferences page).
  wishlist: [{ product: "SKIN1004 Centella Cream", price: 590 }],
  depositCredit: -500,
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
    { id: "ca-2", date: "2026-09-21", time: "10:30", location: "Roma Norte", protocol: "Targeted" },
    { id: "ca-3", date: "2026-08-24", time: "10:00", location: "Roma Norte", protocol: "Purify" },
    { id: "ca-4", date: "2026-07-20", time: "10:00", location: "Roma Norte", protocol: "Targeted" },
  ],
};

export const CLIENT_PURCHASES = [
  { date: "2026-09-21", product: "Beauty of Joseon Glow Serum", size: "30 ml", price: 620 },
  { date: "2026-08-24", product: "Anua Heartleaf Toner", size: "150 ml", price: 550 },
];

// Reuses the same protocol → top-retail-product link the admin analytics
// views are built on (PROTOCOL_RETAIL_LINK), matched against this client's
// own past visits — rather than inventing a separate recommendations shape.
// Rendered on /my/appointments ("Mi rutina · Mis compras").
export const POST_FACIAL_RECOMMENDATIONS = CLIENT_APPOINTMENTS_LIST.past
  .map((visit) => {
    const link = PROTOCOL_RETAIL_LINK.find((l) => l.protocol === visit.protocol);
    if (!link) return null;
    const inventory = RETAIL_INVENTORY.find((r) => r.product === link.topProduct);
    const alreadyPurchased = CLIENT_PURCHASES.some((p) => p.product === link.topProduct);
    return {
      visitDate: visit.date,
      protocol: visit.protocol,
      product: link.topProduct,
      price: inventory?.price,
      alreadyPurchased,
    };
  })
  .filter((r): r is NonNullable<typeof r> => r !== null);

export const CLIENT_CONSENTS = [
  { type: "Tratamiento y responsabilidad", version: "v2.1", acceptedAt: "2026-06-02", revocable: false },
  { type: "Uso de fotografía", version: "v1.0", acceptedAt: "2026-06-02", revocable: true },
  { type: "Aviso de privacidad", version: "v1.3", acceptedAt: "2026-06-02", revocable: false },
];

export const CLIENT_PAYMENT_METHODS = [
  { id: "pm-1", brand: "Visa", last4: "4242", expiresOn: "08/28" },
];

// ---------------------------------------------------------------------------
// Admin — Panel (Band 1 · Pulso KPIs) — spec: MONAM admin IA rebuild
// ---------------------------------------------------------------------------
// Every KPI card on Panel and every Análisis sub-page shares this shape so
// the KpiCard component can render any of them identically. `sparkline` is
// 8 weekly points (oldest → newest); `progressPct`/`semaphore` are hand-set
// here (mock), not derived, since there's no live target model yet.
export type Semaphore = "green" | "yellow" | "red";
export type DeltaTone = "positive" | "negative" | "neutral";

export interface KpiDef {
  id: string;
  label: string;
  info: string;
  value: string;
  sub?: string;
  deltaLabel: string;
  deltaTone: DeltaTone;
  target: string;
  progressPct: number;
  semaphore: Semaphore;
  sparkline?: number[];
  href?: string;
}

// Prado Norte's relative size vs. Roma Norte — same ~43% convention already
// used for PNL_LINES_BY_LOCATION/REVENUE_BY_CATEGORY_BY_LOCATION, reused
// here as a weight for combining percentage-based KPIs (occupancy, attach
// rate, rebooking) into a real weighted average when both locations are
// selected, instead of just repeating Roma Norte's number.
export const LOCATION_WEIGHT: Record<string, number> = {
  "Roma Norte": 1,
  "Prado Norte": 0.43,
};

// Panel KPIs 2-4 (Ocupación, Attach retail, Rebooking) are percentages with
// no per-location source data elsewhere — Prado Norte's figures here are
// illustrative, a few points off Roma Norte's, consistent with a smaller,
// newer location. Sparklines scaled by the same ratio as the headline value
// so the trend shape stays proportional. Ingreso MTD and Contribución are
// computed live from PNL_LINES_BY_LOCATION instead (see analytics/ventas
// and this page) — real per-location dollar figures already exist there.
export const PANEL_KPI_BY_LOCATION: Record<
  string,
  Record<string, { value: number; sub7d?: number; sparkline: number[] }>
> = {
  ocupacion: {
    "Roma Norte": { value: 71, sub7d: 78, sparkline: [62, 65, 64, 68, 67, 70, 69, 71] },
    "Prado Norte": { value: 64, sub7d: 70, sparkline: [56, 58, 58, 61, 60, 63, 62, 64] },
  },
  "attach-retail": {
    "Roma Norte": { value: 34, sparkline: [27, 29, 28, 31, 30, 32, 33, 34] },
    "Prado Norte": { value: 30, sparkline: [24, 26, 25, 28, 27, 29, 29, 30] },
  },
  rebooking: {
    "Roma Norte": { value: 62, sparkline: [54, 56, 55, 58, 57, 60, 61, 62] },
    "Prado Norte": { value: 58, sparkline: [50, 52, 51, 54, 53, 56, 57, 58] },
  },
  "retencion-90d": {
    "Roma Norte": { value: 47, sparkline: [40, 41, 43, 42, 44, 45, 46, 47] },
    "Prado Norte": { value: 43, sparkline: [37, 38, 39, 39, 40, 41, 42, 43] },
  },
  "ingreso-hora-esteticista": {
    "Roma Norte": { value: 742, sparkline: [660, 675, 690, 700, 705, 720, 730, 742] },
    "Prado Norte": { value: 680, sparkline: [605, 618, 632, 641, 646, 659, 668, 680] },
  },
};

// Per-location breakdown of FINANCIALS_SUMMARY's client-mix figures, for
// Análisis · Clientas' "Nuevas vs. recurrentes" detail — same ~43% Prado
// Norte convention as everywhere else.
export const CLIENT_MIX_BY_LOCATION: Record<
  string,
  { newPct: number; returningPct: number; outstandingPrepaidLiability: number }
> = {
  "Roma Norte": { newPct: 0.31, returningPct: 0.69, outstandingPrepaidLiability: 84200 },
  "Prado Norte": { newPct: 0.35, returningPct: 0.65, outstandingPrepaidLiability: 36200 },
};

export const PANEL_KPIS: KpiDef[] = [
  {
    id: "ingreso-mtd",
    label: "Ingreso MTD",
    info: "Ingreso neto acumulado del mes en curso, vs. el objetivo de Metas 2026.",
    value: "$487,224",
    sub: "vs. objetivo $520,000",
    deltaLabel: "▲ 6% vs. mes anterior",
    deltaTone: "positive",
    target: "Objetivo $520,000 · 94% de avance",
    progressPct: 94,
    semaphore: "yellow",
    sparkline: [38500, 41200, 39800, 44100, 42600, 47300, 45900, 49800],
    href: "/admin/analytics/ventas",
  },
  {
    id: "ocupacion",
    label: "Ocupación",
    info: "Horas de cabina vendidas ÷ horas de cabina disponibles. 'Real' es el mes en curso; '7 días' es la ocupación ya agendada para la próxima semana.",
    value: "71%",
    sub: "real · 78% próx. 7 días",
    deltaLabel: "▲ 3 pts vs. mes anterior",
    deltaTone: "positive",
    target: "Objetivo 80% · 89% de avance",
    progressPct: 89,
    semaphore: "yellow",
    sparkline: [62, 65, 64, 68, 67, 70, 69, 71],
    href: "/admin/analytics/capacidad",
  },
  {
    id: "attach-retail",
    label: "Attach retail",
    info: "Visitas de servicio con al menos una compra retail en los 7 días siguientes ÷ visitas de servicio.",
    value: "34%",
    deltaLabel: "▲ 4 pts vs. mes anterior",
    deltaTone: "positive",
    target: "Objetivo 40% · 85% de avance",
    progressPct: 85,
    semaphore: "yellow",
    sparkline: [27, 29, 28, 31, 30, 32, 33, 34],
    href: "/admin/analytics/retail",
  },
  {
    id: "rebooking",
    label: "Rebooking",
    info: "Clientas que salen de su cita con la siguiente ya agendada, sobre el total de citas completadas.",
    value: "62%",
    deltaLabel: "▲ 2 pts vs. mes anterior",
    deltaTone: "positive",
    target: "Objetivo 65% · 95% de avance",
    progressPct: 95,
    semaphore: "green",
    sparkline: [54, 56, 55, 58, 57, 60, 61, 62],
    href: "/admin/analytics/equipo",
  },
  {
    id: "contribucion",
    label: "Contribución",
    info: "EBITDA del local como % del ingreso neto, medido contra el punto de equilibrio (0%).",
    value: "12%",
    sub: "$56,960 MXN sobre equilibrio",
    deltaLabel: "▼ 1 pt vs. mes anterior",
    deltaTone: "negative",
    target: "Objetivo 15% · 80% de avance",
    progressPct: 80,
    semaphore: "yellow",
    sparkline: [9, 11, 10, 13, 12, 14, 13, 12],
    href: "/admin/analytics/pnl",
  },
  {
    id: "alertas",
    label: "Alertas",
    info: "Suma de aprobaciones pendientes, anomalías abiertas y alertas de stock/caducidad activas ahora mismo.",
    value: "6 abiertas",
    deltaLabel: "▲ 2 vs. mes anterior",
    deltaTone: "negative",
    target: "Objetivo ≤ 3 · 40% de avance",
    progressPct: 40,
    semaphore: "red",
    sparkline: [3, 4, 2, 5, 4, 5, 6, 6],
    href: "/admin/control",
  },
];

// ---------------------------------------------------------------------------
// Admin — Panel (Band 2 · Requiere acción)
// ---------------------------------------------------------------------------
export const PANEL_ALERTS = [
  { id: "al-1", text: "Clienta con alerta clínica agendada hoy — Renata Lugo (alergia: Compositae), 09:30", severity: "warning" as const },
  { id: "al-2", text: "Tratamiento completado sin cobro — cita de ayer, Roma Norte", severity: "warning" as const },
  { id: "al-3", text: "3 SKUs con < 5 días de cobertura / 1 lote por vencer", severity: "warning" as const },
];

// ---------------------------------------------------------------------------
// Admin — Panel (Band 3 · Hoy)
// ---------------------------------------------------------------------------
export const PANEL_TODAY_VS_LASTWEEK = [
  { label: "Ingreso del día", today: "$9,200 MXN", lastWeek: "$8,100 MXN" },
  { label: "Citas / no-shows", today: "4 / 0", lastWeek: "5 / 1" },
  { label: "Ventas retail (unidades)", today: "6 uds", lastWeek: "4 uds" },
  { label: "Cobros pendientes", today: "$1,900 MXN", lastWeek: "$0 MXN" },
];

// ---------------------------------------------------------------------------
// Admin — Análisis → P&L (exact structure per client spec — do not reorder)
// ---------------------------------------------------------------------------
export type PnlRowType = "section" | "line" | "subtotal";

export interface PnlRow {
  type: PnlRowType;
  label: string;
  real: number | null;
  pctLabel: string | null;
  favorite?: boolean;
}

export const PNL_LINES: PnlRow[] = [
  { type: "section", label: "INGRESOS", real: null, pctLabel: null },
  { type: "line", label: "Servicios Targeted", real: 117241, pctLabel: "24%" },
  { type: "line", label: "Servicios Signature", real: 212931, pctLabel: "44%" },
  { type: "line", label: "Add-ons", real: 20690, pctLabel: "4%" },
  { type: "line", label: "Retail", real: 150000, pctLabel: "31%", favorite: true },
  { type: "line", label: "Paquetes vencidos no usados", real: 0, pctLabel: "0%" },
  { type: "subtotal", label: "Ventas brutas", real: 500862, pctLabel: "103%" },
  { type: "line", label: "− Descuentos", real: -12000, pctLabel: "-2%" },
  { type: "line", label: "− Reembolsos", real: -1638, pctLabel: "-0%" },
  { type: "subtotal", label: "Ingreso neto", real: 487224, pctLabel: "100%", favorite: true },

  { type: "section", label: "COSTO DE VENTAS", real: null, pctLabel: null },
  { type: "line", label: "Backbar teórico", real: -91600, pctLabel: "-19%" },
  { type: "line", label: "Insumos de add-ons", real: -2400, pctLabel: "-0%" },
  { type: "line", label: "Costo retail vendido", real: -67500, pctLabel: "-14%" },
  { type: "line", label: "Cortesías", real: -600, pctLabel: "-0%" },
  { type: "line", label: "Merma", real: -3000, pctLabel: "-1%", favorite: true },
  { type: "subtotal", label: "Utilidad bruta", real: 322124, pctLabel: "66%", favorite: true },

  { type: "section", label: "GASTOS DE PERSONAL", real: null, pctLabel: null },
  { type: "line", label: "Nómina base", real: -68000, pctLabel: "-14%" },
  { type: "line", label: "Cargas sociales", real: -20400, pctLabel: "-4%" },
  { type: "line", label: "Comisiones de servicio", real: -42000, pctLabel: "-9%" },
  { type: "line", label: "Comisiones de retail", real: -12000, pctLabel: "-2%" },

  { type: "section", label: "GASTOS DE OCUPACIÓN", real: null, pctLabel: null },
  { type: "line", label: "Renta", real: -70000, pctLabel: "-14%" },
  { type: "line", label: "Mantenimiento y servicios", real: -11200, pctLabel: "-2%" },

  { type: "section", label: "GASTOS DE OPERACIÓN", real: null, pctLabel: null },
  { type: "line", label: "Comisión de terminal", real: -13564, pctLabel: "-3%" },
  { type: "line", label: "Operación del local", real: -18000, pctLabel: "-4%" },
  { type: "line", label: "Marketing local", real: -10000, pctLabel: "-2%" },
  { type: "subtotal", label: "EBITDA del local", real: 56960, pctLabel: "12%", favorite: true },
];

// Per-location operational figures for every line the P&L page scopes to
// the selected location(s) (spec/page comment: "OPERATIONAL_LABELS"). Roma
// Norte's numbers match PNL_LINES above (it's the only location with real
// activity today); Prado Norte's are illustrative test data — roughly 40-46%
// of Roma Norte's, consistent with its smaller Renta/Mantenimiento
// (LOCATIONS: $32,000/$5,500 vs. $70,000/$11,200) — so switching the "Local"
// filter to Prado Norte or Consolidado has real numbers to show instead of
// zeros. Prado Norte is still seeded `isActive: false` ("Próximamente") —
// selecting it requires activating it first in Configuración → Sucursales,
// same as every other screen scoped by LocationsContext.
export const PNL_LINES_BY_LOCATION: Record<string, Partial<Record<string, number>>> = {
  "Roma Norte": {
    "Servicios Targeted": 117241,
    "Servicios Signature": 212931,
    "Add-ons": 20690,
    "Retail": 150000,
    "Paquetes vencidos no usados": 0,
    "− Descuentos": -12000,
    "− Reembolsos": -1638,
    "Backbar teórico": -91600,
    "Insumos de add-ons": -2400,
    "Costo retail vendido": -67500,
    "Cortesías": -600,
    "Merma": -3000,
    "Comisiones de servicio": -42000,
    "Comisiones de retail": -12000,
    "Comisión de terminal": -13564,
    "Operación del local": -18000,
    "Marketing local": -10000,
  },
  "Prado Norte": {
    "Servicios Targeted": 52800,
    "Servicios Signature": 95700,
    "Add-ons": 8900,
    "Retail": 61000,
    "Paquetes vencidos no usados": 0,
    "− Descuentos": -4800,
    "− Reembolsos": -420,
    "Backbar teórico": -39800,
    "Insumos de add-ons": -1050,
    "Costo retail vendido": -27800,
    "Cortesías": -250,
    "Merma": -1200,
    "Comisiones de servicio": -18500,
    "Comisiones de retail": -4900,
    "Comisión de terminal": -5920,
    "Operación del local": -8200,
    "Marketing local": -4500,
  },
};

// ---------------------------------------------------------------------------
// Admin — Análisis sub-pages (Nivel 1 headline + Nivel 2 supporting KPIs)
// ---------------------------------------------------------------------------
export const ANALYTICS_VENTAS = {
  nivel1: PANEL_KPIS[0],
  nivel2: [
    {
      id: "mezcla",
      label: "Mezcla servicio/retail/paquetes/add-ons",
      info: "Participación de cada categoría en el ingreso neto del periodo.",
      value: "65% servicio · 31% retail · 4% add-ons",
      deltaLabel: "▲ 1 pt retail vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Meta retail ≥ 30%",
      progressPct: 100,
      semaphore: "green" as Semaphore,
    },
    {
      id: "targeted-signature",
      label: "Targeted vs. Signature",
      info: "Participación de cada nivel de protocolo en los servicios vendidos.",
      value: "58% / 42%",
      deltaLabel: "− sin cambio vs. mes anterior",
      deltaTone: "neutral" as DeltaTone,
      target: "Meta 55% / 45%",
      progressPct: 90,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "descuentos-pct",
      label: "Descuentos como % del ingreso",
      info: "Total de descuentos aplicados ÷ ingreso neto del periodo.",
      value: "2.5%",
      deltaLabel: "▼ 0.3 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo ≤ 3%",
      progressPct: 95,
      semaphore: "green" as Semaphore,
    },
    {
      id: "ticket-visita",
      label: "Ticket por visita",
      info: "Ingreso neto ÷ número de visitas del periodo.",
      value: "$1,640 MXN",
      deltaLabel: "▲ 2% vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo $1,700",
      progressPct: 96,
      semaphore: "green" as Semaphore,
    },
  ],
};

export const ANALYTICS_CAPACIDAD = {
  nivel1: PANEL_KPIS[1],
  nivel2: [
    {
      id: "ingreso-hora-cabina",
      label: "Ingreso por hora-cabina",
      info: "Ingreso de servicios ÷ horas de cabina disponibles.",
      value: "$612 MXN/h",
      deltaLabel: "▲ 3% vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo $650/h",
      progressPct: 94,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "no-shows",
      label: "No-shows",
      info: "Citas no presentadas ÷ citas agendadas.",
      value: "6%",
      deltaLabel: "▲ 1 pt vs. mes anterior",
      deltaTone: "negative" as DeltaTone,
      target: "Objetivo ≤ 5%",
      progressPct: 83,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "cancelaciones-24h",
      label: "Cancelaciones < 24h",
      info: "Citas canceladas con menos de 24 horas de anticipación ÷ citas agendadas.",
      value: "9%",
      deltaLabel: "▲ 2 pts vs. mes anterior",
      deltaTone: "negative" as DeltaTone,
      target: "Objetivo ≤ 8%",
      progressPct: 88,
      semaphore: "red" as Semaphore,
    },
    {
      id: "horas-muertas",
      label: "Horas muertas entre citas",
      info: "Huecos de cabina sin cita entre dos citas confirmadas, por semana.",
      value: "3.2 h/semana",
      deltaLabel: "▲ 0.4 h vs. mes anterior",
      deltaTone: "negative" as DeltaTone,
      target: "Objetivo ≤ 2.5 h",
      progressPct: 78,
      semaphore: "red" as Semaphore,
    },
  ],
};

export const ANALYTICS_CLIENTAS = {
  nivel1: {
    id: "retencion-90d",
    label: "Retención a 90 días",
    info: "Clientas con ≥2 visitas en 90 días ÷ clientas nuevas del cohorte.",
    value: "47%",
    deltaLabel: "▲ 2 pts vs. mes anterior",
    deltaTone: "positive" as DeltaTone,
    target: "Objetivo 55% · 85% de avance",
    progressPct: 85,
    semaphore: "yellow" as Semaphore,
    sparkline: [40, 41, 43, 42, 44, 45, 46, 47],
    href: "/admin/analytics/clientas",
  },
  nivel2: [
    {
      id: "nuevas-recurrentes",
      label: "Nuevas vs. recurrentes",
      info: "Participación de clientas nuevas vs. recurrentes en las visitas del periodo.",
      value: "31% / 69%",
      deltaLabel: "− sin cambio vs. mes anterior",
      deltaTone: "neutral" as DeltaTone,
      target: "Meta 35% / 65%",
      progressPct: 88,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "frecuencia-visita",
      label: "Frecuencia de visita",
      info: "Visitas promedio por clienta activa al mes.",
      value: "1.8 visitas/mes",
      deltaLabel: "▲ 0.1 vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 2.0",
      progressPct: 90,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "ltv-cohorte",
      label: "LTV por cohorte",
      info: "Valor de vida estimado, promedio por cohorte de ingreso de la clienta.",
      value: "$6,850 MXN",
      deltaLabel: "▲ 4% vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo $7,500",
      progressPct: 91,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "skin-id-completo",
      label: "% Skin ID completo",
      info: "Clientas activas con tipo de piel, alergias, medicamentos y consentimientos capturados ÷ clientas activas.",
      value: "76%",
      deltaLabel: "▲ 5 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 90%",
      progressPct: 84,
      semaphore: "yellow" as Semaphore,
    },
  ],
};

export const ANALYTICS_RETAIL = {
  nivel1: {
    id: "pct-ingreso-retail",
    label: "% del ingreso que es retail",
    info: "Ingreso retail ÷ ingreso neto total del periodo.",
    value: "31%",
    deltaLabel: "▲ 2 pts vs. mes anterior",
    deltaTone: "positive" as DeltaTone,
    target: "Objetivo 35% · 89% de avance",
    progressPct: 89,
    semaphore: "yellow" as Semaphore,
    sparkline: [24, 25, 26, 27, 28, 29, 30, 31],
    href: "/admin/analytics/retail",
  },
  nivel2: [
    {
      id: "attach-retail-2",
      label: "Attach retail (≤ 7 días)",
      info: "Visitas de servicio con ≥1 compra retail en ≤7 días ÷ visitas de servicio.",
      value: "34%",
      deltaLabel: "▲ 4 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 40%",
      progressPct: 85,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "conversion-protocolo-producto",
      label: "Conversión protocolo → producto",
      info: "Tasa a la que el producto recomendado en un protocolo se vende después del tratamiento.",
      value: "37%",
      deltaLabel: "▲ 1 pt vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 45%",
      progressPct: 82,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "unidades-ticket",
      label: "Unidades por ticket",
      info: "Unidades retail vendidas ÷ tickets con al menos una compra retail.",
      value: "1.4 uds",
      deltaLabel: "▲ 0.1 vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 1.6",
      progressPct: 88,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "sell-through-sku",
      label: "Sell-through por SKU",
      info: "Unidades vendidas ÷ unidades disponibles, promedio por SKU en el periodo.",
      value: "62%",
      deltaLabel: "▲ 3 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 70%",
      progressPct: 89,
      semaphore: "yellow" as Semaphore,
    },
  ],
};

export const ANALYTICS_EQUIPO = {
  nivel1: {
    id: "ingreso-hora-esteticista",
    label: "Ingreso por hora de esteticista",
    info: "Ingreso de servicios ÷ horas trabajadas por el equipo de esteticistas.",
    value: "$742 MXN/h",
    deltaLabel: "▲ 5% vs. mes anterior",
    deltaTone: "positive" as DeltaTone,
    target: "Objetivo $800/h · 93% de avance",
    progressPct: 93,
    semaphore: "yellow" as Semaphore,
    sparkline: [660, 675, 690, 700, 705, 720, 730, 742],
    href: "/admin/analytics/equipo",
  },
  nivel2: [
    {
      id: "ocupacion-equipo",
      label: "Ocupación",
      info: "Horas booked ÷ horas disponibles, promedio del equipo.",
      value: "76%",
      deltaLabel: "▲ 2 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 80%",
      progressPct: 95,
      semaphore: "green" as Semaphore,
    },
    {
      id: "attach-equipo",
      label: "Attach",
      info: "Attach retail promedio del equipo de esteticistas.",
      value: "34%",
      deltaLabel: "▲ 4 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 40%",
      progressPct: 85,
      semaphore: "yellow" as Semaphore,
    },
    {
      id: "rebooking-equipo",
      label: "Rebooking",
      info: "Rebooking promedio del equipo de esteticistas.",
      value: "62%",
      deltaLabel: "▲ 2 pts vs. mes anterior",
      deltaTone: "positive" as DeltaTone,
      target: "Objetivo 65%",
      progressPct: 95,
      semaphore: "green" as Semaphore,
    },
    {
      id: "comision-pct-ingreso",
      label: "Comisión como % del ingreso",
      info: "Comisiones de servicio + retail ÷ ingreso neto del periodo.",
      value: "11%",
      deltaLabel: "− sin cambio vs. mes anterior",
      deltaTone: "neutral" as DeltaTone,
      target: "Objetivo ≤ 12%",
      progressPct: 92,
      semaphore: "green" as Semaphore,
    },
  ],
};

// ---------------------------------------------------------------------------
// Admin — Control (Aprobaciones · Anomalías · Historial · Incidentes clínicos)
// ---------------------------------------------------------------------------
export const CLINICAL_INCIDENTS = [
  {
    id: "inc-1",
    client: "Renata Lugo",
    type: "Reacción alérgica leve",
    protocol: "Purify",
    esthetician: "Ana Torres",
    date: "2026-09-10",
    status: "Resuelto" as const,
  },
  {
    id: "inc-2",
    client: "Daniela Ponce",
    type: "Malestar durante tratamiento",
    protocol: "Lift",
    esthetician: "Diana Cruz",
    date: "2026-08-22",
    status: "Resuelto" as const,
  },
];

// ---------------------------------------------------------------------------
// Admin — Ventas → Caja y cobros
// ---------------------------------------------------------------------------
export const CASH_CUT_SUMMARY = {
  location: "Roma Norte",
  date: "2026-09-26",
  openedAt: "09:00",
  openedBy: "Camila Ruiz",
  openingFloat: 2000,
  status: "Abierto" as const,
};

export const PAYMENT_METHOD_BREAKDOWN = [
  { method: "Tarjeta", amount: 6200, count: 8 },
  { method: "Efectivo", amount: 1800, count: 3 },
  { method: "Transferencia", amount: 1200, count: 1 },
];

export const CFDI_QUEUE = [
  { id: "cfdi-1", client: "Sofía Marín", amount: 1900, status: "Pendiente de timbrado" as const },
  { id: "cfdi-2", client: "Valentina Reyes", amount: 620, status: "Timbrado" as const },
  { id: "cfdi-3", client: "Camila Fuentes", amount: 850, status: "Timbrado" as const },
];

// ---------------------------------------------------------------------------
// Admin — Equipo → Comisiones (detalle por transacción)
// ---------------------------------------------------------------------------
export const COMMISSION_TRANSACTIONS = [
  { id: "ctx-1", date: "2026-09-21", staff: "Ana Torres", client: "Sofía Marín", concept: "Servicio — Purify (Signature)", base: 1900, ratePct: 12, commission: 228 },
  { id: "ctx-2", date: "2026-09-21", staff: "Ana Torres", client: "Sofía Marín", concept: "Retail — Beauty of Joseon Glow Serum", base: 620, ratePct: 8, commission: 50 },
  { id: "ctx-3", date: "2026-09-21", staff: "Diana Cruz", client: "Camila Fuentes", concept: "Servicio — Targeted", base: 850, ratePct: 12, commission: 102 },
  { id: "ctx-4", date: "2026-09-20", staff: "Camila Ruiz", client: "Renata Lugo", concept: "Retail — Anua Heartleaf Toner", base: 550, ratePct: 8, commission: 44 },
];

// ---------------------------------------------------------------------------
// Admin — Configuración → Objetivos y Permisos
// ---------------------------------------------------------------------------
export const KPI_TARGETS = [
  { kpi: "Ingreso neto (MTD)", target: "$520,000 MXN", vigencia: "2026" },
  { kpi: "Ocupación de cabinas", target: "80%", vigencia: "2026" },
  { kpi: "Attach retail (≤ 7 días)", target: "40%", vigencia: "2026" },
  { kpi: "Rebooking", target: "65%", vigencia: "2026" },
  { kpi: "EBITDA del local", target: "15%", vigencia: "2026" },
  { kpi: "Retención a 90 días", target: "55%", vigencia: "2026" },
];

export const PERMISSIONS_MATRIX = {
  roles: ["Admin", "Gerente de clínica", "Recepción", "Esteticista", "Contador"],
  rows: [
    { area: "Panel y Análisis", access: ["Total", "Total", "—", "—", "Solo lectura"] },
    { area: "Caja y cobros", access: ["Total", "Total", "Cobrar", "—", "Solo lectura"] },
    { area: "Aprobaciones", access: ["Aprobar", "Aprobar", "Solicitar", "Solicitar", "—"] },
    { area: "Clientas (expediente)", access: ["Total", "Total", "Editar", "Ver", "—"] },
    { area: "Configuración", access: ["Total", "Parcial", "—", "—", "—"] },
  ],
};

export const BUSINESS_RULES_EXTRA = {
  commissionServicePct: 12,
  commissionRetailPct: 8,
  anomalyDiscountThresholdPct: 15,
  anomalyRefundThresholdMXN: 1500,
};
