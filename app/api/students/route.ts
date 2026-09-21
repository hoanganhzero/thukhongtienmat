export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import bcrypt from 'bcryptjs';
import { teacherClassIds } from '@/lib/teacher-scope';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin') return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('classId');
    const campusId = searchParams.get('campusId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '50');
    const showDeleted = searchParams.get('deleted') === '1' && user.adminRole !== 'teacher';

    const where: any = { deletedAt: showDeleted ? { not: null } : null };
    if (user.adminRole === 'teacher') {
      const classIds = teacherClassIds(user);
      if (!classIds.length) return NextResponse.json({ error: 'Tài khoản chưa được phân công lớp' }, { status: 403 });
      where.classId = { in: classIds };
    } else if (classId) where.classId = classId;
    if (user.adminRole !== 'teacher' && campusId) where.class = { campusId };
    if (search) {
      where.OR = [
        { studentCode: { contains: search } },
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const allStudents = await prisma.student.findMany({
      where,
      include: { class: { include: { campus: true } } },
    });

    // Sorting rule: class -> given name (last word) -> family name and middle name -> student code.
    const sortText = (value: string) => value.trim().normalize('NFC');
    const getGivenName = (value: string) => {
      const words = sortText(value).split(/\\s+/).filter(Boolean);
      return words.at(-1) ?? '';
    };
    const compareVietnamese = (a: string, b: string) =>
      a.localeCompare(b, 'vi', { sensitivity: 'base', numeric: true });

    allStudents.sort((a, b) => {
      const classCompare = compareVietnamese(a.class?.name ?? '', b.class?.name ?? '');
      if (classCompare !== 0) return classCompare;

      const givenNameCompare = compareVietnamese(getGivenName(a.fullName), getGivenName(b.fullName));
      if (givenNameCompare !== 0) return givenNameCompare;

      const fullNameCompare = compareVietnamese(sortText(a.fullName), sortText(b.fullName));
      if (fullNameCompare !== 0) return fullNameCompare;

      return compareVietnamese(a.studentCode, b.studentCode);
    });

    const total = allStudents.length;
    const students = allStudents.slice((page - 1) * limit, page * limit);
    return NextResponse.json({ students, total, page, limit });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const user = session?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const data = await request.json();
    const cccd = String(data.cccd ?? '').trim() || null;
    const hash = await bcrypt.hash(data.studentCode, 10);
    const student = await prisma.student.create({
      data: {
        studentCode: data.studentCode,
        cccd,
        fullName: data.fullName,
        classId: data.classId,
        phone: data.phone,
        parentPhone: data.parentPhone,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        passwordHash: hash,
        passwordIsDefault: true,
        zaloPhone: data.zaloPhone,
      },
    });
    return NextResponse.json(student);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Lỗi' }, { status: 500 });
  }
}
