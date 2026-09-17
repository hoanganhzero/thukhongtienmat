'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Send } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationsClient() {
  const [campuses, setCampuses] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [form, setForm] = useState({ campusId: '', classId: '', feeTypeId: '', channel: 'website', message: '' });
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch('/api/campuses').then(r => r.json()).then(d => setCampuses(Array.isArray(d) ? d : []));
    fetch('/api/classes').then(r => r.json()).then(d => setClasses(Array.isArray(d) ? d : []));
    fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
  }, []);

  const handleSend = async () => {
    if (!form.message) { toast?.error?.('Vui lòng nhập nội dung thông báo'); return; }
    setSending(true);
    try {
      // Get students who haven't paid for the selected fee
      const params = new URLSearchParams({ status: 'pending', limit: '999' });
      if (form.feeTypeId) params.set('feeTypeId', form.feeTypeId);
      if (form.classId) params.set('classId', form.classId);
      else if (form.campusId) params.set('campusId', form.campusId);

      const aRes = await fetch(`/api/fee-assignments?${params}`);
      const aData = await aRes.json();
      const studentIds = [...new Set((aData?.assignments ?? []).map((a: any) => a?.studentId).filter(Boolean))];

      if (studentIds.length === 0) { toast?.error?.('Không có học sinh nào cần nhắc nhở'); setSending(false); return; }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds, message: form.message, channel: form.channel, type: 'reminder' }),
      });
      const data = await res.json();
      toast?.success?.(`Đã gửi ${data?.sent ?? 0} thông báo`);
    } catch (error: any) {
      toast?.error?.(error?.message ?? 'Lỗi gửi thông báo');
    } finally {
      setSending(false);
    }
  };

  const filteredClasses = form.campusId ? classes.filter((c: any) => c?.campusId === form.campusId) : classes;

  return (
    <div className="p-6 max-w-[800px] space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Gửi Thông báo</h1>
        <p className="text-sm text-muted-foreground">Gửi nhắc nhở đóng học phí cho học sinh</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bell className="h-4 w-4 text-primary" /> Tạo thông báo</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Label>Cơ sở</Label>
              <Select value={form.campusId} onValueChange={v => setForm({ ...form, campusId: v === 'all' ? '' : v, classId: '' })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tất cả</SelectItem>{campuses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Lớp</Label>
              <Select value={form.classId} onValueChange={v => setForm({ ...form, classId: v === 'all' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tất cả</SelectItem>{filteredClasses.map((c: any) => <SelectItem key={c?.id} value={c?.id ?? ''}>{c?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Khoản thu</Label>
              <Select value={form.feeTypeId} onValueChange={v => setForm({ ...form, feeTypeId: v === 'all' ? '' : v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent><SelectItem value="all">Tất cả</SelectItem>{feeTypes.map((f: any) => <SelectItem key={f?.id} value={f?.id ?? ''}>{f?.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Kênh gửi</Label>
              <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="website">Website</SelectItem>
                  <SelectItem value="zalo">Zalo</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Nội dung</Label>
            <Textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Nhập nội dung thông báo nhắc nhở..." rows={4} className="mt-1" />
          </div>
          <Button onClick={handleSend} disabled={sending} className="w-full"><Send className="h-4 w-4 mr-1" /> Gửi thông báo</Button>
        </CardContent>
      </Card>
    </div>
  );
}
