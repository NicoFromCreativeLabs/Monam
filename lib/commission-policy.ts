// Who earns commission on what. The esthetician is paid only on the retail
// products she recommended during the treatment (and that were sold); the
// service and the add-ons she performs earn her nothing. Pure, so the checkout
// and the tests share it.
export type CommissionBasisKind = "SERVICE" | "ADD_ON" | "RETAIL" | "PACKAGE";

export function earnsCommission(basis: CommissionBasisKind, role: string): boolean {
  if (role === "ESTHETICIAN") return basis === "RETAIL";
  return true;
}
