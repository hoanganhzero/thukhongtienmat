import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { CompetitionBoardClient } from './competition-board-client';

export default async function CompetitionPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/admin/login');
  return <CompetitionBoardClient />;
}
