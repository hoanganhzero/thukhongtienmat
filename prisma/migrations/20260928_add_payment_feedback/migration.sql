CREATE TABLE "feedbacks" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "feeAssignmentId" TEXT,
  "senderId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reply" TEXT,
  "handledBy" TEXT,
  "handledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "feedbacks_studentId_idx" ON "feedbacks"("studentId");
CREATE INDEX "feedbacks_feeAssignmentId_idx" ON "feedbacks"("feeAssignmentId");
CREATE INDEX "feedbacks_status_idx" ON "feedbacks"("status");
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_feeAssignmentId_fkey" FOREIGN KEY ("feeAssignmentId") REFERENCES "fee_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
