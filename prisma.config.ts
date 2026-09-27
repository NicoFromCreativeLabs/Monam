import { config } from "dotenv";
import { defineConfig } from "prisma/config";

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
// Deliberately `process.env.DIRECT_URL` here, not Prisma's own `env()`
// helper — `env()` throws immediately if the variable is unset, which broke
// `prisma generate` (part of the build script below) on Netlify before any
// database is connected there. `generate` never needs a real connection, so
// this must tolerate being undefined; a command that actually needs one
// (`migrate`, `db`) still fails on its own with Prisma's own clear error.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
