import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './_components/dashboard-client';

export default async function AdminPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  if ((session?.user as any)?.adminRole === 'teacher') redirect('/admin/fee-assignments');

  return <AdminDashboardClient />;
}
