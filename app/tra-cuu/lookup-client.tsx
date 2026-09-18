'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QrDisplay } from '@/components/qr-display';
import { StatusBadge } from '@/components/status-badge';
import { FileUpload } from '@/components/file-upload';
import { formatCurrency, buildVietQrUrl } from '@/lib/utils';
import { groupPendingFees } from '@/lib/payment-qr';
import { Search, ArrowLeft, GraduationCap, Upload as UploadIcon } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

export function LookupClient({ initialQuery }: { initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [student, setStudent] = useState<any>(null);
  const [lookupToken, setLookupToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const doSearch = async (q: string) => {
    if (!q?.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/lookup?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (res.ok) { setStudent(data); setLookupToken(data?.lookupToken ?? ''); }
      else { setStudent(null); setLookupToken(''); setError(data?.error ?? 'Không tìm thấy'); }
    } catch {
      setError('Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (initialQuery) doSearch(initialQuery); }, []);

  const handleUpload = async (feeAssignmentId: string, uploadData: any) => {
    await fetch('/api/payment-proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(lookupToken ? { 'x-payment-lookup-token': lookupToken } : {}) },
      body: JSON.stringify({
        feeAssignmentId,
        imageUrl: uploadData.imageUrl,
        cloudStoragePath: uploadData.cloudStoragePath,
        isPublic: uploadData.isPublic,
      }),
    });
      toast?.success?.('Đã gửi ảnh xác nhận! Vui lòng chờ nhà trường duyệt.');
    setUploadingFor(null);
    doSearch(query);
  };

  const paymentGroups = student ? groupPendingFees((student.feeAssignments ?? [])
    .filter((fee: any) => fee.status === 'pending')
    .map((fee: any) => ({ ...fee, studentId: student.id, student: { studentCode: student.studentCode, fullName: student.fullName, class: { name: student.class.name } } }))) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
      <h1 className="font-display font-bold text-primary">Tra cứu khoản thu</h1>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 py-8 space-y-6">
        <form onSubmit={e => { e.preventDefault(); doSearch(query); }} className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nhập mã học sinh hoặc số điện thoại"
            className="pl-12 pr-24 py-6 text-base rounded-2xl"
          />
          <Button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl" disabled={loading}>
            {loading ? 'Đang tìm...' : 'Tra cứu'}
          </Button>
        </form>

        {error && <p className="text-center text-destructive py-4">{error}</p>}

        {student && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-xl"><GraduationCap className="h-6 w-6 text-primary" /></div>
                  <div>
                    <h2 className="font-display text-lg font-bold">{student?.fullName}</h2>
                    <p className="text-sm text-muted-foreground">Mã HS: <span className="font-mono font-medium">{student?.studentCode}</span> • Lớp: {student?.class?.name} • {student?.class?.campus?.name}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {(student?.feeAssignments?.length ?? 0) === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có khoản thu nào được gán</CardContent></Card>
            ) : (
              <>
              {paymentGroups.map((group) => <QrDisplay key={`${group.studentId}-${group.accountNo}`} accountNo={group.accountNo} amount={group.amount} description={group.description} accountName={group.accountName} bankName={group.bankName} />)}
              {(student.feeAssignments ?? []).map((fa: any) => (
                <Card key={fa?.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{fa?.feeType?.name}</h3>
                        <p className="text-sm text-muted-foreground">{fa?.feeType?.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold font-mono text-lg text-primary">{formatCurrency(fa?.amount ?? 0)}</p>
                        <StatusBadge status={fa?.status ?? 'pending'} />
                      </div>
                    </div>

                    {fa?.status === 'pending' && fa?.feeType?.bankAccountNumber && (
                      <>
                        {uploadingFor === fa.id ? (
                          <FileUpload lookupToken={lookupToken} onUploadComplete={(data) => handleUpload(fa.id, data)} />
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => setUploadingFor(fa.id)}>
                            <UploadIcon className="h-4 w-4 mr-1" /> Tải ảnh xác nhận chuyển khoản
                          </Button>
                        )}
                      </>
                    )}

                    {fa?.status === 'uploaded' && (
                      <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm text-center">
                        Đang chờ nhà trường xác nhận...
                      </div>
                    )}

                    {fa?.status === 'confirmed' && (
                      <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm text-center">
                        ✅ Đã xác nhận thanh toán thành công
                      </div>
                    )}

                    {fa?.status === 'rejected' && (
                      <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                        ❌ Ảnh xác nhận bị từ chối. Vui lòng tải lại ảnh khác.
                        {uploadingFor === fa.id ? (
                            <div className="mt-2"><FileUpload lookupToken={lookupToken} onUploadComplete={(data) => handleUpload(fa.id, data)} /></div>
                        ) : (
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => setUploadingFor(fa.id)}>
                            <UploadIcon className="h-4 w-4 mr-1" /> Tải lại ảnh
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
