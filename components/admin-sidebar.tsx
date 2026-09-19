'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Building2, GraduationCap, Receipt, ClipboardCheck,
  BarChart3, Bell, Settings, LogOut, Users, CreditCard, ImageIcon, Wallet, Grid2X2, X
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import Image from 'next/image';

type Role = 'super_admin' | 'accountant' | 'treasurer' | 'teacher';

const menuItems: { href: string; label: string; icon: any; roles: Role[] }[] = [
  { href: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: ['super_admin', 'accountant', 'treasurer', 'teacher'] },
  { href: '/admin/campuses', label: 'Cơ sở', icon: Building2, roles: ['super_admin'] },
  { href: '/admin/classes', label: 'Lớp học', icon: Users, roles: ['super_admin'] },
  { href: '/admin/students', label: 'Học sinh', icon: GraduationCap, roles: ['super_admin', 'accountant', 'treasurer', 'teacher'] },
  { href: '/admin/fee-types', label: 'Khoản thu', icon: CreditCard, roles: ['super_admin', 'accountant', 'treasurer'] },
  { href: '/admin/fee-assignments', label: 'Theo dõi đóng tiền', icon: Receipt, roles: ['super_admin', 'accountant', 'treasurer', 'teacher'] },
  { href: '/admin/verify', label: 'Duyệt biên lai', icon: ImageIcon, roles: ['super_admin', 'accountant', 'treasurer'] },
  { href: '/admin/reports', label: 'Báo cáo', icon: BarChart3, roles: ['super_admin', 'accountant', 'treasurer'] },
  { href: '/admin/notifications', label: 'Gửi nhắc nhở', icon: Bell, roles: ['super_admin', 'accountant', 'treasurer', 'teacher'] },
  { href: '/admin/accounts', label: 'Tài khoản', icon: Users, roles: ['super_admin'] },
  { href: '/admin/settings', label: 'Cài đặt', icon: Settings, roles: ['super_admin'] },
];

export function AdminSidebar({ adminRole = 'super_admin', fullName }: { adminRole?: string; fullName?: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const role = (['accountant', 'treasurer', 'teacher'].includes(adminRole) ? adminRole : 'super_admin') as Role;
  const items = menuItems.filter((item) => item.roles.includes(role));
  const roleLabel = role === 'teacher' ? 'Giáo viên chủ nhiệm' : role === 'treasurer' ? 'Thủ quỹ' : role === 'accountant' ? 'Kế toán' : 'Quản trị viên';

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu quản trị"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-[60] inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-md xl:hidden"
      >
        <Grid2X2 className="h-5 w-5" />
      </button>
      {open && <button aria-label="Đóng menu" onClick={() => setOpen(false)} className="fixed inset-0 z-40 bg-black/40 xl:hidden" />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86vw] flex-col border-r border-border bg-card shadow-xl transition-transform duration-200 xl:w-64 xl:translate-x-0 xl:shadow-none',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <button
          type="button"
          aria-label="Đóng menu quản trị"
          onClick={() => setOpen(false)}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent xl:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 pr-8">
          <Image src="/logo-trung-tam-tan-ninh.webp" alt="Logo Trung tâm GDNN-GDTX Khu vực Tân Ninh" width={48} height={48} className="h-12 w-12 shrink-0 rounded-full object-contain" priority />
          <div className="min-w-0">
            <h1 className="font-display text-sm font-bold leading-tight text-primary">GDNN-GDTX Khu vực Tân Ninh</h1>
            <p className="text-xs text-muted-foreground">Thu không tiền mặt</p>
          </div>
        </div>
        <div className={cn(
          'mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          role !== 'super_admin' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'
        )}>
          {role !== 'super_admin' ? <Wallet className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
          {roleLabel}
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
              onClick={() => setOpen(false)}
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
    </>
  );
}
