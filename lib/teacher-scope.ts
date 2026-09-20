import { prisma } from '@/lib/prisma';

export function teacherClassIds(user: any): string[] {
  const ids = Array.isArray(user?.classIds) ? user.classIds.filter(Boolean) : [];
  if (ids.length) return Array.from(new Set(ids));
  return user?.classId ? [user.classId] : [];
}

export async function loadTeacherClassIds(adminId: string, fallback?: string | null) {
  const links = await prisma.adminClass.findMany({ where: { adminId }, select: { classId: true } });
  const ids = links.map((item) => item.classId);
  if (!ids.length && fallback) ids.push(fallback);
  return Array.from(new Set(ids));
}
