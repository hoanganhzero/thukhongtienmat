ALTER TABLE "admins" ADD COLUMN "classId" TEXT;
CREATE INDEX "admins_classId_idx" ON "admins"("classId");
ALTER TABLE "admins" ADD CONSTRAINT "admins_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
