'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, MessageSquare, Smartphone } from 'lucide-react';
import { toast } from 'sonner';

export function SettingsClient() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(d => { setSettings(d ?? {}); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const res = await fetch('/api/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
    if (res.ok) toast?.success?.('Đã lưu cài đặt');
    else toast?.error?.('Lỗi lưu');
  };

  const update = (key: string, value: string) => setSettings(prev => ({ ...(prev ?? {}), [key]: value }));

  if (loading) return <div className="p-8"><div className="h-8 bg-muted rounded w-48 animate-pulse" /></div>;

  return (
    <div className="p-6 max-w-[800px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Cài đặt Hệ thống</h1>
          <p className="text-sm text-muted-foreground">Cấu hình thông báo và thông tin trường</p>
        </div>
        <Button onClick={handleSave}><Save className="h-4 w-4 mr-1" /> Lưu tất cả</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Settings className="h-4 w-4 text-primary" /> Thông tin trường</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Tên trường</Label><Input value={settings?.school_name ?? ''} onChange={e => update('school_name', e.target.value)} className="mt-1" /></div>
          <div><Label>Địa chỉ</Label><Input value={settings?.school_address ?? ''} onChange={e => update('school_address', e.target.value)} className="mt-1" /></div>
          <div><Label>Năm học</Label><Input value={settings?.current_academic_year ?? ''} onChange={e => update('current_academic_year', e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MessageSquare className="h-4 w-4 text-primary" /> Zalo OA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>OA Access Token</Label><Input value={settings?.zalo_oa_access_token ?? ''} onChange={e => update('zalo_oa_access_token', e.target.value)} className="mt-1" type="password" /></div>
          <div><Label>OA Secret Key</Label><Input value={settings?.zalo_oa_secret_key ?? ''} onChange={e => update('zalo_oa_secret_key', e.target.value)} className="mt-1" type="password" /></div>
          <div><Label>App ID</Label><Input value={settings?.zalo_app_id ?? ''} onChange={e => update('zalo_app_id', e.target.value)} className="mt-1" /></div>
          <div><Label>ZNS Template ID</Label><Input value={settings?.zalo_zns_template_id ?? ''} onChange={e => update('zalo_zns_template_id', e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Smartphone className="h-4 w-4 text-primary" /> SpeedSMS</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Access Token</Label><Input value={settings?.speedsms_access_token ?? ''} onChange={e => update('speedsms_access_token', e.target.value)} className="mt-1" type="password" /></div>
          <div><Label>Sender Name</Label><Input value={settings?.speedsms_sender_name ?? ''} onChange={e => update('speedsms_sender_name', e.target.value)} className="mt-1" /></div>
        </CardContent>
      </Card>
    </div>
  );
}
