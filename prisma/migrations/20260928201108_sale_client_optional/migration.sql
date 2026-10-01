-- Reconstructed record (see 20260928200940_sale_appointment_link's note).
-- Kept nullable in schema.prisma on purpose: a walk-in retail sale with no
-- client record attached is a real, already-built checkout flow
-- (StaffCheckoutView), not leftover ecommerce scope.
ALTER TABLE "sales" ALTER COLUMN "clientId" DROP NOT NULL;
