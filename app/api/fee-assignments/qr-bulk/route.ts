export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { groupPendingFees } from '@/lib/payment-qr';
import { buildVietQrUrl } from '@/lib/utils';

async function getGroups(request: Request, user: any) {
  const { searchParams } = new URL(request.url);
  const where: any = { status: 'pending' };
  if (searchParams.get('feeTypeId')) where.feeTypeId = searchParams.get('feeTypeId');
  if (user.adminRole === 'teacher') {
    if (!user.classId) throw new Error('Tài khoản chưa được phân công lớp');
    where.student = { classId: user.classId };
  } else if (searchParams.get('classId')) where.student = { classId: searchParams.get('classId') };
  if (user.adminRole !== 'teacher' && searchParams.get('campusId')) where.student = { class: { campusId: searchParams.get('campusId') } };

  const assignments = await prisma.feeAssignment.findMany({
    where,
    include: { student: { include: { class: true } }, feeType: true },
    orderBy: [{ student: { class: { name: 'asc' } } }, { student: { fullName: 'asc' } }],
  });
  return groupPendingFees(assignments);
}

export async function GET(request: Request) {
  const user = (await auth())?.user as any;
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const groups = await getGroups(request, user);
  return NextResponse.json(groups.map((group) => ({
    ...group,
    qrUrl: buildVietQrUrl(group.accountNo, group.amount, group.description, group.accountName, group.bankName),
  })));
}

export async function POST(request: Request) {
  const user = (await auth())?.user as any;
  if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const body = await request.json();
  const url = new URL(request.url);
  for (const key of ['feeTypeId', 'classId', 'campusId']) if (body?.[key]) url.searchParams.set(key, body[key]);
  const groups = await getGroups(new Request(url), user);
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? new URL(request.url).origin;

  await prisma.notification.createMany({
    data: groups.map((group) => ({
      studentId: group.studentId,
      type: 'reminder',
      channel: 'website',
      message: `Mời thanh toán ${group.feeNames.join(', ')}: ${group.amount.toLocaleString('vi-VN')}đ. Xem và quét QR tại ${baseUrl}/tra-cuu?q=${encodeURIComponent(group.studentCode)}`,
    })),
  });
  return NextResponse.json({ sent: groups.length });
}
