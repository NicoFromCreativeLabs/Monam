-- Client.phone becomes optional: a retail-counter checkout can create an
-- email-only client account (StaffCheckoutView's "Agregar clienta"), which
-- has no WhatsApp number yet. The existing unique constraint on phone is
-- unaffected — Postgres allows any number of NULLs under a UNIQUE column.

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "phone" DROP NOT NULL;
