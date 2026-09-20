'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Printer, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const criteria = ['Chuyên cần', 'Học tập', 'Vệ sinh', 'SĐGD 10', 'Đồng phục', 'Cờ đỏ', 'Đạo đức', 'Chạy xe', 'ATGT', 'Tài sản', 'Điểm trừ'];

function currentPeriod() {
  const date = new Date();
  const first = new Date(date.getFullYear(), 0, 1);
  return String(Math.ceil((((date.getTime() - first.getTime()) / 86400000) + first.getDay() + 1) / 7)).padStart(2, '0');
}

export function CompetitionBoardClient() {
  const [classes, setClasses] = useState<any[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [schoolYear, setSchoolYear] = useState('2025-2026');
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/classes').then((r) => r.json()),
      fetch('/api/competition').then((r) => r.json()),
    ]).then(([classData, board]) => {
      setClasses(Array.isArray(classData) ? classData : []);
      const saved = board?.periods?.[period]?.scores;
      if (saved) setScores(saved);
    }).catch(() => toast.error('Không tải được bảng thi đua')).finally(() => setLoading(false));
  }, []);

  const sortedClasses = useMemo(() => [...classes].sort((a, b) => String(a.name).localeCompare(String(b.name), 'vi', { numeric: true })), [classes]);
  const totals = useMemo(() => Object.fromEntries(sortedClasses.map((item) => [
    item.id,
    criteria.reduce((sum, criterion) => sum + (Number(scores[item.id]?.[criterion]) || 0), 0),
  ])), [scores, sortedClasses]);

  const rankings = useMemo(() => {
    const ordered = sortedClasses.map((item) => ({ id: item.id, total: totals[item.id] ?? 0 }))
      .sort((a, b) => b.total - a.total || String(a.id).localeCompare(String(b.id)));
    return Object.fromEntries(ordered.map((item, index) => [item.id, index + 1]));
  }, [sortedClasses, totals]);

  const updateScore = (classId: string, criterion: string, value: string) => {
    setScores((prev) => ({ ...prev, [classId]: { ...(prev[classId] ?? {}), [criterion]: value } }));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch('/api/competition', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period: `${schoolYear}-T${period}`, scores }),
    });
    setSaving(false);
    if (res.ok) toast.success('Đã lưu bảng kết quả thi đua');
    else toast.error((await res.json().catch(() => ({})))?.error ?? 'Không thể lưu bảng');
  };

  if (loading) return <div className="p-6"><div className="h-10 w-72 animate-pulse rounded bg-muted" /></div>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3 print:hidden">
        <div><h1 className="font-display text-2xl font-bold">Bảng kết quả thi đua các lớp</h1><p className="text-sm text-muted-foreground">Nhập điểm theo tuần, tự cộng tổng và xếp hạng</p></div>
        <div className="flex flex-wrap gap-2">
          <Input className="w-32" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} aria-label="Năm học" />
          <Input className="w-28" value={period} onChange={(e) => setPeriod(e.target.value.replace(/\D/g, '').slice(0, 2))} aria-label="Tuần" placeholder="Tuần" />
          <Button variant="outline" onClick={() => window.print()}><Printer className="mr-1 h-4 w-4" /> In/PDF</Button>
          <Button onClick={save} disabled={saving}><Save className="mr-1 h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu bảng'}</Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-3 sm:p-5">
          <div className="mb-4 text-center">
            <h2 className="text-xl font-bold uppercase">BẢNG KẾT QUẢ THI ĐUA</h2>
            <p className="font-semibold italic">TUẦN {period || '____'} — THÁNG ____ — NĂM HỌC {schoolYear}</p>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="min-w-[900px] border-collapse text-center text-sm">
              <thead>
                <tr className="bg-sky-200 font-bold">
                  <th className="border p-2">STT</th><th className="min-w-32 border p-2">NỘI DUNG</th>
                  {sortedClasses.map((item) => <th key={item.id} className="min-w-24 border p-2">{item.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {criteria.map((criterion, index) => <tr key={criterion}>
                  <td className="border p-2">{index + 1}</td><td className="border p-2 text-left font-semibold">{criterion}</td>
                  {sortedClasses.map((item) => <td key={item.id} className="border p-1"><Input className="h-8 min-w-20 border-0 text-center shadow-none focus-visible:ring-1" inputMode="decimal" value={scores[item.id]?.[criterion] ?? ''} onChange={(e) => updateScore(item.id, criterion, e.target.value.replace(/[^0-9.-]/g, ''))} /></td>)}
                </tr>)}
                <tr className="bg-emerald-50 font-bold"><td className="border p-2">12</td><td className="border p-2 text-left">Tổng cộng</td>{sortedClasses.map((item) => <td key={item.id} className="border p-2">{totals[item.id] ?? 0}</td>)}</tr>
                <tr className="bg-amber-50 font-bold"><td className="border p-2">13</td><td className="border p-2 text-left">Xếp hạng</td>{sortedClasses.map((item) => <td key={item.id} className="border p-2">{rankings[item.id] ?? '-'}</td>)}</tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground print:hidden">Điểm và thứ hạng được lưu theo tuần/năm học; có thể chọn In/PDF để in đúng bảng đang hiển thị.</p>
        </CardContent>
      </Card>
      <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden"><RefreshCw className="h-4 w-4" /> Mỗi lớp là một cột, các tiêu chí giống mẫu thầy gửi.</div>
    </div>
  );
}
