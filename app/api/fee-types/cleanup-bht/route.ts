export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { DEFAULT_PAYMENT_ACCOUNT } from '@/lib/payment-account';

export async function POST() {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });

    const existing = await prisma.feeType.findFirst({ where: { name: { equals: 'BHTT', mode: 'insensitive' } } });
    const feeType = existing
      ? await prisma.feeType.update({ where: { id: existing.id }, data: { ...DEFAULT_PAYMENT_ACCOUNT, isActive: true } })
      : await prisma.feeType.create({ data: { name: 'BHTT', description: 'Bảo hiểm tai nạn', amount: 100000, ...DEFAULT_PAYMENT_ACCOUNT, isActive: true } });

    return NextResponse.json({ success: true, feeType, bank: DEFAULT_PAYMENT_ACCOUNT });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể cấu hình khoản BHTT' }, { status: 500 });
  }
}
