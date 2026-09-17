import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { StudentsClient } from './students-client';

export default async function StudentsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <StudentsClient />;
}
