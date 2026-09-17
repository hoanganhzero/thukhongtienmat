import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeeAssignmentsClient } from './fee-assignments-client';

export default async function FeeAssignmentsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <FeeAssignmentsClient />;
}
