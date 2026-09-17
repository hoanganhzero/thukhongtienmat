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
import { Receipt, Plus } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function FeeAssignmentsClient() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeeType, setFilterFeeType] = useState('all');
  const [filterCampus, setFilterCampus] = useState('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
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
    fetch(`/api/fee-assignments?${params}`).then(r => r.json()).then(d => { setAssignments(d?.assignments ?? []); setTotal(d?.total ?? 0); });
  }, [page, filterStatus, filterFeeType, filterCampus]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleAssign = async () => {
    const body: any = { feeTypeId: assignForm.feeTypeId, academicYear: assignForm.academicYear };
    if (assignForm.amount) body.amount = Number(assignForm.amount);
    if (assignForm.dueDate) body.dueDate = assignForm.dueDate;
    if (assignForm.classId) body.classId = assignForm.classId;
    else if (assignForm.campusId) body.campusId = assignForm.campusId;
    else { toast?.error?.('Vui lòng chọn cơ sở hoặc lớp'); return; }

    const res = await fetch('/api/fee-assignments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok) { toast?.success?.(`Đã gán cho ${data?.created ?? 0} học sinh`); setOpen(false); loadAssignments(); }
    else toast?.error?.(data?.error ?? 'Lỗi');
  };

  const filteredClasses = filterCampus !== 'all' && assignForm.campusId
    ? classes.filter((c: any) => c?.campusId === assignForm.campusId)
    : classes;

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Phân công Khoản thu</h1>
          <p className="text-sm text-muted-foreground">{total} khoản thu đã gán</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Gán khoản thu</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Gán khoản thu cho học sinh</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Khoản thu</Label>
                <Select value={assignForm.feeTypeId} onValueChange={v => { setAssignForm({ ...assignForm, feeTypeId: v }); const ft = feeTypes.find((f: any) => f?.id === v); if (ft && !assignForm.amount) setAssignForm(prev => ({ ...prev, feeTypeId: v, amount: String(ft.amount) })); }}>
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
                <Select value={assignForm.classId} onValueChange={v => setAssignForm({ ...assignForm, classId: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả lớp" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả lớp</SelectItem>
                    {filteredClasses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Số tiền (ghi đè)</Label><Input type="number" value={assignForm.amount} onChange={e => setAssignForm({ ...assignForm, amount: e.target.value })} className="mt-1" /></div>
              <div><Label>Hạn đóng</Label><Input type="date" value={assignForm.dueDate} onChange={e => setAssignForm({ ...assignForm, dueDate: e.target.value })} className="mt-1" /></div>
              <Button onClick={handleAssign} className="w-full">Gán khoản thu</Button>
            </div>
          </DialogContent>
        </Dialog>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
