export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';
import { teacherClassIds } from '@/lib/teacher-scope';

type SummaryRow = {
  id: string;
  name: string;
  campus?: string;
  total: number;
  confirmed: number;
  exempt: number;
  pending: number;
  requiredAmount: number;
  collectedAmount: number;
  remainingAmount: number;
};

function add(row: SummaryRow, item: any) {
  row.total += 1;
  row.requiredAmount += Number(item.amount ?? 0);
  if (item.status === 'confirmed') {
    row.confirmed += 1;
    row.collectedAmount += Number(item.amount ?? 0);
  } else if (item.status === 'exempt') {
    row.exempt += 1;
  } else {
    row.pending += 1;
  }
  row.remainingAmount = row.requiredAmount - row.collectedAmount;
}

function empty(id: string, name: string, campus?: string): SummaryRow {
  return { id, name, campus, total: 0, confirmed: 0, exempt: 0, pending: 0, requiredAmount: 0, collectedAmount: 0, remainingAmount: 0 };
}

export async function GET(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });

    const params = new URL(request.url).searchParams;
    const where: any = {
      feeType: {
        isActive: true,
        bankAccountNumber: DEFAULT_PAYMENT_ACCOUNT.bankAccountNumber,
        name: { contains: 'BHT', mode: 'insensitive' },
      },
    };
    if (user.adminRole === 'teacher') where.student = { classId: { in: teacherClassIds(user) } };
    else if (params.get('classId')) where.student = { classId: params.get('classId') };
    else if (params.get('campusId')) where.student = { class: { campusId: params.get('campusId') } };

    const assignments = await prisma.feeAssignment.findMany({
      where,
      include: { student: { include: { class: { include: { campus: true } } } } },
    });

    const overall = empty('all', 'Toàn trung tâm');
    const campusMap = new Map<string, SummaryRow>();
    const classMap = new Map<string, SummaryRow>();
    for (const item of assignments) {
      add(overall, item);
      const campus = item.student.class.campus;
      const campusRow = campusMap.get(campus.id) ?? empty(campus.id, campus.name);
      add(campusRow, item);
      campusMap.set(campus.id, campusRow);

      const classItem = item.student.class;
      const classRow = classMap.get(classItem.id) ?? empty(classItem.id, classItem.name, campus.name);
      add(classRow, item);
      classMap.set(classItem.id, classRow);
    }

    const sort = (a: SummaryRow, b: SummaryRow) => (a.campus ?? '').localeCompare(b.campus ?? '', 'vi') || a.name.localeCompare(b.name, 'vi', { numeric: true });
    return NextResponse.json({
      overall,
      campuses: [...campusMap.values()].sort(sort),
      classes: [...classMap.values()].sort(sort),
      account: DEFAULT_PAYMENT_ACCOUNT,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể tải báo cáo' }, { status: 500 });
  }
}
