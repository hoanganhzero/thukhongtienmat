export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

const bank = {
  bankName: 'VietinBank',
  bankAccountNumber: '108869921106',
  bankAccountName: 'TRAN QUOC HOANG ANH',
};

export async function POST() {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') {
      return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    }

    const feeTypes = await prisma.feeType.findMany({ include: { feeAssignments: { select: { id: true, status: true } } } });
    const bhtTypes = feeTypes.filter((feeType) => /BHTT?|BHT/i.test(feeType.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '')));
    const primary = bhtTypes[0] ?? await prisma.feeType.create({
      data: { name: 'BHTT', description: 'Bảo hiểm tai nạn', amount: 100000, ...bank, isActive: true },
      include: { feeAssignments: { select: { id: true, status: true } } },
    });

    await prisma.feeType.update({ where: { id: primary.id }, data: { ...bank, isActive: true } });
    for (const feeType of bhtTypes.slice(1)) {
      await prisma.feeType.update({ where: { id: feeType.id }, data: { ...bank, isActive: false } });
    }

    const removed: string[] = [];
    const protectedTypes: string[] = [];
    for (const feeType of feeTypes) {
      if (feeType.id === primary.id || bhtTypes.some((item) => item.id === feeType.id)) continue;
      if (feeType.feeAssignments.some((assignment) => assignment.status === 'confirmed')) {
        await prisma.feeType.update({ where: { id: feeType.id }, data: { isActive: false } });
        protectedTypes.push(feeType.name);
        continue;
      }
      const assignmentIds = feeType.feeAssignments.map((assignment) => assignment.id);
      await prisma.$transaction(async (tx) => {
        if (assignmentIds.length) {
          await tx.paymentProof.deleteMany({ where: { feeAssignmentId: { in: assignmentIds } } });
          await tx.notification.deleteMany({ where: { feeAssignmentId: { in: assignmentIds } } });
          await tx.feeAssignment.deleteMany({ where: { id: { in: assignmentIds } } });
        }
        await tx.feeType.delete({ where: { id: feeType.id } });
      });
      removed.push(feeType.name);
    }

    return NextResponse.json({ success: true, kept: primary.name, bank, removed, protectedTypes });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể cấu hình khoản BHT' }, { status: 500 });
  }
}
