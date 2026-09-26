'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CreditCard, Plus, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { vietQrBanks } from '@/lib/vietqr-banks';

export function FeeTypesClient() {
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', amount: 0, bankAccountNumber: '', bankAccountName: '', bankName: 'VietinBank', isActive: true });

  const load = () => fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/fee-types/${editing.id}` : '/api/fee-types';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, amount: Number(form.amount) }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { toast?.success?.('Đã lưu'); setOpen(false); setEditing(null); resetForm(); load(); }
    else toast?.error?.(data?.error ?? 'Không thể lưu khoản thu');
  };

  const resetForm = () => setForm({ name: '', description: '', amount: 0, bankAccountNumber: '', bankAccountName: '', bankName: 'VietinBank', isActive: true });

  const configureBht = async () => {
    if (!confirm('Cấu hình BHTT dùng VietinBank 108869921106 và xóa các khoản thu khác? Khoản đã xác nhận thanh toán sẽ được giữ lại và ngưng hoạt động.')) return;
    const res = await fetch('/api/fee-types/cleanup-bht', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? 'Không thể cấu hình BHTT');
    toast.success(`Đã cấu hình BHTT. Xóa ${data.removed?.length ?? 0} khoản thu khác.`);
    load();
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cấu hình Khoản thu</h1>
          <p className="text-sm text-muted-foreground">Quản lý các loại khoản thu học phí</p>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Button variant="outline" onClick={configureBht}>Cấu hình BHTT mặc định</Button>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); resetForm(); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Thêm khoản thu</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Sửa khoản thu' : 'Thêm khoản thu'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Tên khoản thu</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Mô tả</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1" /></div>
              <div><Label>Số tiền mặc định (đồng)</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="mt-1" /></div>
              <div><Label>Ngân hàng</Label><select value={form.bankName} onChange={e => setForm({ ...form, bankName: e.target.value })} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="">Chọn ngân hàng</option>{vietQrBanks.map(([name]) => <option key={name} value={name}>{name}</option>)}</select></div>
              <div><Label>Số tài khoản ngân hàng</Label><Input inputMode="numeric" value={form.bankAccountNumber} onChange={e => setForm({ ...form, bankAccountNumber: e.target.value.replace(/\D/g, '') })} className="mt-1" /></div>
              <div><Label>Tên chủ tài khoản</Label><Input value={form.bankAccountName} onChange={e => setForm({ ...form, bankAccountName: e.target.value })} className="mt-1" /></div>
              <div className="flex items-center gap-2">
                <Switch checked={form.isActive} onCheckedChange={v => setForm({ ...form, isActive: v })} />
                <Label>Hoạt động</Label>
              </div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeTypes.map((ft: any) => (
          <Card key={ft?.id} className={`hover:shadow-md transition-shadow ${!ft?.isActive ? 'opacity-50' : ''}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg"><CreditCard className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">{ft?.name}</h3>
                    <p className="text-xs text-muted-foreground">{ft?.description}</p>
                    <p className="font-bold text-primary mt-1">{formatCurrency(ft?.amount ?? 0)}</p>
                    <p className="text-xs text-muted-foreground mt-1">TK: {ft?.bankAccountNumber} - {ft?.bankAccountName}</p>
                    {!ft?.isActive && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Ngưng hoạt động</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(ft); setForm({ name: ft.name, description: ft.description ?? '', amount: ft.amount, bankAccountNumber: ft.bankAccountNumber ?? '', bankAccountName: ft.bankAccountName ?? '', bankName: ft.bankName ?? 'Agribank', isActive: ft.isActive }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={async () => { if (!confirm('Xóa khoản thu này?')) return; const res = await fetch(`/api/fee-types/${ft.id}`, { method: 'DELETE' }); const data = await res.json().catch(() => ({})); if (!res.ok) return toast.error(data?.error ?? 'Không thể xóa'); toast.success('Đã xóa khoản thu'); load(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
