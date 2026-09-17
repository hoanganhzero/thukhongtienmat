'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { toast?.error?.(data?.error ?? 'Lỗi đăng ký'); setLoading(false); return; }
      // Auto sign in
      const result = await signIn('admin-login', { username: email, password, redirect: false });
      if (result?.ok) router.push('/admin');
      else router.push('/admin/login');
    } catch {
      toast?.error?.('Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 border border-border">
        <div className="mb-4"><Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Trang chủ</Link></div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Đăng ký</h1>
          <p className="text-sm text-muted-foreground mt-1">Tạo tài khoản mới</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" className="mt-1" required /></div>
          <div><Label htmlFor="password">Mật khẩu</Label><Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mật khẩu" className="mt-1" required /></div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Đăng ký</Button>
        </form>
        <p className="text-sm text-center text-muted-foreground mt-4">Đã có tài khoản? <Link href="/admin/login" className="text-primary hover:underline">Đăng nhập</Link></p>
      </div>
    </div>
  );
}
