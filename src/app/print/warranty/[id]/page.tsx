'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PrintWarrantyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [w, setW] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/warranties/${params.id}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([warranty, cfg]) => {
      setW(warranty); setSettings(cfg);
      setTimeout(() => window.print(), 600);
    });
  }, [params.id]);

  if (!w || !settings) return <p style={{ padding: 20 }}>Đang tải...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 13 }}>
      <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>In</button>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>Đóng</button>
      </div>

      <div style={{ border: '2px solid #000', padding: 20, borderRadius: 4 }}>
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{settings.shopName}</h2>
          {settings.address && <p style={{ margin: '2px 0', fontSize: 11 }}>{settings.address}</p>}
          {settings.phone && <p style={{ margin: 0, fontSize: 11 }}>ĐT: {settings.phone}</p>}
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 22, margin: '16px 0', letterSpacing: 2 }}>THẺ BẢO HÀNH</h1>
        <p style={{ textAlign: 'center', fontSize: 12, margin: '4px 0 16px', color: '#666' }}>Số: BH-{String(w.id).padStart(6, '0')}</p>

        <table style={{ width: '100%', fontSize: 13 }}>
          <tbody>
            <tr><td style={{ padding: '4px 0', width: 140 }}>Khách hàng:</td><td><b>{w.customer?.name ?? 'Khách lẻ'}</b></td></tr>
            {w.customer?.phone && <tr><td style={{ padding: '4px 0' }}>Số điện thoại:</td><td>{w.customer.phone}</td></tr>}
            <tr><td style={{ padding: '4px 0' }}>Sản phẩm:</td><td><b>{w.product.name}</b></td></tr>
            <tr><td style={{ padding: '4px 0' }}>Mã SKU:</td><td style={{ fontFamily: 'monospace' }}>{w.product.sku}</td></tr>
            <tr><td style={{ padding: '4px 0' }}>Số serial (S/N):</td><td style={{ fontFamily: 'monospace', fontWeight: 'bold', fontSize: 15 }}>{w.serial.serialNumber}</td></tr>
            <tr><td style={{ padding: '4px 0' }}>Ngày mua:</td><td>{new Date(w.startDate).toLocaleDateString('vi-VN')}</td></tr>
            <tr><td style={{ padding: '4px 0' }}>Thời hạn BH:</td><td>{w.warrantyMonths} tháng</td></tr>
            <tr><td style={{ padding: '4px 0' }}>Hết hạn:</td><td style={{ fontWeight: 'bold' }}>{new Date(w.endDate).toLocaleDateString('vi-VN')}</td></tr>
            {w.sale && <tr><td style={{ padding: '4px 0' }}>Hoá đơn:</td><td style={{ fontFamily: 'monospace' }}>{w.sale.code}</td></tr>}
          </tbody>
        </table>

        <div style={{ marginTop: 16, borderTop: '1px dashed #999', paddingTop: 10, fontSize: 11 }}>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Điều kiện bảo hành:</p>
          <p style={{ margin: 2 }}>- Sản phẩm còn trong thời hạn bảo hành.</p>
          <p style={{ margin: 2 }}>- Không có dấu hiệu rơi vỡ, vào nước, cháy nổ, hoặc tháo tem niêm phong.</p>
          <p style={{ margin: 2 }}>- Xuất trình thẻ bảo hành khi có yêu cầu.</p>
        </div>

        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 12, textAlign: 'center' }}>
          <div style={{ width: '50%' }}>
            <p style={{ margin: 0 }}>Khách hàng</p>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>(Ký, ghi rõ họ tên)</p>
            <div style={{ height: 60 }} />
          </div>
          <div style={{ width: '50%' }}>
            <p style={{ margin: 0 }}>Người bán hàng</p>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#666' }}>(Ký, ghi rõ họ tên)</p>
            <div style={{ height: 60 }} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A5; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
