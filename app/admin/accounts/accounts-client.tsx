'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = { username: '', password: '', fullName: '', role: 'teacher', campusId: '', classId: '' };
const roleNames: Record<string, string> = { super_admin: 'Quản trị tối cao', accountant: 'Kế toán', treasurer: 'Thủ quỹ', teacher: 'Giáo viên chủ nhiệm' };

export function AccountsClient() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const load = () => fetch('/api/accounts').then((r) => r.json()).then((data) => setAccounts(Array.isArray(data) ? data : []));

  useEffect(() => {
    load();
    fetch('/api/campuses').then((r) => r.json()).then((data) => setCampuses(Array.isArray(data) ? data : []));
    fetch('/api/classes').then((r) => r.json()).then((data) => setClasses(Array.isArray(data) ? data : []));
  }, []);

  const save = async () => {
    const res = await fetch(editing ? `/api/accounts/${editing.id}` : '/api/accounts', { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? 'Không thể lưu tài khoản');
    toast.success(editing ? 'Đã cập nhật tài khoản' : 'Đã tạo tài khoản');
    setOpen(false); setEditing(null); setForm(emptyForm); load();
  };

  return <div className="p-6 max-w-[1000px] space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="font-display text-2xl font-bold">Quản lý tài khoản</h1><p className="text-sm text-muted-foreground">Phân quyền đúng công việc cho từng người dùng</p></div>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) { setEditing(null); setForm(emptyForm); } }}>
        <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" /> Thêm tài khoản</Button></DialogTrigger>
        <DialogContent><DialogHeader><DialogTitle>{editing ? 'Sửa tài khoản' : 'Thêm tài khoản'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Họ và tên</Label><Input className="mt-1" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label>Tên đăng nhập</Label><Input className="mt-1" disabled={!!editing} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></div>
            <div><Label>{editing ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}</Label><Input className="mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>Vai trò</Label><Select value={form.role} onValueChange={(role) => setForm({ ...form, role, classId: role === 'teacher' ? form.classId : '' })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(roleNames).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
            {form.role === 'teacher' && <><div><Label>Cơ sở</Label><Select value={form.campusId} onValueChange={(campusId) => setForm({ ...form, campusId, classId: '' })}><SelectTrigger className="mt-1"><SelectValue placeholder="Chọn cơ sở" /></SelectTrigger><SelectContent>{campuses.map((campus) => <SelectItem key={campus.id} value={campus.id}>{campus.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Lớp chủ nhiệm</Label><Select value={form.classId} onValueChange={(classId) => setForm({ ...form, classId })}><SelectTrigger className="mt-1"><SelectValue placeholder="Chọn lớp" /></SelectTrigger><SelectContent>{classes.filter((item) => !form.campusId || item.campusId === form.campusId).map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select></div></>}
            <Button className="w-full" onClick={save}>Lưu tài khoản</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">{accounts.map((account) => <Card key={account.id}><CardContent className="flex items-start justify-between p-4"><div className="flex gap-3"><UserRound className="mt-1 h-5 w-5 text-primary" /><div><p className="font-semibold">{account.fullName}</p><p className="text-sm text-muted-foreground">{account.username} • {roleNames[account.role] ?? account.role}</p>{account.class?.name && <p className="text-sm">Lớp: {account.class.name}</p>}</div></div><div className="flex"><Button variant="ghost" size="icon" onClick={() => { setEditing(account); setForm({ username: account.username, password: '', fullName: account.fullName, role: account.role, campusId: account.campusId ?? '', classId: account.classId ?? '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={async () => { if (!confirm(`Xóa tài khoản ${account.username}?`)) return; const res = await fetch(`/api/accounts/${account.id}`, { method: 'DELETE' }); const data = await res.json().catch(() => ({})); if (!res.ok) return toast.error(data?.error ?? 'Không thể xóa'); toast.success('Đã xóa tài khoản'); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></CardContent></Card>)}</div>
  </div>;
}
