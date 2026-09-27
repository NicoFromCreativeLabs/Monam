-- Security fix: every table below was created with Row Level Security OFF,
-- which is Postgres's default. Supabase auto-exposes every public-schema
-- table over its PostgREST REST API to the `anon`/`authenticated` Postgres
-- roles unless RLS is enabled — and the anon key is *meant* to be public
-- (it ships in the client JS bundle), so with RLS off, anyone who loads
-- monam.mx can read, insert, update, and delete every row in every table
-- (staff records including salaries, client PII, sales, commissions, and
-- the audit log itself) with zero authentication. Confirmed live via direct
-- PostgREST calls before writing this migration.
--
-- ENABLE ROW LEVEL SECURITY (not FORCE) is deliberate: it blocks the
-- `anon`/`authenticated` roles PostgREST connects as, while leaving the
-- app's own path untouched — Prisma connects via DATABASE_URL/DIRECT_URL
-- as the table owner, and table owners always bypass RLS regardless of
-- ENABLE, by Postgres design (architecture plan principle #5: "Prisma ...
-- bypasses RLS for the main app path"). No policies are added here on
-- purpose — default-deny. Nothing in this codebase queries Postgres via
-- the Supabase JS client's `.from()` (confirmed: only used for Auth), so
-- there is no legitimate access path this migration could break.

ALTER TABLE "add_on_protocols" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "add_ons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "alerts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "anomaly_flags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "app_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "approval_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cash_register_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cfdi_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_preferences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_skin_ids" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "clinical_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_payout_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "commission_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consent_document_versions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deposits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kpi_targets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "package_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "package_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "package_redemptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "protocol_ingredients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "protocol_retail_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "protocols" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "retail_recommendation_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sale_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sales" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "staff_location_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "treatment_records" ENABLE ROW LEVEL SECURITY;
