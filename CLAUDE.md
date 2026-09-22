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
- Data model (prisma/schema.prisma) is intentionally unwritten — design it from spec §5
  and get it reviewed before generating migrations; it underpins RBAC, audit logging, and
  the two-ledger inventory split, so getting it wrong is expensive to unwind.
- Brand fonts are Google Fonts stand-ins (see README). Don't ship to production without
  swapping in the licensed Riccione/Donatello/Respondent files per spec §12.
