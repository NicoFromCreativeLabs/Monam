import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

// This project follows Next.js's own convention (.env.local for real,
// gitignored values), not plain dotenv's default of a bare ".env" — load
// that file explicitly rather than relying on the package's default.
config({ path: ".env.local" });

// Prisma 7: the CLI (migrate/introspect/studio) reads its connection from
// here, not from schema.prisma. This must be the DIRECT (non-pooled, port
// 5432) Supabase connection — migrations run DDL, and Supavisor's pooled
// connection (port 6543, used by the app at runtime via lib/prisma.ts)
// can't reliably run CREATE EXTENSION/ALTER TABLE.
//
// `env()` throws immediately if the var is unset, and this object literal
// is evaluated just to *load* the config — including for `prisma generate`,
// which never touches the datasource. Not migrated against Supabase yet, so
// DIRECT_URL isn't configured anywhere; fall back to undefined instead of
// crashing generate, and let migrate/db commands fail with Prisma's own
// missing-connection error if someone runs them before it's set.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : undefined,
  },
});
