-- Older MB Bank Excel imports were parsed as UTC although the source time is Vietnam time.
UPDATE "bank_transactions"
SET "transactionDate" = "transactionDate" - INTERVAL '7 hours'
WHERE "provider" = 'sepay-excel' AND "transactionDate" IS NOT NULL;
