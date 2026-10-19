-- Archived staff: hidden from the roster, history kept. Purely additive.

-- AlterTable
ALTER TABLE "app_users" ADD COLUMN     "archivedAt" TIMESTAMP(3);
