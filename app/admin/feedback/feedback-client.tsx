'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function FeedbackClient({ session }: { session: any }) {
  const role = session?.user?.adminRole ?? 'super_admin';
  const canHandle = ['super_admin', 'accountant', 'treasurer'].includes(role);
  const [items, setItems] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [replies, setReplies] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    fetch('/api/feedback').then(r => r.json()).then(d => setItems(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => {
    load();
    if (role === 'teacher') fetch('/api/fee-assignments?limit=5000').then(r => r.json()).then(d => setAssignments(d?.assignments ?? []));
  }, [load, role]);

  const send = async () => {
    const assignment = assignments.find(item => item.id === selected);
    if (!assignment) return alert('Vui lòng chọn học sinh và khoản thu');
    const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      studentId: assignment.studentId, feeAssignmentId: assignment.id, message,
    })});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return alert(data?.error ?? 'Không thể gửi phản hồi');
    setMessage(''); setSelected(''); load();
  };

  const reply = async (id: string) => {
    const response = await fetch('/api/feedback', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reply: replies[id], status: 'resolved' }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return alert(data?.error ?? 'Không thể trả lời');
    setReplies(values => ({ ...values, [id]: '' })); load();
  };

  const choices = assignments.filter(item => {
    const text = `${item.student?.studentCode} ${item.student?.fullName} ${item.student?.class?.name}`.toLocaleLowerCase('vi');
    return text.includes(search.toLocaleLowerCase('vi'));
  });

  return <div className="p-6 max-w-[1100px] space-y-5">
    <div><h1 className="text-2xl font-bold">Phản hồi khoản thu</h1><p className="text-sm text-muted-foreground">Trao đổi sai sót giữa GVCN, học sinh, admin, thủ quỹ và kế toán.</p></div>

    {role === 'teacher' && <Card><CardHeader><CardTitle>Gửi phản hồi cho nhà trường</CardTitle></CardHeader><CardContent className="space-y-3">
      <Input placeholder="Tìm mã học sinh, họ tên hoặc lớp..." value={search} onChange={event => setSearch(event.target.value)} />
      <Select value={selected} onValueChange={setSelected}><SelectTrigger><SelectValue placeholder="Chọn học sinh và khoản thu" /></SelectTrigger><SelectContent>
        {choices.slice(0, 200).map(item => <SelectItem key={item.id} value={item.id}>{item.student?.fullName} — {item.student?.class?.name} — {item.feeType?.name}</SelectItem>)}
      </SelectContent></Select>
      <textarea className="min-h-24 w-full rounded-md border p-3 text-sm" placeholder="Mô tả sai sót cần kiểm tra..." value={message} onChange={event => setMessage(event.target.value)} />
      <Button disabled={!selected || message.trim().length < 5} onClick={send}>Gửi phản hồi</Button>
    </CardContent></Card>}

    <div className="space-y-3">{items.map(item => <Card key={item.id} className={item.status === 'pending' ? 'border-yellow-300' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex flex-wrap justify-between gap-2">
          <p className="font-semibold">{item.student?.fullName} — {item.student?.class?.name}</p>
          <span className="text-sm">{item.status === 'resolved' ? '✅ Đã xử lý' : item.status === 'rejected' ? 'Đã từ chối' : '⏳ Chờ xử lý'}</span>
        </div>
        <p className="text-sm text-muted-foreground">{item.student?.studentCode} • {item.feeAssignment?.feeType?.name ?? 'Phản hồi chung'} • Người gửi: {item.senderRole}</p>
        <p className="rounded-md bg-muted p-3 text-sm">{item.message}</p>
        {item.reply && <p className="rounded-md bg-green-50 p-3 text-sm text-green-800"><b>Phản hồi:</b> {item.reply}</p>}
        {canHandle && item.status === 'pending' && <div className="flex gap-2">
          <Input placeholder="Nhập nội dung trả lời..." value={replies[item.id] ?? ''} onChange={event => setReplies(values => ({ ...values, [item.id]: event.target.value }))} />
          <Button disabled={(replies[item.id] ?? '').trim().length < 2} onClick={() => reply(item.id)}>Trả lời</Button>
        </div>}
      </CardContent>
    </Card>)}
    {!items.length && <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có phản hồi</CardContent></Card>}</div>
  </div>;
}
