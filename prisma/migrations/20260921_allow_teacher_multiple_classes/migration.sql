CREATE TABLE IF NOT EXISTS "admin_classes" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_classes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_classes_adminId_classId_key"
  ON "admin_classes"("adminId", "classId");
CREATE INDEX IF NOT EXISTS "admin_classes_classId_idx"
  ON "admin_classes"("classId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_classes_adminId_fkey') THEN
    ALTER TABLE "admin_classes" ADD CONSTRAINT "admin_classes_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_classes_classId_fkey') THEN
    ALTER TABLE "admin_classes" ADD CONSTRAINT "admin_classes_classId_fkey"
      FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

INSERT INTO "admin_classes" ("id", "adminId", "classId")
SELECT 'adminclass_' || md5(a."id" || ':' || a."classId"), a."id", a."classId"
FROM "admins" a
WHERE a."classId" IS NOT NULL
ON CONFLICT ("adminId", "classId") DO NOTHING;

INSERT INTO "admin_classes" ("id", "adminId", "classId")
SELECT 'adminclass_' || md5(a."id" || ':' || c."id"), a."id", c."id"
FROM "admins" a
JOIN "classes" c ON c."teacherName" = a."fullName"
WHERE a."role" = 'teacher'
ON CONFLICT ("adminId", "classId") DO NOTHING;
