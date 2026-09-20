'use client';

import { useEffect, useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import { parseClassRows } from '@/lib/class-import';
import { formatDate } from '@/lib/date-format';

export function ClassesClient() {
  const [classes, setClasses] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [filterCampus, setFilterCampus] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', campusId: '', schoolYear: '2025-2026', teacherName: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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

  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([{ 'Tên lớp': '10C1', 'Cơ sở': campuses[0]?.name ?? 'Tên cơ sở', 'Năm học': '2025-2026', GVCN: 'Nguyễn Văn A' }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Danh sách lớp');
    XLSX.writeFile(workbook, 'mau-danh-sach-lop.xlsx');
  };

  const downloadDataWorkbook = async () => {
    try {
      const res = await fetch('/api/students?page=1&limit=10000');
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Không thể tải dữ liệu học sinh');
      const students = Array.isArray(data?.students) ? data.students : [];
      const classTeacherRows = classes.map((item: any) => ({
        'Tên lớp': item?.name ?? '',
        'Cơ sở': item?.campus?.name ?? '',
        'Năm học': item?.schoolYear ?? '',
        GVCN: item?.teacherName ?? '',
      }));
      const classRows = classes.map((item: any) => ({
        'Tên lớp': item?.name ?? '',
        'Cơ sở': item?.campus?.name ?? '',
        'Năm học': item?.schoolYear ?? '',
      }));
      const studentRows = students.map((item: any) => ({
        'Mã HS': item?.studentCode ?? '',
        CCCD: item?.cccd ?? '',
        'Họ tên': item?.fullName ?? '',
        'Lớp': item?.class?.name ?? '',
        'Cơ sở': item?.class?.campus?.name ?? '',
        'Năm học': item?.class?.schoolYear ?? '',
        'Ngày sinh': formatDate(item?.dateOfBirth),
        'SĐT': item?.phone ?? '',
        'SĐT phụ huynh': item?.parentPhone ?? '',
        Zalo: item?.zaloPhone ?? '',
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(classTeacherRows), 'Lớp + GVCN');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(classRows), 'Lớp');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(studentRows), 'Học sinh');
      XLSX.writeFile(workbook, 'du-lieu-lop-gvcn-hoc-sinh.xlsx');
      toast.success(`Đã tải ${classes.length} lớp và ${students.length} học sinh`);
    } catch (error: any) {
      toast.error(error?.message ?? 'Không thể tải dữ liệu Excel');
    }
  };

  const handleImport = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      const parsed = parseClassRows(rows, campuses);
      if (parsed.errors.length) throw new Error(parsed.errors.slice(0, 5).join('\n'));
      const res = await fetch('/api/classes/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ classes: parsed.classes }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? 'Không thể nhập danh sách lớp');
      toast.success(`Đã nhập/cập nhật ${data.imported} lớp`);
      loadClasses();
    } catch (error: any) {
      toast.error(error?.message ?? 'Tệp Excel không hợp lệ');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Quản lý Lớp học</h1>
          <p className="text-sm text-muted-foreground">Danh sách lớp học theo cơ sở</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
          <Button variant="outline" onClick={downloadTemplate}><Download className="h-4 w-4 mr-1" /> Tải mẫu Excel</Button>
          <Button variant="outline" onClick={downloadDataWorkbook}><Download className="h-4 w-4 mr-1" /> Tải dữ liệu Excel</Button>
          <Button variant="outline" disabled={importing} onClick={() => fileInputRef.current?.click()}><Upload className="h-4 w-4 mr-1" /> {importing ? 'Đang nhập...' : 'Nhập lớp hàng loạt'}</Button>
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
