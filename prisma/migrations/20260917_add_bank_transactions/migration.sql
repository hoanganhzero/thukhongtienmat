-- CreateTable
CREATE TABLE "campuses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "schoolYear" TEXT NOT NULL,
    "teacherName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentCode" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "phone" TEXT,
    "parentPhone" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "zaloPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bankAccountNumber" TEXT,
    "bankAccountName" TEXT,
    "bankName" TEXT NOT NULL DEFAULT 'Agribank',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_assignments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeTypeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "academicYear" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "qrContent" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fee_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
CREATE TABLE "payment_proofs" (
    "id" TEXT NOT NULL,
    "feeAssignmentId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "cloudStoragePath" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "payment_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "feeAssignmentId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'reminder',
    "channel" TEXT NOT NULL DEFAULT 'website',
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "campusId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "password" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE INDEX "classes_campusId_idx" ON "classes"("campusId");

-- CreateIndex
CREATE UNIQUE INDEX "students_studentCode_key" ON "students"("studentCode");

-- CreateIndex
CREATE INDEX "students_classId_idx" ON "students"("classId");

-- CreateIndex
CREATE INDEX "students_phone_idx" ON "students"("phone");

-- CreateIndex
CREATE INDEX "fee_assignments_studentId_idx" ON "fee_assignments"("studentId");

-- CreateIndex
CREATE INDEX "fee_assignments_feeTypeId_idx" ON "fee_assignments"("feeTypeId");

-- CreateIndex
CREATE INDEX "fee_assignments_status_idx" ON "fee_assignments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_assignments_studentId_feeTypeId_academicYear_key" ON "fee_assignments"("studentId", "feeTypeId", "academicYear");

-- CreateIndex
CREATE INDEX "bank_transactions_accountNumber_transactionDate_idx" ON "bank_transactions"("accountNumber", "transactionDate");

-- CreateIndex
CREATE INDEX "bank_transactions_matchedAssignmentId_idx" ON "bank_transactions"("matchedAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_provider_providerTransactionId_key" ON "bank_transactions"("provider", "providerTransactionId");

-- CreateIndex
CREATE INDEX "payment_proofs_feeAssignmentId_idx" ON "payment_proofs"("feeAssignmentId");

-- CreateIndex
CREATE INDEX "notifications_studentId_idx" ON "notifications"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_key" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assignments" ADD CONSTRAINT "fee_assignments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_assignments" ADD CONSTRAINT "fee_assignments_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "fee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_proofs" ADD CONSTRAINT "payment_proofs_feeAssignmentId_fkey" FOREIGN KEY ("feeAssignmentId") REFERENCES "fee_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_feeAssignmentId_fkey" FOREIGN KEY ("feeAssignmentId") REFERENCES "fee_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill QR content for fee assignments created before automatic bank matching.
UPDATE "fee_assignments" AS fa
SET "qrContent" = CONCAT('TN26 ', s."studentCode", ' ', ft."name")
FROM "students" AS s, "fee_types" AS ft
WHERE fa."studentId" = s."id" AND fa."feeTypeId" = ft."id";
