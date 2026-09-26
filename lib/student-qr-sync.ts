import { prisma } from '@/lib/prisma';
import { generateQrContent } from '@/lib/utils';

export async function refreshStudentQrContent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { class: true, feeAssignments: { include: { feeType: true } } },
  });
  if (!student || !student.feeAssignments.length) return 0;

  const duplicateCount = await prisma.student.count({
    where: { classId: student.classId, fullName: student.fullName, NOT: { id: student.id } },
  });
  const duplicateNameSuffix = duplicateCount > 0
    ? student.studentCode.split('').filter((char) => char >= '0' && char <= '9').join('').slice(-3)
    : undefined;

  await prisma.$transaction(student.feeAssignments.map((assignment) =>
    prisma.feeAssignment.update({
      where: { id: assignment.id },
      data: {
        qrContent: generateQrContent(
          assignment.feeType.name,
          student.studentCode,
          student.fullName,
          student.class.name,
          assignment.feeType.bankName,
          duplicateNameSuffix,
        ),
      },
    }),
  ));

  return student.feeAssignments.length;
}
