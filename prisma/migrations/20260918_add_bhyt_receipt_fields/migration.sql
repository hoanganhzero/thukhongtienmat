ALTER TABLE "fee_assignments"
  ADD COLUMN "paidAt" TIMESTAMP(3),
  ADD COLUMN "bhytCategory" TEXT,
  ADD COLUMN "bhytMonths" INTEGER,
  ADD COLUMN "bhytNote" TEXT;

CREATE INDEX "fee_assignments_bhytCategory_idx" ON "fee_assignments"("bhytCategory");

UPDATE "fee_assignments" SET "paidAt" = "updatedAt" WHERE "status" = 'confirmed' AND "paidAt" IS NULL;
