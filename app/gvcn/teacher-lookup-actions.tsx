'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardContent } from '@/components/ui/card';
import { Download, MessageSquare } from 'lucide-react';

export function TeacherLookupActions({ classId, query, students }: {
  classId: string;
  query: string;
  students: { id: string; fullName: string; studentCode: string; feeAssignments: { id: string; feeType: { name: string } }[] }[];
}) {
  const [studentId, setStudentId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const send = async () => {
    if (!studentId || message.trim().length < 5) return;
    setBusy(true);
    setNotice('');
    try {
      const res = await fetch('/api/feedback/quick', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'teacher', classId, query, studentId, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Không gửi được phản hồi');
      setMessage('');
      setNotice('Đã gửi phản hồi. Admin, kế toán và thủ quỹ sẽ xem trong mục Phản hồi.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không gửi được phản hồi');
    } finally {
      setBusy(false);
    }
  };
  return <CardContent className="border-t p-4 space-y-3">
    <a className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
      href={`/api/gvcn/export?classId=${encodeURIComponent(classId)}&q=${encodeURIComponent(query)}`}>
      <Download className="h-4 w-4" /> Xuất Excel danh sách lớp
    </a>
    <div className="rounded-xl border p-4 space-y-3">
      <h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="h-4 w-4" /> Gửi phản hồi cho admin, kế toán, thủ quỹ</h3>
      <p className="text-xs text-muted-foreground">Tra cứu công khai chưa xác thực danh tính GVCN. Vui lòng chọn học sinh liên quan để nhà trường kiểm tra.</p>
      <select className="w-full rounded-md border p-2" value={studentId} onChange={event => setStudentId(event.target.value)}>
        <option value="">Chọn học sinh cần phản hồi</option>
        {students.map(student => <option key={student.id} value={student.id}>{student.fullName} — {student.studentCode}</option>)}
      </select>
      <textarea className="min-h-24 w-full rounded-md border p-3" maxLength={2000}
        placeholder="Mô tả sai sót hoặc nội dung cần hỗ trợ..." value={message} onChange={event => setMessage(event.target.value)} />
      <Button disabled={busy || !studentId || message.trim().length < 5} onClick={send}>{busy ? 'Đang gửi...' : 'Gửi phản hồi'}</Button>
      {notice && <p role="status" className="text-sm">{notice}</p>}
    </div>
  </CardContent>;
}
