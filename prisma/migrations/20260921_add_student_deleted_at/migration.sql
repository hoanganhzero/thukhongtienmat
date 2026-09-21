ALTER TABLE "students" ADD COLUMN "deletedAt" TIMESTAMP(3);
CREATE INDEX "students_deletedAt_idx" ON "students"("deletedAt");
