-- Remove only records created by the original demo seed.
-- Real records with other identifiers are preserved.

DELETE FROM "notifications"
WHERE "studentId" IN (
  SELECT "id" FROM "students" WHERE "studentCode" ~ '^HS00(0[1-9]|[1-3][0-9]|40)$'
);

DELETE FROM "payment_proofs"
WHERE "feeAssignmentId" IN (
  SELECT fa."id" FROM "fee_assignments" fa
  JOIN "students" s ON s."id" = fa."studentId"
  WHERE s."studentCode" ~ '^HS00(0[1-9]|[1-3][0-9]|40)$'
);

UPDATE "bank_transactions" SET "matchedAssignmentId" = NULL, "status" = 'unmatched'
WHERE "matchedAssignmentId" IN (
  SELECT fa."id" FROM "fee_assignments" fa
  JOIN "students" s ON s."id" = fa."studentId"
  WHERE s."studentCode" ~ '^HS00(0[1-9]|[1-3][0-9]|40)$'
);

DELETE FROM "fee_assignments"
WHERE "studentId" IN (
  SELECT "id" FROM "students" WHERE "studentCode" ~ '^HS00(0[1-9]|[1-3][0-9]|40)$'
);

DELETE FROM "students" WHERE "studentCode" ~ '^HS00(0[1-9]|[1-3][0-9]|40)$';

UPDATE "admins" SET "classId" = NULL
WHERE "classId" IN ('class-10a1', 'class-10a2', 'class-11a1', 'class-11a2', 'class-12a1', 'class-12a2', 'class-10b1', 'class-11b1', 'class-12b1', 'class-10c1');

DELETE FROM "classes"
WHERE "id" IN ('class-10a1', 'class-10a2', 'class-11a1', 'class-11a2', 'class-12a1', 'class-12a2', 'class-10b1', 'class-11b1', 'class-12b1', 'class-10c1')
AND NOT EXISTS (SELECT 1 FROM "students" WHERE "students"."classId" = "classes"."id");

UPDATE "admins" SET "campusId" = NULL
WHERE "campusId" IN ('trụ-sở-chính', 'phân-hiệu-tân-ninh', 'điểm-trường-hòa-thành', 'điểm-trường-châu-thành');

DELETE FROM "campuses"
WHERE "id" IN ('trụ-sở-chính', 'phân-hiệu-tân-ninh', 'điểm-trường-hòa-thành', 'điểm-trường-châu-thành')
AND NOT EXISTS (SELECT 1 FROM "classes" WHERE "classes"."campusId" = "campuses"."id");

DELETE FROM "admins" WHERE "username" = 'ketoan' AND "fullName" = 'Thủ quỹ / Kế toán';
