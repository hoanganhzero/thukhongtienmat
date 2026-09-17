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
  const [studentCode, setStudentCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn('student-login', {
        studentCode,
        password,
        redirect: false,
      });
      if (result?.error) {
        toast?.error?.('Sai mã học sinh hoặc mật khẩu');
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
          <p className="text-sm text-muted-foreground mt-1">Nhập mã học sinh và mật khẩu</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="studentCode">Mã học sinh</Label>
            <Input id="studentCode" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} placeholder="Ví dụ: HS0001" className="mt-1" required />
          </div>
          <div>
            <Label htmlFor="password">Mật khẩu</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu mặc định là mã học sinh" className="mt-1" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Đăng nhập
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">Hoặc <Link href="/tra-cuu" className="text-primary font-medium hover:underline">tra cứu nhanh</Link> không cần đăng nhập</p>
        </div>
      </div>
    </div>
  );
}
