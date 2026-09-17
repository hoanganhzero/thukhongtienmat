'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';
import { Users, Clock, CheckCircle2, XCircle, Upload, DollarSign, Building2, TrendingUp } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const StatsChart = dynamic(() => import('./stats-chart'), { ssr: false, loading: () => <div className="h-64 bg-muted/50 rounded-lg animate-pulse" /> });

interface Stats {
  totalStudents: number;
  totalPending: number;
  totalUploaded: number;
  totalConfirmed: number;
  totalRejected: number;
  totalAmount: number;
  confirmedAmount: number;
  campusStats: { id: string; name: string; studentCount: number; totalAmount: number; confirmedAmount: number }[];
  recentUploaded: any[];
}

export function AdminDashboardClient() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-muted rounded-xl" />)}</div></div></div>;

  const cards = [
    { label: 'Học sinh', value: stats?.totalStudents ?? 0, icon: Users, color: 'text-blue-600 bg-blue-100' },
    { label: 'Chưa đóng', value: stats?.totalPending ?? 0, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'Đã gửi ảnh', value: stats?.totalUploaded ?? 0, icon: Upload, color: 'text-indigo-600 bg-indigo-100' },
    { label: 'Đã xác nhận', value: stats?.totalConfirmed ?? 0, icon: CheckCircle2, color: 'text-green-600 bg-green-100' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">Trung tâm GDNN-GDTX Khu vực Tân Ninh</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-2xl font-bold font-mono mt-1">{c.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${c.color}`}>
                  <c.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><DollarSign className="h-4 w-4 text-primary" /> Tổng thu</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cần thu:</span>
                <span className="font-bold font-mono">{formatCurrency(stats?.totalAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Đã thu:</span>
                <span className="font-bold font-mono text-green-600">{formatCurrency(stats?.confirmedAmount ?? 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Còn lại:</span>
                <span className="font-bold font-mono text-yellow-600">{formatCurrency((stats?.totalAmount ?? 0) - (stats?.confirmedAmount ?? 0))}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-3 mt-2">
                <div className="bg-primary h-3 rounded-full transition-all" style={{ width: `${stats?.totalAmount ? ((stats.confirmedAmount / stats.totalAmount) * 100) : 0}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Theo cơ sở</CardTitle></CardHeader>
          <CardContent>
            <StatsChart campusStats={stats?.campusStats ?? []} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base"><Upload className="h-4 w-4 text-primary" /> Chờ duyệt gần nhất</CardTitle>
            <Link href="/admin/verify" className="text-sm text-primary hover:underline">Xem tất cả</Link>
          </div>
        </CardHeader>
        <CardContent>
          {(stats?.recentUploaded?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Không có ảnh chờ duyệt</p>
          ) : (
            <div className="space-y-3">
              {(stats?.recentUploaded ?? []).map((item: any) => (
                <div key={item?.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{item?.student?.fullName ?? ''} <span className="text-muted-foreground font-mono">({item?.student?.studentCode ?? ''})</span></p>
                    <p className="text-xs text-muted-foreground">{item?.feeType?.name ?? ''} - {item?.student?.class?.name ?? ''}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-medium">{formatCurrency(item?.amount ?? 0)}</span>
                    <StatusBadge status={item?.status ?? 'pending'} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
