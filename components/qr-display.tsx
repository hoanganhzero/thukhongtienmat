'use client';

import { buildVietQrUrl, formatCurrency } from '@/lib/utils';
import { QrCode, Download, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface QrDisplayProps {
  accountNo: string;
  amount: number;
  description: string;
  accountName: string;
  bankName?: string;
}

export function QrDisplay({ accountNo, amount, description, accountName, bankName = 'Agribank' }: QrDisplayProps) {
  const qrUrl = buildVietQrUrl(accountNo, amount, description, accountName, bankName);

  const handleCopy = (text: string, label: string) => {
    navigator?.clipboard?.writeText?.(text);
    toast?.success?.(`Đã sao chép ${label}`);
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = qrUrl;
    a.download = 'qr-thanh-toan.png';
    a.click();
  };

  return (
    <div className="bg-card rounded-xl p-6 shadow-sm border border-border">
      <div className="flex items-center gap-2 mb-4">
        <QrCode className="h-5 w-5 text-primary" />
        <h3 className="font-display font-semibold text-base">Mã QR Thanh toán</h3>
      </div>

      <div className="flex flex-col items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrUrl}
          alt="QR Code thanh toán"
          className="w-56 h-56 rounded-lg bg-white p-2"
          loading="lazy"
        />
        <Button variant="outline" size="sm" className="mt-3" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1" /> Tải QR
        </Button>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ngân hàng:</span>
          <span className="font-medium">{bankName}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground">Số TK:</span>
          <div className="flex items-center gap-1">
            <span className="font-mono font-medium">{accountNo}</span>
            <button onClick={() => handleCopy(accountNo, 'STK')} className="text-primary hover:text-primary/80">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tên TK:</span>
          <span className="font-medium text-right">{accountName}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Số tiền:</span>
          <span className="font-bold text-primary">{formatCurrency(amount)}</span>
        </div>
        <div className="flex justify-between items-start">
          <span className="text-muted-foreground">Nội dung:</span>
          <div className="flex items-center gap-1">
            <span className="font-medium text-right max-w-[180px]">{description}</span>
            <button onClick={() => handleCopy(description, 'nội dung')} className="text-primary hover:text-primary/80 flex-shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
