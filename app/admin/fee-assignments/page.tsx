import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { FeeAssignmentsClient } from './fee-assignments-client';

export default async function FeeAssignmentsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  const user = session!.user as any;
  return <FeeAssignmentsClient adminRole={user.adminRole} teacherClassId={user.classId} />;
}
