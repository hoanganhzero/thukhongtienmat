import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { ClassesClient } from './classes-client';

export default async function ClassesPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/admin/login');
  if (user?.adminRole === 'accountant') redirect('/admin');
  return <ClassesClient />;
}
