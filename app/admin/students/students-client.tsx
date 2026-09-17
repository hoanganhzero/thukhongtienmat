'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GraduationCap, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { toast } from 'sonner';

export function StudentsClient() {
  const [students, setStudents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterCampus, setFilterCampus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ studentCode: '', fullName: '', classId: '', phone: '', parentPhone: '', zaloPhone: '' });
  const [allClasses, setAllClasses] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
    fetch('/api/classes').then(r => r.json()).then(d => { const arr = Array.isArray(d) ? d : []; setAllClasses(arr); setClasses(arr); });
  }, []);

  const loadStudents = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterClass !== 'all') params.set('classId', filterClass);
    else if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (search) params.set('search', search);
    fetch(`/api/students?${params}`).then(r => r.json()).then(d => { setStudents(d?.students ?? []); setTotal(d?.total ?? 0); });
  }, [page, filterClass, filterCampus, search]);

  useEffect(() => { loadStudents(); }, [loadStudents]);

  useEffect(() => {
    if (filterCampus !== 'all') setClasses((allClasses ?? []).filter((c: any) => c?.campusId === filterCampus));
    else setClasses(allClasses);
    setFilterClass('all');
  }, [filterCampus, allClasses]);

  const handleSave = async () => {
    const method = editing ? 'PUT' : 'POST';
    const url = editing ? `/api/students/${editing.id}` : '/api/students';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast?.success??(editing ? 'Đã cập nhật' : 'Đã thêm học sinh'); setOpen(false); setEditing(null); loadStudents(); }
    else { const err = await res.json().catch(() => ({})); toast?.error?.(err?.error ?? 'Lỗi'); }
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Quản lý Học sinh</h1>
          <p className="text-sm text-muted-foreground">Tổng cộng {total} học sinh</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ studentCode: '', fullName: '', classId: '', phone: '', parentPhone: '', zaloPhone: '' }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Thêm học sinh</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Sửa học sinh' : 'Thêm học sinh'}</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div><Label>Mã HS</Label><Input value={form.studentCode} onChange={e => setForm({ ...form, studentCode: e.target.value })} disabled={!!editing} className="mt-1" /></div>
              <div><Label>Họ tên</Label><Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} className="mt-1" /></div>
              <div><Label>Lớp</Label>
                <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn lớp" /></SelectTrigger>
                  <SelectContent>{allClasses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name} - {c?.campus?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>SĐT</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="mt-1" /></div>
              <div><Label>SĐT Phụ huynh</Label><Input value={form.parentPhone} onChange={e => setForm({ ...form, parentPhone: e.target.value })} className="mt-1" /></div>
              <div><Label>Zalo</Label><Input value={form.zaloPhone} onChange={e => setForm({ ...form, zaloPhone: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterCampus} onValueChange={setFilterCampus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả cơ sở</SelectItem>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={setFilterClass}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{classes.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Tìm mã HS, tên, SĐT..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã HS</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Cơ sở</TableHead>
                <TableHead>SĐT</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((s: any) => (
                <TableRow key={s?.id}>
                  <TableCell className="font-mono text-sm">{s?.studentCode}</TableCell>
                  <TableCell className="font-medium">{s?.fullName}</TableCell>
                  <TableCell>{s?.class?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s?.class?.campus?.name}</TableCell>
                  <TableCell className="text-sm">{s?.phone}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({ studentCode: s.studentCode, fullName: s.fullName, classId: s.classId, phone: s.phone ?? '', parentPhone: s.parentPhone ?? '', zaloPhone: s.zaloPhone ?? '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { if (!confirm('Xóa?')) return; await fetch(`/api/students/${s.id}`, { method: 'DELETE' }); loadStudents(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trang trước</Button>
          <span className="text-sm text-muted-foreground self-center">Trang {page} / {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Trang sau</Button>
        </div>
      )}
    </div>
  );
}
