export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const KEY = 'competition_board_v1';
const allowedRoles = ['super_admin', 'accountant', 'treasurer', 'teacher'];

async function currentUser() {
  const session = await auth();
  const user = session?.user as any;
  if (!user || user.role !== 'admin' || !allowedRoles.includes(user.adminRole)) return null;
  return user;
}

export async function GET() {
  try {
    if (!(await currentUser())) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const setting = await prisma.appSetting.findUnique({ where: { key: KEY } });
    return NextResponse.json(setting?.value ? JSON.parse(setting.value) : { periods: {} });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi tải bảng thi đua' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await currentUser())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const payload = await request.json();
    if (!payload || typeof payload !== 'object' || typeof payload.period !== 'string' || !payload.scores || typeof payload.scores !== 'object') {
      return NextResponse.json({ error: 'Dữ liệu bảng thi đua không hợp lệ' }, { status: 400 });
    }
    const current = await prisma.appSetting.findUnique({ where: { key: KEY } });
    const data = current?.value ? JSON.parse(current.value) : { periods: {} };
    data.periods = data.periods ?? {};
    data.periods[payload.period] = {
      scores: payload.scores,
      updatedAt: new Date().toISOString(),
    };
    await prisma.appSetting.upsert({
      where: { key: KEY },
      update: { value: JSON.stringify(data) },
      create: { key: KEY, value: JSON.stringify(data) },
    });
    return NextResponse.json({ success: true, period: payload.period });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi lưu bảng thi đua' }, { status: 500 });
  }
}
