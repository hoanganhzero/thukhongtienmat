'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, GraduationCap, Receipt, ClipboardCheck,
  BarChart3, Bell, Settings, LogOut, Users, CreditCard, ImageIcon, Wallet
} from 'lucide-react';
import { signOut } from 'next-auth/react';

type Role = 'super_admin' | 'accountant';

const menuItems: { href: string; label: string; icon: any; roles: Role[] }[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['super_admin', 'accountant'] },
  { href: '/admin/campuses', label: 'Cơ sở', icon: Building2, roles: ['super_admin'] },
  { href: '/admin/classes', label: 'Lớp học', icon: Users, roles: ['super_admin'] },
  { href: '/admin/students', label: 'Học sinh', icon: GraduationCap, roles: ['super_admin', 'accountant'] },
  { href: '/admin/fee-types', label: 'Khoản thu', icon: CreditCard, roles: ['super_admin', 'accountant'] },
  { href: '/admin/fee-assignments', label: 'Phân công thu', icon: Receipt, roles: ['super_admin', 'accountant'] },
  { href: '/admin/verify', label: 'Duyệt ảnh', icon: ImageIcon, roles: ['super_admin', 'accountant'] },
  { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3, roles: ['super_admin', 'accountant'] },
  { href: '/admin/notifications', label: 'Thông báo', icon: Bell, roles: ['super_admin', 'accountant'] },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, roles: ['super_admin'] },
];

export function AdminSidebar({ adminRole = 'super_admin', fullName }: { adminRole?: string; fullName?: string }) {
  const pathname = usePathname();
  const role = (adminRole === 'accountant' ? 'accountant' : 'super_admin') as Role;
  const items = menuItems.filter((item) => item.roles.includes(role));
  const isAccountant = role === 'accountant';

  return (
    <aside className="w-64 bg-card border-r border-border min-h-screen flex flex-col">
      <div className="p-4 border-b border-border">
        <h1 className="font-display text-lg font-bold text-primary tracking-tight">GDNN-GDTX</h1>
        <p className="text-xs text-muted-foreground">Thu không tiền mặt</p>
        <div className={cn(
          'mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          isAccountant ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
        )}>
          {isAccountant ? <Wallet className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
          {isAccountant ? 'Thủ quỹ / Kế toán' : 'Quản trị viên'}
        </div>
        {fullName ? <p className="text-xs text-muted-foreground mt-1.5 truncate">{fullName}</p> : null}
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <button
          onClick={() => signOut({ redirectTo: '/admin/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
