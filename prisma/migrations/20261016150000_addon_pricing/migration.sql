-- Add-on pricing. Purely additive: existing add-ons keep price 0 (included),
-- and the new table starts empty. Nothing existing changes behavior.

-- AlterTable
ALTER TABLE "add_ons" ADD COLUMN     "priceMxn" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "appointment_add_ons" (
    "appointmentId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "priceMxn" INTEGER NOT NULL,

    CONSTRAINT "appointment_add_ons_pkey" PRIMARY KEY ("appointmentId","addOnId")
);

-- AddForeignKey
ALTER TABLE "appointment_add_ons" ADD CONSTRAINT "appointment_add_ons_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_add_ons" ADD CONSTRAINT "appointment_add_ons_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "add_ons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-deny, like every other table (see enable_rls_default_deny): the app
-- reads and writes through Prisma server-side only.
ALTER TABLE "appointment_add_ons" ENABLE ROW LEVEL SECURITY;
