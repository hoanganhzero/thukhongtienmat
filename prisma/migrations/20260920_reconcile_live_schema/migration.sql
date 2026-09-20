-- Reconcile columns and indexes required by the current Prisma schema.
-- This migration is additive only: it never deletes production data.

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "cccd" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "passwordIsDefault" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "admins" ADD COLUMN IF NOT EXISTS "classId" TEXT;

ALTER TABLE "fee_assignments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "fee_assignments" ADD COLUMN IF NOT EXISTS "bhytCategory" TEXT;
ALTER TABLE "fee_assignments" ADD COLUMN IF NOT EXISTS "bhytMonths" INTEGER;
ALTER TABLE "fee_assignments" ADD COLUMN IF NOT EXISTS "bhytNote" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "students_cccd_key" ON "students"("cccd");
CREATE UNIQUE INDEX IF NOT EXISTS "classes_name_campusId_schoolYear_key" ON "classes"("name", "campusId", "schoolYear");
CREATE INDEX IF NOT EXISTS "admins_classId_idx" ON "admins"("classId");
CREATE INDEX IF NOT EXISTS "fee_assignments_bhytCategory_idx" ON "fee_assignments"("bhytCategory");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admins_classId_fkey'
  ) THEN
    ALTER TABLE "admins"
      ADD CONSTRAINT "admins_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "classes"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
