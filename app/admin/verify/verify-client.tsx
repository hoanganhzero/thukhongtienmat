'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/status-badge';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle2, XCircle, Eye, ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export function VerifyClient() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedProof, setSelectedProof] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch('/api/fee-assignments?status=uploaded&limit=50').then(r => r.json()).then(d => setAssignments(d?.assignments ?? []));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleVerify = async (id: string, status: 'confirmed' | 'rejected') => {
    const body: any = { status };
    if (status === 'rejected') body.rejectReason = rejectReason;
    const res = await fetch(`/api/fee-assignments/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) { toast?.success?.(status === 'confirmed' ? 'Đã xác nhận' : 'Đã từ chối'); setShowReject(null); setRejectReason(''); load(); }
  };

  const viewProofImage = async (proof: any) => {
    if (proof?.cloudStoragePath) {
      const res = await fetch('/api/upload/get-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cloudStoragePath: proof.cloudStoragePath, contentType: 'image/jpeg', isPublic: proof.isPublic }) });
      const data = await res.json();
      setSelectedProof({ ...proof, viewUrl: data?.url ?? proof?.imageUrl });
    } else {
      setSelectedProof({ ...proof, viewUrl: proof?.imageUrl });
    }
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Duyệt Ảnh Xác Nhận</h1>
        <p className="text-sm text-muted-foreground">{assignments?.length ?? 0} khoản đang chờ duyệt</p>
      </div>

      {(assignments?.length ?? 0) === 0 ? (
        <Card><CardContent className="p-12 text-center"><ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">Không có ảnh chờ duyệt</p></CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a: any) => (
            <Card key={a?.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold">{a?.student?.fullName} <span className="text-muted-foreground font-mono text-sm">({a?.student?.studentCode})</span></p>
                    <p className="text-sm text-muted-foreground">{a?.student?.class?.name} - {a?.feeType?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-primary">{formatCurrency(a?.amount ?? 0)}</p>
                    <StatusBadge status={a?.status ?? 'pending'} />
                  </div>
                </div>

                {(a?.paymentProofs?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    {(a.paymentProofs ?? []).map((proof: any) => (
                      <div key={proof?.id} className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => viewProofImage(proof)}>
                          <Eye className="h-4 w-4 mr-1" /> Xem ảnh
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {showReject === a?.id ? (
                  <div className="mt-3 space-y-2">
                    <Input placeholder="Lý do từ chối" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
                    <div className="flex gap-2">
                      <Button variant="destructive" size="sm" onClick={() => handleVerify(a.id, 'rejected')}>Xác nhận từ chối</Button>
                      <Button variant="ghost" size="sm" onClick={() => setShowReject(null)}>Hủy</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" onClick={() => handleVerify(a.id, 'confirmed')}><CheckCircle2 className="h-4 w-4 mr-1" /> Xác nhận đã thu</Button>
                    <Button variant="outline" size="sm" onClick={() => setShowReject(a.id)}><XCircle className="h-4 w-4 mr-1" /> Từ chối</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedProof} onOpenChange={(v) => { if (!v) setSelectedProof(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Ảnh xác nhận</DialogTitle></DialogHeader>
          {selectedProof?.viewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={selectedProof.viewUrl} alt="Ảnh xác nhận thanh toán" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
