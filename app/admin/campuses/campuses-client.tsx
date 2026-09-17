'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function CampusesClient() {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', address: '', phone: '' });

  const load = () => fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/campuses/${editing.id}` : '/api/campuses';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast?.success?.(editing ? 'Đã cập nhật' : 'Đã thêm'); setOpen(false); setEditing(null); setForm({ name: '', address: '', phone: '' }); load(); }
    else toast?.error?.('Lỗi lưu dữ liệu');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa cơ sở này?')) return;
    await fetch(`/api/campuses/${id}`, { method: 'DELETE' });
    toast?.success?.('Đã xóa');
    load();
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Quản lý Cơ sở</h1>
          <p className="text-sm text-muted-foreground">Danh sách các cơ sở đào tạo</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', address: '', phone: '' }); } }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Thêm cơ sở</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Sửa cơ sở' : 'Thêm cơ sở'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Tên cơ sở</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Địa chỉ</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="mt-1" /></div>
              <div><Label>SĐT</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {campuses.map((c: any) => (
          <Card key={c?.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg"><Building2 className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">{c?.name}</h3>
                    <p className="text-sm text-muted-foreground">{c?.address ?? ''}</p>
                    {c?.phone && <p className="text-sm text-muted-foreground">{c.phone}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{c?._count?.classes ?? 0} lớp</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(c); setForm({ name: c.name, address: c.address ?? '', phone: c.phone ?? '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
