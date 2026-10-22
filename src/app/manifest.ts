import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ERP Cửa hàng Thiết bị Điện tử',
    short_name: 'ERP',
    description: 'Quản lý bán hàng camera, đầu thu, ổ cứng, đèn NLMT',
    start_url: '/', display: 'standalone', orientation: 'portrait',
    background_color: '#ffffff', theme_color: '#0f172a', lang: 'vi',
  };
}
