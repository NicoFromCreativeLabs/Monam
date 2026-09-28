// Features that are built but deliberately not shown right now. Flip back
// to true to bring one back — the UI/logic stays in the codebase behind
// this flag instead of being deleted and having to be rebuilt later.

// CFDI (Mexican electronic invoicing) needs a PAC vendor decision (spec
// §14, still open) before it should appear anywhere a real client or the
// accountant would see it — turned off everywhere: the checkout receipt
// and the admin Caja y cobros summary.
export const CFDI_ENABLED = false;
