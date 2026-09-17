'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, Download } from 'lucide-react';

export function ReportsClient() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeeType, setFilterFeeType] = useState('all');
  const [filterCampus, setFilterCampus] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterFeeType !== 'all') params.set('feeTypeId', filterFeeType);
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    fetch(`/api/fee-assignments?${params}`).then(r => r.json()).then(d => { setAssignments(d?.assignments ?? []); setTotal(d?.total ?? 0); });
  }, [page, filterStatus, filterFeeType, filterCampus]);

  useEffect(() => { load(); }, [load]);

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterFeeType !== 'all') params.set('feeTypeId', filterFeeType);
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    const a = document.createElement('a');
    a.href = `/api/reports/export?${params}`;
    a.download = 'bao-cao-hoc-phi.xlsx';
    a.click();
  };

  const totalAmount = assignments.reduce((sum: number, a: any) => sum + (a?.amount ?? 0), 0);
  const confirmedAmount = assignments.filter((a: any) => a?.status === 'confirmed').reduce((sum: number, a: any) => sum + (a?.amount ?? 0), 0);

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Báo cáo Thống kê</h1>
          <p className="text-sm text-muted-foreground">Thống kê tổng hợp thu học phí</p>
        </div>
        <Button onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Xuất Excel</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Tổng cần thu</p><p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Đã thu</p><p className="text-xl font-bold font-mono text-green-600 mt-1">{formatCurrency(confirmedAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Còn lại</p><p className="text-xl font-bold font-mono text-yellow-600 mt-1">{formatCurrency(totalAmount - confirmedAmount)}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterCampus} onValueChange={v => { setFilterCampus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả cơ sở</SelectItem>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterFeeType} onValueChange={v => { setFilterFeeType(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả khoản</SelectItem>{feeTypes.map((f: any) => <SelectItem key={f?.id} value={f?.id ?? ''}>{f?.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="pending">Chưa đóng</SelectItem><SelectItem value="uploaded">Đã gửi ảnh</SelectItem><SelectItem value="confirmed">Đã xác nhận</SelectItem><SelectItem value="rejected">Từ chối</SelectItem></SelectContent>
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
                <TableHead>Cơ sở</TableHead>
                <TableHead>Khoản thu</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((a: any) => (
                <TableRow key={a?.id}>
                  <TableCell className="font-mono text-sm">{a?.student?.studentCode}</TableCell>
                  <TableCell>{a?.student?.fullName}</TableCell>
                  <TableCell>{a?.student?.class?.name}</TableCell>
                  <TableCell className="text-sm">{a?.student?.class?.campus?.name}</TableCell>
                  <TableCell>{a?.feeType?.name}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(a?.amount ?? 0)}</TableCell>
                  <TableCell><StatusBadge status={a?.status ?? 'pending'} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
