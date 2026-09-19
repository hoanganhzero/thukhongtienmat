'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, GraduationCap, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function StudentLoginPage() {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('student-login', {
        studentCode: loginId,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast?.error?.('Sai mã học sinh/CCCD hoặc mật khẩu');
      } else {
        window.location.href = '/student';
      }
    } catch {
      toast?.error?.('Lỗi hệ thống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-50 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-lg p-8 border border-border">
        <div className="mb-4"><Link href="/" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Trang chủ</Link></div>
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Đăng nhập Học sinh</h1>
          <p className="text-sm text-muted-foreground mt-1">Đăng nhập bằng mã học sinh hoặc CCCD</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="studentCode">Mã học sinh hoặc CCCD</Label>
            <Input id="studentCode" value={loginId} onChange={(e) => setLoginId(e.target.value)} placeholder="Ví dụ: HS0001 hoặc 079..." className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mã học sinh hoặc CCCD" className="mt-1" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Mật khẩu ban đầu là mã học sinh hoặc CCCD. Nếu nhà trường đã cấp mật khẩu mới, hãy dùng mật khẩu mới.</p>
        </div>
      </div>
    </div>
  );
}
