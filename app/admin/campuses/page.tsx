import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CampusesClient } from './campuses-client';

export default async function CampusesPage() {
  const session = await auth();
  const user = session?.user as any;
  if (user?.role !== 'admin') redirect('/admin/login');
  if (user?.adminRole === 'accountant') redirect('/admin');
  return <CampusesClient />;
}
