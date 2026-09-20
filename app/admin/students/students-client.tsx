'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, Search, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { parseStudentRows } from '@/lib/student-import';
import { formatDate } from '@/lib/date-format';

export function StudentsClient({ adminRole }: { adminRole?: string }) {
  const isTeacher = adminRole === 'teacher';
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
  const [form, setForm] = useState({ studentCode: '', cccd: '', fullName: '', classId: '', phone: '', parentPhone: '', zaloPhone: '', password: '' });
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
    fetch('/api/classes').then(r => r.json()).then(d => { const arr = Array.isArray(d) ? d : []; setAllClasses(arr); setClasses(arr); });
  }, []);

  const loadStudents = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterClass !== 'all') params.set('classId', filterClass);
    else if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (search) params.set('search', search);
    fetch(`/api/students?${params}`).then(r => r.json()).then(d => { setStudents(d?.students ?? []); setTotal(d?.total ?? 0); setSelectedIds([]); });
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
    if (res.ok) { toast.success(editing ? 'Đã cập nhật' : 'Đã thêm học sinh'); setOpen(false); setEditing(null); loadStudents(); }
    else { const err = await res.json().catch(() => ({})); toast?.error?.(err?.error ?? 'Lỗi'); }
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsed = parseStudentRows(rows, allClasses);
      if (parsed.errors.length) {
        toast.error(parsed.errors.slice(0, 5).join('\n'));
        return;
      }
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: parsed.students }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Không thể nhập danh sách');
      toast.success(`Đã thêm ${data.imported ?? 0} học sinh; bỏ qua ${data.skipped ?? 0} học sinh đã có trong lớp`);
      loadStudents();
    } catch (error: any) {
      toast.error(error?.message ?? 'Tệp Excel không hợp lệ');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([{
      'Mã HS': 'HS001',
      CCCD: '079012345678',
      'Họ tên': 'Nguyễn Văn A',
      'Lớp': allClasses[0]?.name ?? 'Tên lớp',
      'Cơ sở': allClasses[0]?.campus?.name ?? 'Tên cơ sở',
      'Năm học': allClasses[0]?.schoolYear ?? '2025-2026',
      'Ngày sinh': '15/01/2010',
      'SĐT': '0901234567',
      'SĐT phụ huynh': '0909876543',
      Zalo: '0909876543',
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Danh sách học sinh');
    XLSX.writeFile(workbook, 'mau-danh-sach-hoc-sinh.xlsx');
  };

  const deleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!confirm(`Xóa ${selectedIds.length} học sinh đã chọn? Các khoản thu, biên lai và thông báo liên quan cũng sẽ bị xóa.`)) return;
    const res = await fetch('/api/students/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? 'Không thể xóa học sinh');
    toast.success(`Đã xóa ${data.deleted} học sinh`);
    setSelectedIds([]);
    loadStudents();
  };

  const currentIds = students.map((student) => student.id);
  const allCurrentSelected = currentIds.length > 0 && currentIds.every((id) => selectedIds.includes(id));

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">{isTeacher ? 'Học sinh lớp chủ nhiệm' : 'Quản lý Học sinh'}</h1>
          <p className="text-sm text-muted-foreground">Tổng cộng {total} học sinh</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isTeacher && <><input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Tải tệp mẫu</Button>
          <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> {importing ? 'Đang nhập...' : 'Nhập Excel'}</Button>
          {selectedIds.length > 0 && <Button variant="destructive" onClick={deleteSelected}><Trash2 className="h-4 w-4 mr-1" /> Xóa đã chọn ({selectedIds.length})</Button>}
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm({ studentCode: '', cccd: '', fullName: '', classId: '', phone: '', parentPhone: '', zaloPhone: '', password: '' }); } }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Thêm học sinh</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Sửa học sinh' : 'Thêm học sinh'}</DialogTitle></DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div><Label>Mã HS</Label><Input value={form.studentCode} onChange={e => setForm({ ...form, studentCode: e.target.value })} disabled={!!editing} className="mt-1" /></div>
              <div><Label>CCCD</Label><Input value={form.cccd} onChange={e => setForm({ ...form, cccd: e.target.value.replace(/\D/g, '').slice(0, 12) })} inputMode="numeric" maxLength={12} placeholder="12 chữ số, nếu có" className="mt-1" /></div>
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
              <div><Label>{editing ? 'Mật khẩu mới (để trống nếu giữ nguyên)' : 'Mật khẩu (để trống dùng mã HS/CCCD)'}</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Tối thiểu 6 ký tự" className="mt-1" /></div>
              <Button onClick={handleSave} className="w-full">Lưu</Button>
            </div>
          </DialogContent>
          </Dialog>
          </>}
        </div>
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
                {!isTeacher && <TableHead className="w-10"><Checkbox aria-label="Chọn tất cả học sinh trên trang" checked={allCurrentSelected} onCheckedChange={(checked) => setSelectedIds(checked ? [...new Set([...selectedIds, ...currentIds])] : selectedIds.filter((id) => !currentIds.includes(id)))} /></TableHead>}
                <TableHead>Mã HS</TableHead>
                <TableHead>CCCD</TableHead>
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
                  {!isTeacher && <TableCell><Checkbox aria-label={`Chọn ${s?.fullName}`} checked={selectedIds.includes(s.id)} onCheckedChange={(checked) => setSelectedIds(checked ? [...selectedIds, s.id] : selectedIds.filter((id) => id !== s.id))} /></TableCell>}
                  <TableCell className="font-mono text-sm">{s?.studentCode}</TableCell>
                  <TableCell className="font-mono text-sm">{s?.cccd ?? '—'}</TableCell>
                  <TableCell className="font-medium">{s?.fullName}</TableCell>
                  <TableCell>{s?.class?.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s?.class?.campus?.name}</TableCell>
                  <TableCell className="text-sm">{s?.phone}</TableCell>
                  <TableCell>
                    {!isTeacher &&
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditing(s); setForm({ studentCode: s.studentCode, cccd: s.cccd ?? '', fullName: s.fullName, classId: s.classId, phone: s.phone ?? '', parentPhone: s.parentPhone ?? '', zaloPhone: s.zaloPhone ?? '', password: '' }); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={async () => { if (!confirm('Xóa?')) return; await fetch(`/api/students/${s.id}`, { method: 'DELETE' }); loadStudents(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                    }
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
