export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const text = (value: unknown) => String(value ?? '').trim();

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole !== 'super_admin') {
      return NextResponse.json({ error: 'Chỉ quản trị tối cao được nhập tài khoản GVCN' }, { status: 403 });
    }

    const body = await request.json();
    const rows = Array.isArray(body?.rows) ? body.rows.slice(0, 500) : [];
    if (!rows.length) return NextResponse.json({ error: 'Danh sách lớp và GVCN trống' }, { status: 400 });

    const seenClasses = new Set<string>();
    const seenUsernames = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const line = index + 2;
      const name = text(row?.className);
      const campusId = text(row?.campusId);
      const schoolYear = text(row?.schoolYear) || '2025-2026';
      const fullName = text(row?.fullName);
      const username = text(row?.username);
      const password = text(row?.password);
      const classKey = `${name.toLowerCase()}|${campusId}|${schoolYear.toLowerCase()}`;
      const usernameKey = username.toLowerCase();

      if (!name || !campusId || !fullName || !username || !password) {
        return NextResponse.json({ error: `Dòng ${line}: bắt buộc nhập đủ lớp, cơ sở, họ tên, tên đăng nhập và mật khẩu` }, { status: 400 });
      }
      if (password.length < 6) return NextResponse.json({ error: `Dòng ${line}: mật khẩu phải có ít nhất 6 ký tự` }, { status: 400 });
      if (seenClasses.has(classKey)) return NextResponse.json({ error: `Dòng ${line}: trùng lớp, cơ sở và năm học trong tệp` }, { status: 400 });
      if (seenUsernames.has(usernameKey)) return NextResponse.json({ error: `Dòng ${line}: trùng tên đăng nhập trong tệp` }, { status: 400 });
      seenClasses.add(classKey);
      seenUsernames.add(usernameKey);
    }

    const result = await prisma.$transaction(async (tx) => {
      let imported = 0;
      for (const row of rows) {
        const name = text(row.className);
        const campusId = text(row.campusId);
        const schoolYear = text(row.schoolYear) || '2025-2026';
        const fullName = text(row.fullName);
        const username = text(row.username);
        const password = text(row.password);
        const passwordHash = await bcrypt.hash(password, 10);

        const existingClass = await tx.class.findFirst({ where: { name, campusId, schoolYear }, select: { id: true } });
        const classRecord = existingClass
          ? await tx.class.update({ where: { id: existingClass.id }, data: { teacherName: fullName } })
          : await tx.class.create({ data: { name, campusId, schoolYear, teacherName: fullName } });

        await tx.admin.upsert({
          where: { username },
          update: { fullName, role: 'teacher', campusId, classId: classRecord.id, passwordHash },
          create: { username, fullName, role: 'teacher', campusId, classId: classRecord.id, passwordHash },
        });
        imported += 1;
      }
      return imported;
    });

    return NextResponse.json({ imported: result, message: `Đã tạo/cập nhật ${result} lớp và tài khoản GVCN` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.code === 'P2002' ? 'Dữ liệu bị trùng. Vui lòng kiểm tra tên đăng nhập hoặc lớp.' : error?.message ?? 'Không thể nhập hàng loạt' }, { status: 400 });
  }
}
