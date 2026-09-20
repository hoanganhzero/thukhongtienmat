export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole !== 'super_admin') return NextResponse.json({ error: 'Chỉ quản trị tối cao được nhập lớp' }, { status: 403 });
    const body = await request.json();
    const rows = Array.isArray(body?.classes) ? body.classes.slice(0, 500) : [];
    if (!rows.length) return NextResponse.json({ error: 'Danh sách lớp trống' }, { status: 400 });

    const seen = new Set<string>();
    for (const [index, row] of rows.entries()) {
      const name = String(row?.name ?? '').trim();
      const campusId = String(row?.campusId ?? '').trim();
      const schoolYear = String(row?.schoolYear ?? '2025-2026').trim();
      const key = `${name.toLowerCase()}|${campusId}|${schoolYear.toLowerCase()}`;
      if (!name || !campusId) return NextResponse.json({ error: `Thiếu tên lớp/cơ sở tại dòng ${index + 2}` }, { status: 400 });
      if (seen.has(key)) return NextResponse.json({ error: `Trùng lớp ${name} tại dòng ${index + 2}` }, { status: 400 });
      seen.add(key);
    }

    const result = await prisma.$transaction(rows.map((row: any) => {
      const name = String(row.name).trim();
      const campusId = String(row.campusId).trim();
      const schoolYear = String(row.schoolYear ?? '2025-2026').trim();
      return prisma.class.upsert({
        where: { name_campusId_schoolYear: { name, campusId, schoolYear } },
        update: { teacherName: String(row.teacherName ?? '').trim() || null },
        create: { name, campusId, schoolYear, teacherName: String(row.teacherName ?? '').trim() || null },
      });
    }));
    return NextResponse.json({ imported: result.length });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể nhập danh sách lớp' }, { status: 500 });
  }
}
