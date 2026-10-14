-- Replace SPEI with ONLINE (Stripe) in PaymentMethod: checkout now offers
-- Cash, Card (BBVA Mexico terminal), and Online (Stripe) — SPEI bank
-- transfer is dropped.
ALTER TYPE "PaymentMethod" RENAME VALUE 'SPEI' TO 'ONLINE';
