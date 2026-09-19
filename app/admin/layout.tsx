import { auth } from '@/auth';
import { AdminSidebar } from '@/components/admin-sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user as any;
  const role = user?.role;
  const adminRole = user?.adminRole;

  return (
    <div className="min-h-screen bg-background">
      {role === 'admin' && <AdminSidebar adminRole={adminRole} fullName={user?.name} />}
      <main className="admin-main min-w-0 overflow-x-hidden pt-14 xl:ml-64 xl:pt-0">{children}</main>
    </div>
  );
}
