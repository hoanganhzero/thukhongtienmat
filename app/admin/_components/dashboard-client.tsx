'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { BarChart3, CheckCircle2, Clock, DollarSign, RefreshCw, Upload, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';

const StatsChart = dynamic(() => import('./stats-chart'), { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-muted/50" /> });
type SummaryRow = { id: string; name: string; total: number; confirmed: number; pending: number; totalAmount: number; confirmedAmount: number; rate: number };
type Stats = { totalStudents: number; totalAssignments: number; totalAmount: number; confirmedAmount: number; statuses: { pending: number; uploaded: number; confirmed: number; rejected: number }; campusStats: SummaryRow[]; classStats: SummaryRow[]; feeTypeStats: SummaryRow[]; recentUploaded: any[] };

export function AdminDashboardClient({ adminRole, teacherClassId }: { adminRole?: string; teacherClassId?: string }) {
  const isTeacher = adminRole === 'teacher';
  const [stats, setStats] = useState<Stats | null>(null);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [campusId, setCampusId] = useState('all');
  const [classId, setClassId] = useState(teacherClassId ?? 'all');
  const [feeTypeId, setFeeTypeId] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetch('/api/campuses').then((r) => r.json()), fetch('/api/classes').then((r) => r.json()), fetch('/api/fee-types').then((r) => r.json())]).then(([p, c, f]) => {
      setCampuses(Array.isArray(p) ? p : []); setClasses(Array.isArray(c) ? c : []); setFeeTypes(Array.isArray(f) ? f : []);
    });
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (campusId !== 'all') params.set('campusId', campusId);
    if (classId !== 'all') params.set('classId', classId);
    if (feeTypeId !== 'all') params.set('feeTypeId', feeTypeId);
    fetch(`/api/dashboard/stats?${params}`).then((r) => r.json()).then(setStats).finally(() => setLoading(false));
  }, [campusId, classId, feeTypeId]);
  useEffect(() => { load(); }, [load]);

  const rate = stats?.totalAmount ? Math.round((stats.confirmedAmount / stats.totalAmount) * 100) : 0;
  const filteredClasses = classes.filter((item) => campusId === 'all' || item.campusId === campusId);
  const reset = () => { setCampusId('all'); setClassId(isTeacher ? teacherClassId ?? 'all' : 'all'); setFeeTypeId('all'); };

  return <div className="mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-display text-2xl font-bold">Dashboard khoản thu</h1><p className="text-sm text-muted-foreground">Theo dõi chính xác tình trạng thu theo điểm trường, phân hiệu và lớp</p></div><Button variant="outline" size="sm" onClick={load}><RefreshCw className="mr-1 h-4 w-4" /> Làm mới</Button></div>

    <Card><CardContent className="flex flex-wrap gap-3 p-4">
      {!isTeacher && <Select value={campusId} onValueChange={(value) => { setCampusId(value); setClassId('all'); }}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toàn bộ điểm trường</SelectItem>{campuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
      {!isTeacher && <Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả lớp</SelectItem>{filteredClasses.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>}
      <Select value={feeTypeId} onValueChange={setFeeTypeId}><SelectTrigger className="w-full sm:w-56"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tất cả khoản thu</SelectItem>{feeTypes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
      {!isTeacher && <Button variant="ghost" onClick={reset}>Xóa bộ lọc</Button>}
    </CardContent></Card>

    {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Học sinh', stats?.totalStudents ?? 0, Users, 'bg-blue-100 text-blue-700'],
          ['Lượt khoản thu', stats?.totalAssignments ?? 0, BarChart3, 'bg-violet-100 text-violet-700'],
          ['Đã xác nhận', stats?.statuses.confirmed ?? 0, CheckCircle2, 'bg-green-100 text-green-700'],
          ['Chưa hoàn thành', (stats?.statuses.pending ?? 0) + (stats?.statuses.uploaded ?? 0) + (stats?.statuses.rejected ?? 0), Clock, 'bg-amber-100 text-amber-700'],
        ].map(([label, value, Icon, color]: any) => <Card key={label}><CardContent className="flex items-center justify-between p-5"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 font-mono text-2xl font-bold">{value}</p></div><div className={`rounded-xl p-3 ${color}`}><Icon className="h-5 w-5" /></div></CardContent></Card>)}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-primary" /> Tiến độ thu</CardTitle></CardHeader><CardContent className="space-y-3"><div className="text-center"><p className="text-4xl font-bold text-primary">{rate}%</p><p className="text-sm text-muted-foreground">đã hoàn thành</p></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${rate}%` }} /></div><div className="flex justify-between text-sm"><span>Cần thu</span><b>{formatCurrency(stats?.totalAmount ?? 0)}</b></div><div className="flex justify-between text-sm"><span>Đã thu</span><b className="text-green-600">{formatCurrency(stats?.confirmedAmount ?? 0)}</b></div><div className="flex justify-between text-sm"><span>Còn lại</span><b className="text-amber-600">{formatCurrency((stats?.totalAmount ?? 0) - (stats?.confirmedAmount ?? 0))}</b></div></CardContent></Card>
        <Card className="lg:col-span-2"><CardHeader><CardTitle className="text-base">So sánh theo điểm trường/phân hiệu</CardTitle></CardHeader><CardContent><StatsChart campusStats={stats?.campusStats ?? []} /></CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Tình trạng theo lớp</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Lớp</TableHead><TableHead className="text-center">Đã đóng</TableHead><TableHead className="text-center">Chưa đóng</TableHead><TableHead className="text-center">Tỷ lệ</TableHead><TableHead className="text-right">Đã thu</TableHead><TableHead className="text-right">Cần thu</TableHead></TableRow></TableHeader><TableBody>{(stats?.classStats ?? []).map((row) => <TableRow key={row.id}><TableCell className="font-semibold">{row.name}</TableCell><TableCell className="text-center text-green-600">{row.confirmed}</TableCell><TableCell className="text-center text-amber-600">{row.pending}</TableCell><TableCell className="min-w-36"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${row.rate}%` }} /></div><span className="w-10 text-right text-sm">{row.rate}%</span></div></TableCell><TableCell className="text-right font-mono">{formatCurrency(row.confirmedAmount)}</TableCell><TableCell className="text-right font-mono">{formatCurrency(row.totalAmount)}</TableCell></TableRow>)}</TableBody></Table></div>{!stats?.classStats?.length && <p className="p-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu khoản thu</p>}</CardContent></Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(stats?.feeTypeStats ?? []).map((row) => <Card key={row.id}><CardContent className="p-5"><div className="flex justify-between"><div><p className="font-semibold">{row.name}</p><p className="text-sm text-muted-foreground">{row.confirmed}/{row.total} lượt đã đóng</p></div><span className="text-xl font-bold text-primary">{row.rate}%</span></div><div className="my-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-green-500" style={{ width: `${row.rate}%` }} /></div><div className="flex justify-between text-sm"><span>Đã thu</span><b>{formatCurrency(row.confirmedAmount)}</b></div></CardContent></Card>)}</div>

      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-primary" /> Biên lai chờ duyệt gần nhất</CardTitle>{!isTeacher && <Link href="/admin/verify" className="text-sm text-primary hover:underline">Xem tất cả</Link>}</div></CardHeader><CardContent>{!stats?.recentUploaded?.length ? <p className="py-4 text-center text-sm text-muted-foreground">Không có biên lai chờ duyệt</p> : <div className="space-y-2">{stats.recentUploaded.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 p-3"><div><p className="text-sm font-medium">{item.student.fullName} ({item.student.studentCode})</p><p className="text-xs text-muted-foreground">{item.student.class.name} • {item.feeType.name}</p></div><div className="flex items-center gap-3"><b className="font-mono text-sm">{formatCurrency(item.amount)}</b><StatusBadge status={item.status} /></div></div>)}</div>}</CardContent></Card>
    </>}
  </div>;
}
