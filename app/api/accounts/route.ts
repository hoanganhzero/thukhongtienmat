export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

async function isSuperAdmin() {
  return ((await auth())?.user as any)?.adminRole === 'super_admin';
}

export async function GET() {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  return NextResponse.json(await prisma.admin.findMany({
    select: { id: true, username: true, fullName: true, role: true, campusId: true, classId: true, campus: { select: { name: true } }, class: { select: { name: true } } },
    orderBy: { fullName: 'asc' },
  }));
}

export async function POST(request: Request) {
  if (!(await isSuperAdmin())) return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const data = await request.json();
  const username = String(data.username ?? '').trim();
  const password = String(data.password ?? '');
  const fullName = String(data.fullName ?? '').trim();
  const roles = ['super_admin', 'accountant', 'treasurer', 'teacher'];
  if (!username || !fullName || password.length < 6 || !roles.includes(data.role)) return NextResponse.json({ error: 'Thông tin chưa hợp lệ; mật khẩu tối thiểu 6 ký tự' }, { status: 400 });
  if (data.role === 'teacher' && !data.classId) return NextResponse.json({ error: 'Giáo viên phải được phân công lớp' }, { status: 400 });
  try {
    return NextResponse.json(await prisma.admin.create({ data: { username, fullName, role: data.role, passwordHash: await bcrypt.hash(password, 10), campusId: data.campusId || null, classId: data.role === 'teacher' ? data.classId : null } }));
  } catch (error: any) {
    return NextResponse.json({ error: error?.code === 'P2002' ? 'Tên đăng nhập đã tồn tại' : 'Không thể tạo tài khoản' }, { status: 400 });
  }
}
