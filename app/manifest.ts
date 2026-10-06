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
      { src: '/logo-trung-tam-tan-ninh.webp', sizes: 'any', type: 'image/webp', purpose: 'any' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
  };
}
