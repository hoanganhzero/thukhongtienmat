'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';
import { Download, ReceiptText, Upload } from 'lucide-react';

export function ReportsClient() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFeeType, setFilterFeeType] = useState('all');
  const [filterCampus, setFilterCampus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [reportSearch, setReportSearch] = useState('');
  const [page, setPage] = useState(1);
  const [unmatchedTransactions, setUnmatchedTransactions] = useState<any[]>([]);
  const [unmatchedTotal, setUnmatchedTotal] = useState(0);
  const [summary, setSummary] = useState<any>({ overall: {}, campuses: [], classes: [] });
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importReviewRows, setImportReviewRows] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(Array.isArray(d) ? d : []));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams({ page: String(page), limit: '5000' });
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterFeeType !== 'all') params.set('feeTypeId', filterFeeType);
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (filterClass !== 'all') params.set('classId', filterClass);
    if (filterGrade !== 'all') params.set('grade', filterGrade);
    fetch(`/api/fee-assignments?${params}`).then(r => r.json()).then(d => { setAssignments(d?.assignments ?? []); setTotal(d?.total ?? 0); });
  }, [page, filterStatus, filterFeeType, filterCampus, filterClass, filterGrade]);

  useEffect(() => { load(); }, [load]);

  const loadUnmatchedTransactions = useCallback(() => {
    fetch('/api/bank-transactions?limit=200')
      .then(r => r.json())
      .then(d => {
        setUnmatchedTransactions(d?.transactions ?? []);
        setUnmatchedTotal(d?.total ?? 0);
      });
  }, []);

  useEffect(() => { loadUnmatchedTransactions(); }, [loadUnmatchedTransactions]);

  const refreshSepayReport = () => {
    setImportReviewRows([]);
    loadUnmatchedTransactions();
  };

  const loadSummary = useCallback(() => {
    const params = new URLSearchParams();
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (filterClass !== 'all') params.set('classId', filterClass);
    if (filterGrade !== 'all') params.set('grade', filterGrade);
    fetch(`/api/reports/summary?${params}`)
      .then(r => r.json())
      .then(d => setSummary(d?.overall ? d : { overall: {}, campuses: [], classes: [] }));
  }, [filterCampus, filterClass, filterGrade]);

  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      load();
      loadSummary();
      loadUnmatchedTransactions();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, load, loadSummary, loadUnmatchedTransactions]);

  const importTransactions = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    const send = async (commit: boolean) => {
      const form = new FormData();
      form.append('file', file);
      form.append('commit', String(commit));
      const response = await fetch('/api/bank-transactions/import', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? 'Không thể đối chiếu tệp');
      return data;
    };
    try {
      const preview = await send(false);
      const s = preview.summary;
      const approved = confirm(
        `Đối chiếu ${s.total} giao dịch:\n- Có thể xác nhận: ${s.matched}\n- Đã xác nhận trước: ${s.alreadyConfirmed}\n- Cần xem xét: ${s.review}\n- Không hợp lệ: ${s.invalid}\n\nChỉ các dòng khớp duy nhất họ tên và lớp mới được xác nhận. Tiếp tục?`
      );
      if (approved) {
        const result = await send(true);
        alert(`Đã xác nhận ${result.summary.matched} học sinh. ${result.summary.review} giao dịch được giữ lại để xem xét.`);
        setImportReviewRows((result.results ?? []).filter((row: any) => row.status === 'review'));
        load();
        loadSummary();
        loadUnmatchedTransactions();
      }
    } catch (error: any) {
      alert(error?.message ?? 'Không thể nhập tệp giao dịch');
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  const confirmReviewedPayment = async (transactionId: string, assignmentId: string) => {
    if (!confirm('Xác nhận thủ công học sinh này đã đóng BHTT từ giao dịch đang chọn?')) return;
    const response = await fetch('/api/bank-transactions/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, assignmentId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return alert(data?.error ?? 'Không thể xác nhận giao dịch');
    setImportReviewRows(rows => rows.filter(row => row.transactionId !== transactionId));
    load();
    loadSummary();
    loadUnmatchedTransactions();
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    if (filterFeeType !== 'all') params.set('feeTypeId', filterFeeType);
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (filterClass !== 'all') params.set('classId', filterClass);
    const a = document.createElement('a');
    a.href = `/api/reports/export?${params}`;
    a.download = 'bao-cao-hoc-phi.xlsx';
    a.click();
  };

  const exportUnmatchedCsv = () => {
    const rows = unmatchedTransactions.map((transaction: any) => [
      transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleString('vi-VN') : '',
      transaction.gateway ?? '',
      transaction.accountNumber ?? '',
      transaction.transferAmount ?? 0,
      transaction.content ?? '',
      transaction.referenceCode ?? transaction.providerTransactionId ?? '',
      transaction.reason ?? '',
    ]);
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\ufeff' + [
      ['Thời gian', 'Ngân hàng', 'Tài khoản nhận', 'Số tiền', 'Nội dung chuyển khoản', 'Mã tham chiếu', 'Lý do chưa xác nhận'],
      ...rows,
    ].map(row => row.map(quote).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'giao-dich-sepay-chua-xac-nhan.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBhttList = () => {
    const params = new URLSearchParams();
    if (filterCampus !== 'all') params.set('campusId', filterCampus);
    if (filterClass !== 'all') params.set('classId', filterClass);
    if (filterGrade !== 'all') params.set('grade', filterGrade);
    window.location.href = `/api/reports/bhtt-list?${params}`;
  };

  const totalAmount = summary?.overall?.requiredAmount ?? 0;
  const confirmedAmount = summary?.overall?.collectedAmount ?? 0;

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Báo cáo Thống kê</h1>
          <p className="text-sm text-muted-foreground">BHTT qua MB Bank 0335127226 — NGUYEN THI PHUONG THAO</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={event => setAutoRefresh(event.target.checked)} />
            Tự cập nhật 30 giây
          </label>
          <Button variant="outline" onClick={exportBhttList}><Download className="h-4 w-4 mr-1" /> Xuất DS BHTT</Button>
          <Button onClick={handleExport}><Download className="h-4 w-4 mr-1" /> Xuất báo cáo</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Tổng cần thu</p><p className="text-xl font-bold font-mono mt-1">{formatCurrency(totalAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Đã thu</p><p className="text-xl font-bold font-mono text-green-600 mt-1">{formatCurrency(confirmedAmount)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Còn lại</p><p className="text-xl font-bold font-mono text-yellow-600 mt-1">{formatCurrency(totalAmount - confirmedAmount)}</p></CardContent></Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Select value={filterGrade} onValueChange={v => { setFilterGrade(v); setFilterClass('all'); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả khối</SelectItem><SelectItem value="10">Khối 10</SelectItem><SelectItem value="11">Khối 11</SelectItem><SelectItem value="12">Khối 12</SelectItem></SelectContent>
        </Select>
        <Select value={filterCampus} onValueChange={v => { setFilterCampus(v); setFilterClass('all'); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả cơ sở</SelectItem>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterClass} onValueChange={v => { setFilterClass(v); setPage(1); }}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{classes.filter((item: any) => (filterCampus === 'all' || item.campusId === filterCampus) && (filterGrade === 'all' || String(item.name ?? '').startsWith(filterGrade))).map((item: any) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
        <Select value={filterFeeType} onValueChange={v => { setFilterFeeType(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả khoản</SelectItem>{feeTypes.map((f: any) => <SelectItem key={f?.id} value={f?.id ?? ''}>{f?.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="pending">Chưa đóng</SelectItem><SelectItem value="uploaded">Đã gửi ảnh</SelectItem><SelectItem value="confirmed">Đã xác nhận</SelectItem><SelectItem value="exempt">Không phải đóng</SelectItem><SelectItem value="rejected">Từ chối</SelectItem></SelectContent>
        </Select>
      </div>

      <Input
        placeholder="Tra cứu nhanh mã học sinh, họ tên hoặc lớp..."
        value={reportSearch}
        onChange={event => setReportSearch(event.target.value)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle>Thống kê theo cơ sở</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Cơ sở</TableHead><TableHead>Đã đóng</TableHead><TableHead>Tổng HS</TableHead><TableHead>Đã thu</TableHead></TableRow></TableHeader>
              <TableBody>
                {(summary?.campuses ?? []).map((row: any) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.confirmed}</TableCell><TableCell>{row.total}</TableCell><TableCell className="font-mono">{formatCurrency(row.collectedAmount)}</TableCell></TableRow>)}
                {!(summary?.campuses ?? []).length && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Thống kê theo lớp</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-x-auto max-h-[420px]">
            <Table>
              <TableHeader><TableRow><TableHead>Lớp</TableHead><TableHead>Cơ sở</TableHead><TableHead>Đã đóng</TableHead><TableHead>Tổng HS</TableHead><TableHead>Đã thu</TableHead></TableRow></TableHeader>
              <TableBody>
                {(summary?.classes ?? []).map((row: any) => <TableRow key={row.id}><TableCell>{row.name}</TableCell><TableCell>{row.campus}</TableCell><TableCell>{row.confirmed}</TableCell><TableCell>{row.total}</TableCell><TableCell className="font-mono">{formatCurrency(row.collectedAmount)}</TableCell></TableRow>)}
                {!(summary?.classes ?? []).length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
                <TableHead>Chứng từ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.filter((a: any) => `${a?.student?.studentCode ?? ''} ${a?.student?.fullName ?? ''} ${a?.student?.class?.name ?? ''}`.toLocaleLowerCase('vi').includes(reportSearch.toLocaleLowerCase('vi'))).map((a: any) => (
                <TableRow key={a?.id}>
                  <TableCell className="font-mono text-sm">{a?.student?.studentCode}</TableCell>
                  <TableCell>{a?.student?.fullName}</TableCell>
                  <TableCell>{a?.student?.class?.name}</TableCell>
                  <TableCell className="text-sm">{a?.student?.class?.campus?.name}</TableCell>
                  <TableCell>{a?.feeType?.name}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(a?.amount ?? 0)}</TableCell>
                  <TableCell><StatusBadge status={a?.status ?? 'pending'} /></TableCell>
                  <TableCell>{a?.status === 'confirmed' && <Button variant="outline" size="sm" onClick={() => window.open(`/api/receipts/${a.id}`, '_blank')}><ReceiptText className="mr-1 h-4 w-4" /> Xuất</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {!!importReviewRows.length && <Card className="border-yellow-300">
        <CardHeader>
          <CardTitle>Giao dịch Excel cần cân nhắc</CardTitle>
          <p className="text-sm text-muted-foreground">Chỉ bấm xác nhận khi đã kiểm tra đúng họ tên, lớp và số tiền.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {importReviewRows.map((row: any) => <div key={row.transactionId} className="rounded-lg border p-3">
            <p className="text-sm">{row.content}</p>
            <p className="mt-1 text-sm text-red-600">{row.reason}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(row.possible ?? []).map((student: any) => <Button key={student.assignmentId} size="sm" variant="outline" onClick={() => confirmReviewedPayment(row.transactionId, student.assignmentId)}>
                Xác nhận {student.fullName} — {student.className}
              </Button>)}
              {!(row.possible ?? []).length && <span className="text-sm text-muted-foreground">Không có học sinh đủ điều kiện gợi ý.</span>}
            </div>
          </div>)}
        </CardContent>
      </Card>}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Giao dịch SePay chưa xác nhận</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{unmatchedTotal} giao dịch chưa khớp đúng nội dung hoặc khoản thu</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <input ref={importInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={event => importTransactions(event.target.files?.[0])} />
            <Button variant="outline" disabled={importing} onClick={() => importInputRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> {importing ? 'Đang đối chiếu...' : 'Nhập Excel MB Bank'}</Button>
            <Button variant="outline" onClick={refreshSepayReport}>Làm mới</Button>
            <Button variant="outline" disabled={!unmatchedTransactions.length} onClick={() => { window.location.href = '/api/bank-transactions/export-review'; }}><Download className="mr-1 h-4 w-4" /> Xuất Excel cần xem xét</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Ngân hàng</TableHead>
                <TableHead>Tài khoản nhận</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead className="min-w-[320px]">Nội dung chuyển khoản</TableHead>
                <TableHead>Mã tham chiếu</TableHead>
                <TableHead className="min-w-[240px]">Lý do chưa xác nhận</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unmatchedTransactions.map((transaction: any) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap text-sm">{transaction.transactionDate ? new Date(transaction.transactionDate).toLocaleString('vi-VN') : '—'}</TableCell>
                  <TableCell>{transaction.gateway ?? 'SePay'}</TableCell>
                  <TableCell className="font-mono text-sm">{transaction.accountNumber}</TableCell>
                  <TableCell className="font-mono">{formatCurrency(transaction.transferAmount ?? 0)}</TableCell>
                  <TableCell className="text-sm">{transaction.content}</TableCell>
                  <TableCell className="font-mono text-xs">{transaction.referenceCode ?? transaction.providerTransactionId}</TableCell>
                  <TableCell className="text-sm text-red-600">{transaction.reason}</TableCell>
                </TableRow>
              ))}
              {!unmatchedTransactions.length && <TableRow><TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Không có giao dịch SePay chưa xác nhận</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
