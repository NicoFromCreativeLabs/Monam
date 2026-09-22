import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — server-only, never imported into client components.
// Bypasses RLS: used for privileged operations only (e.g. the technical
// non-exportability constraint on the client database, §10 of the spec,
// is enforced by NOT using this client for any bulk-read path).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
