export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ArrowLeft, Search, UserRoundCheck } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';
import { TeacherLookupActions } from './teacher-lookup-actions';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').trim().toLowerCase();
}

function compareStudents(a: { fullName: string }, b: { fullName: string }) {
  const givenName = (value: string) => value.trim().split(/\s+/).at(-1) ?? '';
  return givenName(a.fullName).localeCompare(givenName(b.fullName), 'vi', { sensitivity: 'base' }) ||
    a.fullName.localeCompare(b.fullName, 'vi', { sensitivity: 'base' });
}

export default async function TeacherLookupPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q?.trim() ?? '';
  let classes: any[] = [];

  if (query) {
    const key = normalize(query);
    const classList = await prisma.class.findMany({ select: { id: true, name: true, teacherName: true } });
    const classIds = classList
      .filter((item) => normalize(item.name) === key || normalize(item.teacherName ?? '') === key)
      .map((item) => item.id);

    if (classIds.length) {
      classes = await prisma.class.findMany({
        where: { id: { in: classIds } },
        include: {
          campus: true,
          students: {
            where: { deletedAt: null },
            select: {
              id: true,
              studentCode: true,
              fullName: true,
              feeAssignments: {
                include: { feeType: true },
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
      classes.forEach((item) => item.students.sort(compareStudents));
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="border-b bg-white/90">
        <div className="mx-auto flex h-16 max-w-[1100px] items-center gap-3 px-4">
          <Link href="/" aria-label="Quay lại trang chủ" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
          <UserRoundCheck className="h-6 w-6 text-primary" />
          <div><h1 className="font-display font-bold text-primary">Tra cứu nhanh dành cho GVCN</h1><p className="text-xs text-muted-foreground">Không cần đăng nhập</p></div>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-6 px-4 py-8">
        <form className="relative mx-auto max-w-2xl" action="/gvcn">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={query} required placeholder="Nhập chính xác họ tên GVCN hoặc tên lớp, ví dụ: 12C4" className="w-full rounded-2xl border bg-white py-4 pl-12 pr-28 text-base shadow-sm outline-none focus:ring-2 focus:ring-primary/30" />
          <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground">Tra cứu</button>
        </form>

        {query && !classes.length && <Card><CardContent className="p-8 text-center text-muted-foreground">Không tìm thấy GVCN hoặc lớp phù hợp. Vui lòng nhập đúng họ tên đầy đủ hoặc tên lớp.</CardContent></Card>}

        {classes.map((cls) => {
          const confirmed = cls.students.filter((student: any) => student.feeAssignments.some((fee: any) => fee.status === 'confirmed')).length;
          const collected = cls.students.flatMap((student: any) => student.feeAssignments).filter((fee: any) => fee.status === 'confirmed').reduce((sum: number, fee: any) => sum + fee.amount, 0);
          return <Card key={cls.id}>
            <CardHeader>
              <CardTitle>Lớp {cls.name}</CardTitle>
              <p className="text-sm text-muted-foreground">GVCN: {cls.teacherName || 'Chưa cập nhật'} • {cls.campus.name} • {cls.schoolYear}</p>
              <div className="flex flex-wrap gap-2 text-sm"><span className="rounded-full bg-muted px-3 py-1">Tổng: {cls.students.length} học sinh</span><span className="rounded-full bg-green-100 px-3 py-1 text-green-800">Đã đóng: {confirmed}</span><span className="rounded-full bg-yellow-100 px-3 py-1 text-yellow-800">Chưa đóng: {cls.students.length - confirmed}</span><span className="rounded-full bg-primary/10 px-3 py-1 text-primary">Đã thu: {formatCurrency(collected)}</span></div>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-y bg-muted/40 text-left"><th className="p-3">STT</th><th className="p-3">Họ tên học sinh</th><th className="p-3">Mã HS</th><th className="p-3">Khoản thu</th><th className="p-3">Trạng thái</th></tr></thead>
                <tbody>{cls.students.map((student: any, index: number) => {
                  const fee = student.feeAssignments[0];
                  return <tr key={student.id} className="border-b"><td className="p-3">{index + 1}</td><td className="p-3 font-medium">{student.fullName}</td><td className="p-3 font-mono">{student.studentCode}</td><td className="p-3">{fee?.feeType?.name ?? 'Chưa gán'}</td><td className="p-3">{fee ? <StatusBadge status={fee.status} /> : '—'}</td></tr>;
                })}</tbody>
              </table>
            </CardContent>
            <TeacherLookupActions classId={cls.id} query={query} students={cls.students} />
          </Card>;
        })}
      </main>
    </div>
  );
}
