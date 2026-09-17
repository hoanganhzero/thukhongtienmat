import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ReportsClient } from './reports-client';

export default async function ReportsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <ReportsClient />;
}
