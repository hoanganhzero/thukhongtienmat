'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrDisplay } from '@/components/qr-display';
import { StatusBadge } from '@/components/status-badge';
import { FileUpload } from '@/components/file-upload';
import { formatCurrency } from '@/lib/utils';
import { GraduationCap, Bell, LogOut, Upload as UploadIcon, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';

interface Props {
  session: any;
}

export function StudentDashboardClient({ session }: Props) {
  const [student, setStudent] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [tab, setTab] = useState<'fees' | 'notifications'>('fees');

  const user = session?.user;
  const studentId = user?.id;

  useEffect(() => {
    if (!studentId) return;
    fetch(`/api/students/${studentId}`).then(r => r.json()).then(d => setStudent(d)).catch(() => {});
    fetch(`/api/notifications?studentId=${studentId}`).then(r => r.json()).then(d => setNotifications(Array.isArray(d) ? d : [])).catch(() => {});
  }, [studentId]);

  const handleUpload = async (feeAssignmentId: string, uploadData: any) => {
    await fetch('/api/payment-proofs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeAssignmentId,
        imageUrl: uploadData.imageUrl,
        cloudStoragePath: uploadData.cloudStoragePath,
        isPublic: uploadData.isPublic,
      }),
    });
    toast?.success?.('Đã gửi ảnh! Chờ nhà trường duyệt.');
    setUploadingFor(null);
    fetch(`/api/students/${studentId}`).then(r => r.json()).then(d => setStudent(d)).catch(() => {});
  };

  const unreadCount = (notifications ?? []).filter((n: any) => !n?.isRead).length;

  const feeAssignments = student?.feeAssignments ?? [];
  const pendingCount = feeAssignments.filter((fa: any) => fa?.status === 'pending').length;
  const confirmedCount = feeAssignments.filter((fa: any) => fa?.status === 'confirmed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[800px] mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-display font-bold text-primary text-sm">Học sinh</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setTab('notifications')} className="relative p-2 text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-destructive text-white text-[10px] font-bold rounded-full flex items-center justify-center">{unreadCount}</span>}
            </button>
            <button onClick={() => signOut({ redirectTo: '/' })} className="p-2 text-muted-foreground hover:text-destructive">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 py-6 space-y-6">
        {/* Student info */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-xl"><GraduationCap className="h-6 w-6 text-primary" /></div>
              <div>
                <h2 className="font-display text-lg font-bold">{user?.name ?? student?.fullName}</h2>
                <p className="text-sm text-muted-foreground">
                  Mã HS: <span className="font-mono">{user?.studentCode ?? ''}</span>
                  {user?.className && <> • Lớp: {user.className}</>}
                  {user?.campusName && <> • {user.campusName}</>}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 text-yellow-500 mx-auto" /><p className="text-lg font-bold font-mono mt-1">{pendingCount}</p><p className="text-xs text-muted-foreground">Chưa đóng</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><UploadIcon className="h-5 w-5 text-blue-500 mx-auto" /><p className="text-lg font-bold font-mono mt-1">{feeAssignments.filter((fa: any) => fa?.status === 'uploaded').length}</p><p className="text-xs text-muted-foreground">Chờ duyệt</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><CheckCircle2 className="h-5 w-5 text-green-500 mx-auto" /><p className="text-lg font-bold font-mono mt-1">{confirmedCount}</p><p className="text-xs text-muted-foreground">Đã xác nhận</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button variant={tab === 'fees' ? 'default' : 'outline'} size="sm" onClick={() => setTab('fees')}>Khoản thu</Button>
          <Button variant={tab === 'notifications' ? 'default' : 'outline'} size="sm" onClick={() => setTab('notifications')}>
            Thông báo {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {tab === 'fees' && (
          <div className="space-y-4">
            {feeAssignments.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có khoản thu</CardContent></Card>
            ) : (
              feeAssignments.map((fa: any) => (
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
                        <QrDisplay
                          accountNo={fa.feeType.bankAccountNumber}
                          amount={fa.amount}
                          description={fa.qrContent ?? ''}
                          accountName={fa.feeType.bankAccountName ?? ''}
                        />
                        {uploadingFor === fa.id ? (
                          <FileUpload onUploadComplete={(data) => handleUpload(fa.id, data)} />
                        ) : (
                          <Button variant="outline" className="w-full" onClick={() => setUploadingFor(fa.id)}>
                            <UploadIcon className="h-4 w-4 mr-1" /> Tải ảnh xác nhận
                          </Button>
                        )}
                      </>
                    )}

                    {fa?.status === 'uploaded' && <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm text-center">Đang chờ nhà trường xác nhận...</div>}
                    {fa?.status === 'confirmed' && <div className="bg-green-50 text-green-700 rounded-lg p-3 text-sm text-center">✅ Đã xác nhận thành công</div>}
                    {fa?.status === 'rejected' && (
                      <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">
                        ❌ Bị từ chối. Vui lòng tải lại ảnh.
                        {uploadingFor === fa.id ? (
                          <div className="mt-2"><FileUpload onUploadComplete={(data) => handleUpload(fa.id, data)} /></div>
                        ) : (
                          <Button variant="outline" size="sm" className="mt-2" onClick={() => setUploadingFor(fa.id)}><UploadIcon className="h-4 w-4 mr-1" /> Tải lại</Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'notifications' && (
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">Chưa có thông báo</CardContent></Card>
            ) : (
              notifications.map((n: any) => (
                <Card key={n?.id} className={`${!n?.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
                  <CardContent className="p-4">
                    <p className="text-sm">{n?.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {n?.sentAt ? new Date(n.sentAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' }) : ''}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
