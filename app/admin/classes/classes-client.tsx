'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function ClassesClient() {
  const [classes, setClasses] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [filterCampus, setFilterCampus] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', campusId: '', schoolYear: '2025-2026', teacherName: '' });

  const loadClasses = () => {
    const q = filterCampus !== 'all' ? `?campusId=${filterCampus}` : '';
    fetch(`/api/classes${q}`).then(r => r.json()).then(d => setClasses(Array.isArray(d) ? d : []));
  };
  useEffect(() => { fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : [])); }, []);
  useEffect(() => { loadClasses(); }, [filterCampus]);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/classes/${editing.id}` : '/api/classes';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast?.success?.(editing ? 'Đã cập nhật' : 'Đã thêm lớp'); setOpen(false); setEditing(null); setForm({ name: '', campusId: '', schoolYear: '2025-2026', teacherName: '' }); loadClasses(); }
    else toast?.error?.('Lỗi');
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Quản lý Lớp học</h1>
          <p className="text-sm text-muted-foreground">Danh sách lớp học theo cơ sở</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ name: '', campusId: '', schoolYear: '2025-2026', teacherName: '' }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Thêm lớp</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Sửa lớp' : 'Thêm lớp'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Tên lớp</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="mt-1" /></div>
              <div><Label>Cơ sở</Label>
                <Select value={form.campusId} onValueChange={v => setForm({ ...form, campusId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn cơ sở" /></SelectTrigger>
                  <SelectContent>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Năm học</Label><Input value={form.schoolYear} onChange={e => setForm({ ...form, schoolYear: e.target.value })} className="mt-1" /></div>
              <div><Label>GVCN</Label><Input value={form.teacherName} onChange={e => setForm({ ...form, teacherName: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2">
        <Select value={filterCampus} onValueChange={setFilterCampus}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả cơ sở</SelectItem>
            {campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls: any) => (
          <Card key={cls?.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg"><Users className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold">{cls?.name}</h3>
                    <p className="text-xs text-muted-foreground">{cls?.campus?.name} • {cls?.schoolYear}</p>
                    {cls?.teacherName && <p className="text-xs text-muted-foreground">GVCN: {cls.teacherName}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{cls?._count?.students ?? 0} học sinh</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setEditing(cls); setForm({ name: cls.name, campusId: cls.campusId, schoolYear: cls.schoolYear, teacherName: cls.teacherName ?? '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={async () => { if (!confirm('Xóa lớp này?')) return; await fetch(`/api/classes/${cls.id}`, { method: 'DELETE' }); loadClasses(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
