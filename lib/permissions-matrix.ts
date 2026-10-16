import { PERMISSIONS_MATRIX } from "@/lib/mock-data";

// Reference matrix shown in Configuración → Permisos por rol. Pure (no
// database access) so the settings page, the save action and the tests share
// one definition. What each role can really do is enforced in code
// (lib/auth/dal.ts); this matrix is the documented/agreed version of it.
export const PERMISSION_ROLES: string[] = PERMISSIONS_MATRIX.roles;
export const PERMISSION_OPTIONS = ["—", "Ver", "Solicitar", "Cobrar", "Editar", "Aprobar", "Parcial", "Total"] as const;

// Index of the Admin (Owner) column — locked so nobody can lower their own
// access from this screen.
export const ADMIN_COLUMN = 0;

export interface PermissionRow {
  area: string;
  access: string[];
}

export function defaultPermissionRows(): PermissionRow[] {
  return PERMISSIONS_MATRIX.rows.map((row) => ({ area: row.area, access: [...row.access] }));
}

function isValidAccess(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === PERMISSION_ROLES.length &&
    value.every((v) => (PERMISSION_OPTIONS as readonly string[]).includes(v))
  );
}

// Starts from the defaults and applies whatever valid edits were stored, so a
// missing, partial or tampered value can never produce a broken matrix.
export function normalizePermissionRows(stored: unknown): PermissionRow[] {
  const rows = defaultPermissionRows();
  if (!Array.isArray(stored)) return rows;
  for (const item of stored) {
    if (!item || typeof item !== "object") continue;
    const { area, access } = item as { area?: unknown; access?: unknown };
    const target = rows.find((r) => r.area === area);
    if (!target || !isValidAccess(access)) continue;
    target.access = target.access.map((current, i) => (i === ADMIN_COLUMN ? current : access[i]));
  }
  return rows;
}
