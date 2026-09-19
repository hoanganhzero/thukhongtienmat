'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { Plus, Printer, Send, Settings2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { parseDateInput } from '@/lib/date-format';

export function FeeAssignmentsClient({ adminRole, teacherClassId }: { adminRole?: string; teacherClassId?: string }) {
  const isTeacher = adminRole === 'teacher';
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeeType, setFilterFeeType] = useState('all');
  const [filterCampus, setFilterCampus] = useState('all');
  const [filterClass, setFilterClass] = useState(teacherClassId ?? 'all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [processingQr, setProcessingQr] = useState(false);
  const [bhytEditing, setBhytEditing] = useState<any>(null);
  const [bhytForm, setBhytForm] = useState({ bhytCategory: 'student', bhytMonths: '12', bhytNote: '', amount: '' });
  const [assignForm, setAssignForm] = useState({ feeTypeId: '', campusId: '', classId: '', amount: '', dueDate: '', academicYear: '2025-2026' });

  useEffect(() => {
    fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(Array.isArray(d) ? d : []));
  }, []);

  const loadAssignments = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterFeeType !== 'all') params.set('feeTypeId', filterFeeType);
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (filterClass !== 'all') params.set('classId', filterClass);
    fetch(`/api/fee-assignments?${params}`).then(r => r.json()).then(d => { setAssignments(d?.assignments ?? []); setTotal(d?.total ?? 0); });
  }, [page, filterStatus, filterFeeType, filterCampus, filterClass]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleAssign = async () => {
    const body: any = { feeTypeId: assignForm.feeTypeId, academicYear: assignForm.academicYear };
    if (assignForm.amount) body.amount = Number(assignForm.amount);
    if (assignForm.dueDate) {
      const dueDate = parseDateInput(assignForm.dueDate);
      if (!dueDate) { toast.error('Nhập hạn đóng hợp lệ theo dd/mm/yyyy, ví dụ 05/09/2026'); return; }
      body.dueDate = dueDate;
    }
    if (assignForm.classId) body.classId = assignForm.classId;
    else if (assignForm.campusId) body.campusId = assignForm.campusId;
    else { toast?.error?.('Vui lòng chọn cơ sở hoặc lớp'); return; }

    const res = await fetch('/api/fee-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { toast?.success?.(`Đã gán cho ${data?.created ?? 0} học sinh`); setOpen(false); loadAssignments(); }
    else toast?.error?.(data?.error ?? 'Lỗi');
  };

  const filteredClasses = assignForm.campusId
    ? classes.filter((c: any) => c?.campusId === assignForm.campusId)
    : classes;

  const qrFilters = () => ({
    ...(filterFeeType !== 'all' ? { feeTypeId: filterFeeType } : {}),
    ...(filterCampus !== 'all' ? { campusId: filterCampus } : {}),
    ...(filterClass !== 'all' ? { classId: filterClass } : {}),
  });

  const printBulkQr = async () => {
    const popup = window.open('', '_blank');
    if (!popup) return toast.error('Trình duyệt đang chặn cửa sổ in');
    popup.document.write('<p style="font-family:sans-serif;padding:24px">Đang tạo mã QR...</p>');
    setProcessingQr(true);
    try {
      const params = new URLSearchParams(qrFilters());
      const res = await fetch(`/api/fee-assignments/qr-bulk?${params}`);
      const groups = await res.json();
      if (!res.ok) throw new Error(groups?.error ?? 'Không thể tạo QR');
      const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
      popup.document.open();
      popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Mã QR khoản thu</title><style>body{font-family:Arial;margin:20px;color:#111}.grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.card{border:1px solid #bbb;border-radius:12px;padding:16px;break-inside:avoid;text-align:center}.qr{width:220px;height:220px}.name{font-size:18px;font-weight:700}.amount{font-size:20px;font-weight:700;color:#067647}.info{margin:5px 0}.description{font-size:12px}@media print{button{display:none}}@media(max-width:700px){.grid{grid-template-columns:1fr}}</style></head><body><button onclick="window.print()">In / Lưu PDF</button><h1>Mã QR thanh toán khoản thu</h1><div class="grid">${groups.map((group: any) => `<div class="card"><div class="name">${escape(group.fullName)} - Lớp ${escape(group.className)}</div><div class="info">${escape(group.feeNames.join(', '))}</div><img class="qr" src="${escape(group.qrUrl)}"><div class="amount">${escape(formatCurrency(group.amount))}</div><div class="info">${escape(group.bankName)} • ${escape(group.accountNo)}</div><div class="info">${escape(group.accountName)}</div><div class="description">${escape(group.description)}</div></div>`).join('')}</div></body></html>`);
      popup.document.close();
    } catch (error: any) {
      popup.close();
      toast.error(error?.message ?? 'Không thể tạo QR');
    } finally {
      setProcessingQr(false);
    }
  };

  const sendBulkQr = async () => {
    if (!confirm('Gửi thông báo thanh toán và đường dẫn QR cho tất cả học sinh chưa đóng theo bộ lọc hiện tại?')) return;
    setProcessingQr(true);
    try {
      const res = await fetch('/api/fee-assignments/qr-bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(qrFilters()) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? 'Không thể gửi QR');
      toast.success(`Đã gửi QR cho ${data.sent} học sinh`);
    } catch (error: any) {
      toast.error(error?.message ?? 'Không thể gửi QR');
    } finally {
      setProcessingQr(false);
    }
  };

  const saveBhyt = async () => {
    const payload: any = { bhytCategory: bhytForm.bhytCategory, bhytNote: bhytForm.bhytNote };
    if (bhytForm.bhytCategory === 'student_custom') {
      payload.bhytMonths = Number(bhytForm.bhytMonths);
      payload.amount = Number(bhytForm.amount);
    }
    const res = await fetch(`/api/fee-assignments/${bhytEditing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(data?.error ?? 'Không thể lưu cấu hình BHYT');
    toast.success('Đã cập nhật diện tham gia BHYT'); setBhytEditing(null); loadAssignments();
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Phân công Khoản thu</h1>
          <p className="text-sm text-muted-foreground">{total} khoản thu đã gán</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isTeacher && <Button variant="outline" disabled={processingQr} onClick={printBulkQr}><Printer className="h-4 w-4 mr-1" /> Tạo/In QR hàng loạt</Button>}
          <Button variant="outline" disabled={processingQr} onClick={sendBulkQr}><Send className="h-4 w-4 mr-1" /> Gửi QR cho học sinh</Button>
          {!isTeacher && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Gán khoản thu</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Gán khoản thu cho học sinh</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Khoản thu</Label>
                <Select value={assignForm.feeTypeId} onValueChange={v => setAssignForm({ ...assignForm, feeTypeId: v, amount: '' })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn khoản thu" /></SelectTrigger>
                  <SelectContent>{feeTypes.filter((f: any) => f?.isActive).map((f: any) => <SelectItem key={f?.id} value={f?.id ?? ''}>{f?.name} - {formatCurrency(f?.amount ?? 0)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Cơ sở</Label>
                <Select value={assignForm.campusId} onValueChange={v => setAssignForm({ ...assignForm, campusId: v, classId: '' })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Chọn cơ sở" /></SelectTrigger>
                  <SelectContent>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Lớp (tùy chọn)</Label>
                <Select value={assignForm.classId} onValueChange={v => setAssignForm({ ...assignForm, classId: v === 'all' ? '' : v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả lớp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả lớp</SelectItem>
                    {filteredClasses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Số tiền áp dụng</Label><Input type="number" min="0" value={assignForm.amount} onChange={e => setAssignForm({ ...assignForm, amount: e.target.value })} className="mt-1" placeholder="Để trống để dùng mức mặc định của khoản thu" /><p className="mt-1 text-xs text-muted-foreground">Hệ thống tự áp mức đã cấu hình cho toàn bộ học sinh trong lớp hoặc cơ sở.</p></div>
              <div><Label htmlFor="due-date">Hạn đóng (dd/mm/yyyy)</Label><Input id="due-date" type="text" placeholder="dd/mm/yyyy" maxLength={10} value={assignForm.dueDate} onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleAssign} className="w-full">Gán khoản thu</Button>
            </div>
          </DialogContent>
          </Dialog>}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả trạng thái</SelectItem>
            <SelectItem value="pending">Chưa đóng</SelectItem>
            <SelectItem value="uploaded">Đã gửi ảnh</SelectItem>
            <SelectItem value="confirmed">Đã xác nhận</SelectItem>
            <SelectItem value="rejected">Bị từ chối</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterFeeType} onValueChange={v => { setFilterFeeType(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả khoản</SelectItem>{feeTypes.map((f: any) => <SelectItem key={f?.id} value={f?.id ?? ''}>{f?.name}</SelectItem>)}</SelectContent>
        </Select>
        {!isTeacher && <Select value={filterCampus} onValueChange={v => { setFilterCampus(v); setFilterClass('all'); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả cơ sở</SelectItem>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
        </Select>}
        {!isTeacher && <Select value={filterClass} onValueChange={v => { setFilterClass(v); setPage(1); }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{classes.filter((item: any) => filterCampus === 'all' || item.campusId === filterCampus).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã HS</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Lớp</TableHead>
                <TableHead>Khoản thu</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a?.id}>
                  <TableCell className="font-mono text-sm">{a?.student?.studentCode}</TableCell>
                  <TableCell className="font-medium">{a?.student?.fullName}</TableCell>
                  <TableCell>{a?.student?.class?.name}</TableCell>
                  <TableCell>{a?.feeType?.name}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(a?.amount ?? 0)}</TableCell>
                  <TableCell><StatusBadge status={a?.status ?? 'pending'} /></TableCell>
                  <TableCell>{!isTeacher && a?.feeType?.name?.toUpperCase().includes('BHYT') && <Button variant="ghost" size="sm" onClick={() => { setBhytEditing(a); setBhytForm({ bhytCategory: a.bhytCategory ?? 'student', bhytMonths: String(a.bhytMonths ?? 12), bhytNote: a.bhytNote ?? '', amount: String(a.amount ?? 0) }); }}><Settings2 className="mr-1 h-4 w-4" /> Trường hợp đặc biệt</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!bhytEditing} onOpenChange={(value) => { if (!value) setBhytEditing(null); }}><DialogContent><DialogHeader><DialogTitle>Cấu hình BHYT – {bhytEditing?.student?.fullName}</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label>Trường hợp tham gia</Label><Select value={bhytForm.bhytCategory} onValueChange={(value) => setBhytForm({ ...bhytForm, bhytCategory: value })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="student">Thông thường – dùng mức thu chung</SelectItem><SelectItem value="student_custom">Đóng tại trường theo số tháng riêng</SelectItem><SelectItem value="household">Đã mua BHYT hộ gia đình</SelectItem><SelectItem value="near_poor">Hộ cận nghèo đã được cấp BHYT</SelectItem><SelectItem value="poor">Hộ nghèo đã được cấp BHYT</SelectItem><SelectItem value="commune_free">Thuộc xã/phường được cấp miễn phí</SelectItem><SelectItem value="other">Diện khác đã có BHYT</SelectItem></SelectContent></Select></div>
        {bhytForm.bhytCategory === 'student' && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">Học sinh được tự động áp đủ số tiền mặc định của khoản thu BHYT, không cần cấu hình riêng.</p>}
        {bhytForm.bhytCategory === 'student_custom' && <><div><Label>Số tháng tham gia</Label><Input type="number" min="1" max="12" className="mt-1" value={bhytForm.bhytMonths} onChange={(e) => setBhytForm({ ...bhytForm, bhytMonths: e.target.value })} /></div><div><Label>Số tiền phải đóng</Label><Input type="number" min="0" className="mt-1" value={bhytForm.amount} onChange={(e) => setBhytForm({ ...bhytForm, amount: e.target.value })} /></div></>}
        <div><Label>Ghi chú/minh chứng</Label><Input className="mt-1" value={bhytForm.bhytNote} onChange={(e) => setBhytForm({ ...bhytForm, bhytNote: e.target.value })} placeholder="Ví dụ: Mã thẻ, thời hạn thẻ..." /></div>
        <Button className="w-full" onClick={saveBhyt}>Lưu cấu hình BHYT</Button>
      </div></DialogContent></Dialog>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</Button>
          <span className="text-sm text-muted-foreground self-center">Trang {page}/{Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Sau</Button>
        </div>
      )}
    </div>
  );
}
