import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Thu không tiền mặt | Trung tâm GDNN-GDTX Khu vực Tân Ninh',
    short_name: 'Thu BHTT/BHYT',
    description: 'Tra cứu khoản thu, quét QR và theo dõi thanh toán của học sinh.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f0fdf4',
    theme_color: '#0f5d3d',
    lang: 'vi',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
}
