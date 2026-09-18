export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as any)?.adminRole !== 'super_admin') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const { id } = await params;
  const data = await request.json();
  const update: any = { fullName: String(data.fullName ?? '').trim(), role: data.role, campusId: data.campusId || null, classId: data.role === 'teacher' ? data.classId || null : null };
  if (!update.fullName || !['super_admin', 'accountant', 'treasurer', 'teacher'].includes(update.role)) return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
  if (update.role === 'teacher' && !update.classId) return NextResponse.json({ error: 'Giáo viên phải được phân công lớp' }, { status: 400 });
  if (data.password) {
    if (String(data.password).length < 6) return NextResponse.json({ error: 'Mật khẩu tối thiểu 6 ký tự' }, { status: 400 });
    update.passwordHash = await bcrypt.hash(String(data.password), 10);
  }
  return NextResponse.json(await prisma.admin.update({ where: { id }, data: update }));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const user = session?.user as any;
  if (user?.adminRole !== 'super_admin') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
  const { id } = await params;
  if (id === user.id) return NextResponse.json({ error: 'Không thể xóa tài khoản đang đăng nhập' }, { status: 400 });
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Không tìm thấy tài khoản' }, { status: 404 });
  if (target.role === 'super_admin' && await prisma.admin.count({ where: { role: 'super_admin' } }) <= 1) return NextResponse.json({ error: 'Phải giữ lại ít nhất một quản trị tối cao' }, { status: 400 });
  await prisma.admin.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
