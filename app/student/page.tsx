import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { StudentDashboardClient } from './_components/student-dashboard';

export default async function StudentPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'student') redirect('/student/login');

  return <StudentDashboardClient session={JSON.parse(JSON.stringify(session))} />;
}
