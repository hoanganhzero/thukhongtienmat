import Link from 'next/link';
import { Search, LogIn, Shield, QrCode, Upload, CheckCircle } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border">
        <div className="max-w-[1200px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-sm">TN</span>
            </div>
            <div>
              <h1 className="font-display text-sm font-bold text-primary leading-tight">GDNN-GDTX Tân Ninh</h1>
              <p className="text-[10px] text-muted-foreground">Thu không tiền mặt</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/student/login" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <LogIn className="h-4 w-4" /> Học sinh
            </Link>
            <Link href="/admin/login" className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
              <Shield className="h-4 w-4" /> Cán bộ
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1200px] mx-auto px-4 py-16 md:py-24 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-foreground">
            Tra cứu & Đóng <span className="text-primary">các khoản thu</span> trực tuyến
          </h2>
          <p className="text-muted-foreground mt-3 text-base md:text-lg">
            Hệ thống giúp học sinh và phụ huynh tra cứu BHTT, BHYT, Sổ liên lạc điện tử và các khoản thu khác; quét mã QR để chuyển khoản nhanh chóng
          </p>
        </div>

        {/* Quick Lookup */}
        <div className="max-w-lg mx-auto mt-10">
          <form action="/tra-cuu" method="GET" className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              name="q"
              type="text"
              placeholder="Nhập mã HS, họ tên, CCCD hoặc số điện thoại..."
              className="w-full pl-12 pr-28 py-4 rounded-2xl border border-border bg-white shadow-sm text-base focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors">
              Tra cứu
            </button>
          </form>
        </div>
      </section>

      {/* Steps */}
      <section className="max-w-[1200px] mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Search, title: 'Tra cứu', desc: 'Nhập mã HS, họ tên, CCCD hoặc số điện thoại để xem các khoản cần đóng', step: '1' },
            { icon: QrCode, title: 'Quét QR', desc: 'Sử dụng mã QR của ngân hàng được cấu hình để chuyển khoản nhanh và chính xác', step: '2' },
            { icon: Upload, title: 'Xác nhận', desc: 'Chụp ảnh biên lai chuyển khoản và tải lên hệ thống để xác nhận', step: '3' },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Bước {item.step}</span>
              </div>
              <h3 className="font-display font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white/50">
        <div className="max-w-[1200px] mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>Trung tâm GDNN-GDTX Khu vực Tân Ninh &copy; 2026</p>
        </div>
      </footer>
    </div>
  );
}
