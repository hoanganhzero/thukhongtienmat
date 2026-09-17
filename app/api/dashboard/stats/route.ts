export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const [totalStudents, totalPending, totalUploaded, totalConfirmed, totalRejected, campuses, recentUploaded] = await Promise.all([
      prisma.student.count(),
      prisma.feeAssignment.count({ where: { status: 'pending' } }),
      prisma.feeAssignment.count({ where: { status: 'uploaded' } }),
      prisma.feeAssignment.count({ where: { status: 'confirmed' } }),
      prisma.feeAssignment.count({ where: { status: 'rejected' } }),
      prisma.campus.findMany({
        include: {
          classes: {
            include: {
              students: {
                include: {
                  feeAssignments: { select: { status: true, amount: true } },
                },
              },
            },
          },
        },
      }),
      prisma.feeAssignment.findMany({
        where: { status: 'uploaded' },
        take: 10,
        orderBy: { updatedAt: 'desc' },
        include: {
          student: { include: { class: true } },
          feeType: true,
          paymentProofs: true,
        },
      }),
    ]);

    // Stats by campus
    const campusStats = campuses.map((c: any) => {
      let totalAmount = 0;
      let confirmedAmount = 0;
      let studentCount = 0;
      for (const cls of c.classes ?? []) {
        for (const s of cls.students ?? []) {
          studentCount++;
          for (const fa of s.feeAssignments ?? []) {
            totalAmount += fa.amount ?? 0;
            if (fa.status === 'confirmed') confirmedAmount += fa.amount ?? 0;
          }
        }
      }
      return { id: c.id, name: c.name, studentCount, totalAmount, confirmedAmount };
    });

    // Sums
    const totalAmountAll = await prisma.feeAssignment.aggregate({ _sum: { amount: true } });
    const confirmedAmountAll = await prisma.feeAssignment.aggregate({ where: { status: 'confirmed' }, _sum: { amount: true } });

    return NextResponse.json({
      totalStudents,
      totalPending,
      totalUploaded,
      totalConfirmed,
      totalRejected,
      totalAmount: totalAmountAll._sum?.amount ?? 0,
      confirmedAmount: confirmedAmountAll._sum?.amount ?? 0,
      campusStats,
      recentUploaded,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
