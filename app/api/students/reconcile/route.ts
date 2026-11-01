export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { refreshStudentQrContent } from '@/lib/student-qr-sync';

type Row = { studentCode: string; fullName: string; className: string; dateOfBirth: string; gender: string; schoolStatus: string };
const clean = (value: unknown) => String(value ?? '').trim().replace(/\s+/g, ' ');
const nameKey = (value: string) => clean(value).normalize('NFC').toLocaleLowerCase('vi-VN');
const dateKey = (value: Date | null) => value ? value.toISOString().slice(0, 10) : '';
const activeStatus = (value: string) => /^(đang học|chuyển đến)/i.test(value);

export async function POST(request: Request) {
  try {
    const user = (await auth())?.user as any;
    if (user?.role !== 'admin' || user.adminRole === 'teacher') return NextResponse.json({ error: 'Không có quyền' }, { status: 403 });
    const body = await request.json();
    const rows: Row[] = Array.isArray(body.rows) ? body.rows.slice(0, 5000).map((row: any) => ({
      studentCode: clean(row.studentCode), fullName: clean(row.fullName), className: clean(row.className),
      dateOfBirth: clean(row.dateOfBirth), gender: clean(row.gender), schoolStatus: clean(row.schoolStatus),
    })) : [];
    if (!rows.length) return NextResponse.json({ error: 'Tệp không có học sinh' }, { status: 400 });
    if (rows.length !== body.rows.length) return NextResponse.json({ error: 'Tệp vượt quá 5000 học sinh' }, { status: 400 });

    const [classes, existing] = await Promise.all([
      prisma.class.findMany({ include: { campus: { select: { name: true } } } }),
      prisma.student.findMany({
        select: { id: true, studentCode: true, fullName: true, classId: true, dateOfBirth: true, gender: true,
          deletedAt: true, class: { select: { name: true, campus: { select: { name: true } } } },
          feeAssignments: { select: { status: true, feeType: { select: { name: true } } } } },
      }),
    ]);
    const byClass = new Map<string, typeof classes>();
    for (const cls of classes) byClass.set(nameKey(cls.name), [...(byClass.get(nameKey(cls.name)) ?? []), cls]);
    const byCode = new Map(existing.map((student) => [student.studentCode, student]));
    const byName = new Map<string, typeof existing>();
    for (const student of existing) byName.set(nameKey(student.fullName), [...(byName.get(nameKey(student.fullName)) ?? []), student]);
    const seenCodes = new Set<string>();
    const seenMatches = new Set<string>();
    const review: any[] = [];
    const actions: any[] = [];

    for (const [index, row] of rows.entries()) {
      const source = { line: index + 2, code: row.studentCode, name: row.fullName, sourceClass: row.className, schoolStatus: row.schoolStatus };
      if (!row.studentCode || !row.fullName || !/^\d{4}-\d{2}-\d{2}$/.test(row.dateOfBirth) ||
        Number.isNaN(new Date(row.dateOfBirth).getTime()) || !['Nam', 'Nữ'].includes(row.gender) || !row.className) {
        review.push({ ...source, reason: 'Thiếu hoặc sai mã, ngày sinh, giới tính, lớp' }); continue;
      }
      if (seenCodes.has(row.studentCode)) { review.push({ ...source, reason: 'Trùng mã trong tệp' }); continue; }
      seenCodes.add(row.studentCode);
      const matchingClasses = byClass.get(nameKey(row.className)) ?? [];
      if (matchingClasses.length !== 1) {
        review.push({ ...source, reason: matchingClasses.length ? 'Trùng tên lớp ở nhiều cơ sở' : 'Chưa có lớp trên website' }); continue;
      }
      const target = matchingClasses[0];
      const exact = byCode.get(row.studentCode);
      if (exact && nameKey(exact.fullName) !== nameKey(row.fullName)) {
        review.push({ ...source, currentClass: exact.class.name, reason: 'Mã trùng nhưng họ tên khác' }); continue;
      }
      const candidates = byName.get(nameKey(row.fullName)) ?? [];
      const matchingBirthday = candidates.filter((student) => dateKey(student.dateOfBirth) === row.dateOfBirth);
      const sameClass = candidates.filter((student) => student.classId === target.id && (!student.dateOfBirth || dateKey(student.dateOfBirth) === row.dateOfBirth));
      const match = exact ?? (matchingBirthday.length === 1 ? matchingBirthday[0] : sameClass.length === 1 ? sameClass[0] : undefined);
      if (!match && (candidates.length || !activeStatus(row.schoolStatus))) {
        review.push({ ...source, reason: !activeStatus(row.schoolStatus) ? 'Không còn trạng thái đang học, cần xác minh' : 'Trùng tên hoặc khác lớp/ngày sinh, cần xác minh mã' }); continue;
      }
      if (match && seenMatches.has(match.id)) { review.push({ ...source, currentClass: match.class.name, reason: 'Hai dòng cùng khớp một hồ sơ' }); continue; }
      if (match) seenMatches.add(match.id);
      const confirmed = match?.feeAssignments.some((fee) => fee.status === 'confirmed') ?? false;
      if (!activeStatus(row.schoolStatus)) {
        review.push({ ...source, currentClass: match?.class.name ?? '', paid: confirmed, reason: 'Chuyển đi/thôi học: kiểm tra trước khi xử lý' }); continue;
      }
      if (match?.deletedAt) {
        review.push({ ...source, currentClass: match.class.name, paid: confirmed, reason: 'Hồ sơ đã xóa: kiểm tra trước khi khôi phục' }); continue;
      }
      if (match && match.classId !== target.id && !exact && matchingBirthday.length !== 1) {
        review.push({ ...source, currentClass: match.class.name, paid: confirmed, reason: 'Đổi lớp nhưng mã khác và chưa đối chiếu được ngày sinh' }); continue;
      }
      actions.push({ ...source, studentId: match?.id ?? null, currentClass: match?.class.name ?? '',
        classId: target.id, dateOfBirth: row.dateOfBirth, gender: row.gender,
        action: !match ? 'add' : match.classId !== target.id ? 'move' : 'update', paid: confirmed });
    }

    const represented = new Set(actions.filter((item) => item.studentId).map((item) => item.studentId));
    for (const item of review) {
      const match = existing.find((student) => student.studentCode === item.code);
      if (match) represented.add(match.id);
    }
    const absent = existing.filter((student) => !student.deletedAt && !represented.has(student.id)).map((student) => ({
      id: student.id, code: student.studentCode, name: student.fullName, currentClass: student.class.name,
      campus: student.class.campus.name, paid: student.feeAssignments.some((fee) => fee.status === 'confirmed'),
      reason: 'Không có trong tệp mới: kiểm tra chuyển trường/nghỉ học trước khi xóa',
    }));
    if (body.apply === true) {
      // Re-evaluate on the server for every request. Never change fee status or delete students.
      let added = 0, updated = 0, moved = 0;
      for (const action of actions) {
        if (action.studentId) {
          await prisma.student.update({ where: { id: action.studentId }, data: {
            classId: action.classId, dateOfBirth: new Date(action.dateOfBirth + 'T00:00:00.000Z'), gender: action.gender,
          } });
          if (action.action === 'move') {
            await refreshStudentQrContent(action.studentId);
            moved++;
          } else updated++;
        } else {
          await prisma.student.create({ data: {
            studentCode: action.code, fullName: action.name, classId: action.classId,
            dateOfBirth: new Date(action.dateOfBirth + 'T00:00:00.000Z'), gender: action.gender,
            passwordHash: await bcrypt.hash(action.code, 10), passwordIsDefault: true,
          } });
          added++;
        }
      }
      return NextResponse.json({ added, updated, moved, review, absent, confirmedPreserved: actions.filter((item) => item.paid).length });
    }
    return NextResponse.json({ total: rows.length, actions, review, absent,
      summary: { add: actions.filter((item) => item.action === 'add').length,
        update: actions.filter((item) => item.action === 'update').length,
        move: actions.filter((item) => item.action === 'move').length,
        paid: actions.filter((item) => item.paid).length, review: review.length, absent: absent.length } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Không thể đối chiếu danh sách' }, { status: 500 });
  }
}
