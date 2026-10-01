-- Reconstructed record (see 20260928200940_sale_appointment_link's note).
-- Unlike the other two reconstructed migrations, this one is NOT reverted —
-- Warehouse is a genuine third inventory ledger (sealed bulk stock not yet
-- moved to Piso/Backbar, spec §5.3), restored intentionally in schema.prisma.
ALTER TYPE "Ledger" ADD VALUE IF NOT EXISTS 'WAREHOUSE';
