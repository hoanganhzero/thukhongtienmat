CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerTransactionId" TEXT NOT NULL,
    "gateway" TEXT,
    "accountNumber" TEXT NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "content" TEXT NOT NULL,
    "transferType" TEXT NOT NULL,
    "transferAmount" DOUBLE PRECISION NOT NULL,
    "referenceCode" TEXT,
    "matchedAssignmentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'unmatched',
    "rawPayload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "bank_transactions_provider_providerTransactionId_key"
ON "bank_transactions"("provider", "providerTransactionId");

CREATE INDEX "bank_transactions_accountNumber_transactionDate_idx"
ON "bank_transactions"("accountNumber", "transactionDate");

CREATE INDEX "bank_transactions_matchedAssignmentId_idx"
ON "bank_transactions"("matchedAssignmentId");

UPDATE "fee_assignments" AS fa
SET "qrContent" = CONCAT('TN26 ', s."studentCode", ' ', ft."name")
FROM "students" AS s, "fee_types" AS ft
WHERE fa."studentId" = s."id" AND fa."feeTypeId" = ft."id";
