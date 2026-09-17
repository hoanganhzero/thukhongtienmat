import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as any;
  const role = user?.role;
  const adminRole = user?.adminRole;

  return (
    <div className="flex min-h-screen bg-background">
      {role === 'admin' && <AdminSidebar adminRole={adminRole} fullName={user?.name} />}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
