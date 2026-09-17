'use client';

import { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FileUploadProps {
  onUploadComplete: (data: { imageUrl: string; cloudStoragePath: string; isPublic: boolean }) => void;
  lookupToken?: string;
  accept?: string;
  label?: string;
}

export function FileUpload({ onUploadComplete, lookupToken, accept = 'image/*', label = 'Tải ảnh xác nhận' }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
      toast?.error?.('Chỉ nhận tệp ảnh JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast?.error?.('File quá lớn (tối đa 10MB)');
      return;
    }

    setUploading(true);
    setPreview(URL.createObjectURL(file));

    try {
      // Get presigned URL
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(lookupToken ? { 'x-payment-lookup-token': lookupToken } : {}),
      };
      const presignRes = await fetch('/api/upload/presigned', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ fileName: file.name, contentType: file.type, isPublic: false }),
      });
      const presignData = await presignRes.json();
      if (!presignRes.ok) throw new Error(presignData?.error ?? 'Không tạo được URL upload');
      if (!presignData?.uploadUrl) throw new Error('Không tạo được URL upload');

      // Upload to S3
      const uploadRes = await fetch(presignData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadRes.ok) throw new Error('Không tải được ảnh lên kho lưu trữ');

      // Get view URL
      const urlRes = await fetch('/api/upload/get-url', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ cloudStoragePath: presignData.cloud_storage_path, contentType: file.type, isPublic: false }),
      });
      const urlData = await urlRes.json();
      if (!urlRes.ok || !urlData?.url) throw new Error(urlData?.error ?? 'Không tạo được liên kết ảnh');

      onUploadComplete({
        imageUrl: urlData.url,
        cloudStoragePath: presignData.cloud_storage_path,
        isPublic: false,
      });
      toast?.success?.('Tải ảnh thành công!');
    } catch (error: any) {
      toast?.error?.(error?.message ?? 'Lỗi tải ảnh');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {preview ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Preview" className="w-full max-h-64 object-contain rounded-lg bg-muted" />
          <button
            onClick={() => { setPreview(null); if (inputRef.current) inputRef.current.value = ''; }}
            className="absolute top-2 right-2 p-1 bg-background/80 rounded-full hover:bg-background"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-accent/30 transition-colors">
          <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className="text-xs text-muted-foreground mt-1">Chạm để chọn ảnh hoặc chụp ảnh</span>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => { const f = e.target?.files?.[0]; if (f) handleFile(f); }}
          />
        </label>
      )}

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải lên...
        </div>
      )}
    </div>
  );
}
