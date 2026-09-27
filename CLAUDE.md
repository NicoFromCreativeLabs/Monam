@AGENTS.md

# MONAM OS

Client build for Monâm Skin Studio (Mexico City, 2 locations). Full spec, stack, and
structure: see [README.md](README.md). Requirements source of truth lives one level up:
`../MONAM_OS_System_Specification.md` and `../MONAM_Landing_Page_Build_Spec.md` — where
this codebase and those specs disagree, re-read the spec, don't guess.

- `prisma` is pinned to `7.10.0` in package.json, not `latest` — the `latest` dist-tag
  currently resolves to an `8.0.0-rc` prerelease whose dependency graph crashes npm's
  arborist (`Cannot read properties of null (reading 'edgesOut')`). Keep it pinned until
  8.x is out of RC, or re-verify before bumping.
- Data model (`prisma/schema.prisma`) is written and validated (`npx prisma validate`) —
  full domain-by-domain design rationale lives in the architecture plan (ask for it: covers
  why the booking conflict check is a raw-SQL `EXCLUDE` constraint, why ARCO deletion
  anonymizes in place instead of hard-deleting, and the spec-vs-shipped-UI commission
  discrepancy `CommissionRule.calcType` resolves). Not yet migrated against the live
  Supabase project or wired into any page — every screen still reads `lib/mock-data.ts`.
- Prisma 7 requires a driver adapter (no engine-binary mode) and moved connection URLs out
  of `schema.prisma` into `prisma.config.ts` (CLI/migrations, using `DIRECT_URL`) and
  `lib/prisma.ts` (app runtime, using the pooled `DATABASE_URL` via `@prisma/adapter-pg`) —
  don't add `url`/`directUrl` back into the `datasource` block, that's pre-v7 syntax and
  Prisma will refuse to load the config.
- Brand fonts are Google Fonts stand-ins (see README). Don't ship to production without
  swapping in the licensed Riccione/Donatello/Respondent files per spec §12.
