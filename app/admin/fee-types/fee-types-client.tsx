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

const fixedBhttBank = {
  bankName: 'MB Bank',
  bankAccountNumber: '0335127226',
  bankAccountName: 'NGUYEN THI PHUONG THAO',
};

function isBhtt(name: unknown) {
  return /^BHTT?$/i.test(String(name ?? '').trim());
}

const emptyForm = { name: '', description: '', amount: 0, bankAccountNumber: '', bankAccountName: '', bankName: 'MB Bank', isActive: true };

export function FeeTypesClient() {
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [configuring, setConfiguring] = useState(false);
  const bhtt = isBhtt(form.name);

  const load = () => fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/fee-types/${editing.id}` : '/api/fee-types';
    const payload = { ...form, ...(bhtt ? fixedBhttBank : {}), amount: Number(form.amount) };
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? 'Không thể lưu khoản thu');
    toast.success('Đã lưu cấu hình khoản thu');
    setOpen(false);
    setEditing(null);
    setForm(emptyForm);
    load();
  };

  const configureBht = async () => {
    setConfiguring(true);
    const res = await fetch('/api/fee-types/cleanup-bht', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setConfiguring(false);
    if (!res.ok) return toast.error(data?.error ?? 'Không thể cấu hình BHTT');
    toast.success('Đã cố định BHTT vào tài khoản MB Bank 0335127226');
    load();
  };

  const edit = (feeType: any) => {
    setEditing(feeType);
    setForm({
      name: feeType.name,
      description: feeType.description ?? '',
      amount: feeType.amount,
      bankAccountNumber: isBhtt(feeType.name) ? fixedBhttBank.bankAccountNumber : feeType.bankAccountNumber ?? '',
      bankAccountName: isBhtt(feeType.name) ? fixedBhttBank.bankAccountName : feeType.bankAccountName ?? '',
      bankName: isBhtt(feeType.name) ? fixedBhttBank.bankName : feeType.bankName ?? '',
      isActive: feeType.isActive,
    });
    setOpen(true);
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cấu hình Khoản thu</h1>
          <p className="text-sm text-muted-foreground">BHTT cố định MB Bank 0335127226 — NGUYEN THI PHUONG THAO</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={configureBht} disabled={configuring}>{configuring ? 'Đang áp dụng...' : 'Áp dụng tài khoản BHTT'}</Button>
          <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) { setEditing(null); setForm(emptyForm); } }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Thêm khoản thu</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>{editing ? 'Sửa khoản thu' : 'Thêm khoản thu'}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Tên khoản thu</Label><Input disabled={isBhtt(editing?.name)} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} className="mt-1" /></div>
                <div><Label>Mô tả</Label><Input value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} className="mt-1" /></div>
                <div><Label>Số tiền mặc định (đồng)</Label><Input type="number" min="0" value={form.amount} onChange={event => setForm({ ...form, amount: Number(event.target.value) })} className="mt-1" /></div>
                {bhtt && <p className="rounded-lg bg-primary/10 p-3 text-sm">BHTT luôn nhận tiền qua MB Bank 0335127226 — NGUYEN THI PHUONG THAO.</p>}
                <div><Label>Ngân hàng</Label><select disabled={bhtt} value={bhtt ? fixedBhttBank.bankName : form.bankName} onChange={event => setForm({ ...form, bankName: event.target.value })} className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm disabled:opacity-60"><option value="">Chọn ngân hàng</option>{vietQrBanks.map(([name]) => <option key={name} value={name}>{name}</option>)}</select></div>
                <div><Label>Số tài khoản ngân hàng</Label><Input disabled={bhtt} inputMode="numeric" value={bhtt ? fixedBhttBank.bankAccountNumber : form.bankAccountNumber} onChange={event => setForm({ ...form, bankAccountNumber: event.target.value.replace(/\D/g, '') })} className="mt-1" /></div>
                <div><Label>Tên chủ tài khoản</Label><Input disabled={bhtt} value={bhtt ? fixedBhttBank.bankAccountName : form.bankAccountName} onChange={event => setForm({ ...form, bankAccountName: event.target.value })} className="mt-1" /></div>
                <div className="flex items-center gap-2"><Switch checked={form.isActive} onCheckedChange={value => setForm({ ...form, isActive: value })} /><Label>Hoạt động</Label></div>
                <Button onClick={handleSave} className="w-full">Lưu cấu hình</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeTypes.map((feeType: any) => (
          <Card key={feeType.id} className={`hover:shadow-md transition-shadow ${!feeType.isActive ? 'opacity-50' : ''}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start gap-3">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg"><CreditCard className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">{feeType.name}</h3>
                    <p className="text-xs text-muted-foreground">{feeType.description}</p>
                    <p className="font-bold text-primary mt-1">{formatCurrency(feeType.amount ?? 0)}</p>
                    <p className="text-xs mt-2">{feeType.bankName}: <span className="font-mono">{feeType.bankAccountNumber}</span></p>
                    <p className="text-xs text-muted-foreground">{feeType.bankAccountName}</p>
                    {isBhtt(feeType.name) && <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800">Tài khoản cố định</span>}
                    {!feeType.isActive && <span className="mt-2 ml-1 inline-block rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">Ngưng hoạt động</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => edit(feeType)}><Pencil className="h-4 w-4" /></Button>
                  {!isBhtt(feeType.name) && <Button variant="ghost" size="icon" onClick={async () => {
                    if (!confirm('Xóa khoản thu này?')) return;
                    const res = await fetch(`/api/fee-types/${feeType.id}`, { method: 'DELETE' });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) return toast.error(data?.error ?? 'Không thể xóa');
                    toast.success('Đã xóa khoản thu');
                    load();
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
