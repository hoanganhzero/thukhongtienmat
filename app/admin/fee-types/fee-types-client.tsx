'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export function FeeTypesClient() {
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [configuring, setConfiguring] = useState(false);

  const load = () => fetch('/api/fee-types').then(r => r.json()).then(d => setFeeTypes(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  const configureBht = async () => {
    if (!confirm('Chỉ giữ khoản BHTT và dùng MB Bank 0335127226 - NGUYEN THI PHUONG THAO? Khoản đã xác nhận ở cấu hình cũ được lưu lịch sử nhưng ngưng hoạt động.')) return;
    setConfiguring(true);
    const res = await fetch('/api/fee-types/cleanup-bht', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setConfiguring(false);
    if (!res.ok) return toast.error(data?.error ?? 'Không thể cấu hình BHTT');
    toast.success(`Đã áp dụng tài khoản MB Bank. Đã xóa ${data.removed?.length ?? 0} khoản thu khác.`);
    load();
  };

  return (
    <div className="p-6 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cấu hình Khoản thu BHTT</h1>
          <p className="text-sm text-muted-foreground">Chỉ sử dụng MB Bank 0335127226 — NGUYEN THI PHUONG THAO</p>
        </div>
        <Button onClick={configureBht} disabled={configuring}>{configuring ? 'Đang cấu hình...' : 'Áp dụng cấu hình MB Bank'}</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {feeTypes.map((ft: any) => (
          <Card key={ft?.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex gap-3">
                <div className="p-2.5 bg-primary/10 rounded-lg"><CreditCard className="h-5 w-5 text-primary" /></div>
                <div>
                  <h3 className="font-semibold">{ft?.name}</h3>
                  <p className="text-xs text-muted-foreground">{ft?.description}</p>
                  <p className="font-bold text-primary mt-1">{formatCurrency(ft?.amount ?? 0)}</p>
                  <p className="text-sm mt-2">{ft?.bankName}</p>
                  <p className="text-xs font-mono mt-1">{ft?.bankAccountNumber}</p>
                  <p className="text-xs text-muted-foreground">{ft?.bankAccountName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!feeTypes.length && <p className="text-sm text-muted-foreground">Nhấn “Áp dụng cấu hình MB Bank” để tạo khoản BHTT mặc định.</p>}
      </div>
    </div>
  );
}
