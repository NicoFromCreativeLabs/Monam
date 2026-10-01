-- Reconstructed record: this migration was applied directly to the live
-- database during an earlier Commerce pass whose code got reverted; its
-- folder was deleted along with that revert, leaving `_prisma_migrations`
-- pointing at a name with no local file. Recreated here, matching the live
-- schema exactly (via `prisma db pull`), to reconcile migration history.
-- The column itself is kept and back in schema.prisma — it's genuinely
-- needed (lets getPendingCheckouts() tell a charged appointment from a
-- still-pending one), not leftover ecommerce scope.
ALTER TABLE "sales" ADD COLUMN "appointmentId" TEXT;

CREATE UNIQUE INDEX "sales_appointmentId_key" ON "sales"("appointmentId");

ALTER TABLE "sales" ADD CONSTRAINT "sales_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
