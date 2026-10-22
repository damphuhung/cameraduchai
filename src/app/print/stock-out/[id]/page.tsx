'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { numberToWords } from '@/lib/number-to-words';

export default function PrintStockOutPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [sale, setSale] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/sales/${params.id}`).then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([s, cfg]) => {
      setSale(s);
      setSettings(cfg);
      setTimeout(() => window.print(), 600);
    });
  }, [params.id]);

  if (!sale || !settings) return <p style={{ padding: 20 }}>Đang tải...</p>;

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', fontFamily: 'Arial, sans-serif', color: '#000', fontSize: 13 }}>
      <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>In</button>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>Đóng</button>
      </div>

      {/* Header theo mẫu 02-VT */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12 }}><b>{settings.shopName}</b></p>
          {settings.address && <p style={{ margin: 0, fontSize: 11 }}>{settings.address}</p>}
        </div>
        <div style={{ textAlign: 'right', fontSize: 11 }}>
          <p style={{ margin: 0 }}><b>Mẫu số 02 - VT</b></p>
          <p style={{ margin: 0 }}>Ban hành theo TT 200/2014/TT-BTC</p>
          <p style={{ margin: 0 }}>Ngày 22/12/2014 của BTC</p>
        </div>
      </div>

      <h1 style={{ textAlign: 'center', fontSize: 20, margin: '12px 0 4px', fontWeight: 'bold' }}>PHIẾU XUẤT KHO</h1>
      <p style={{ textAlign: 'center', margin: 0, fontSize: 13 }}>
        Ngày {new Date(sale.createdAt).getDate()} tháng {new Date(sale.createdAt).getMonth() + 1} năm {new Date(sale.createdAt).getFullYear()}
      </p>
      <p style={{ textAlign: 'center', margin: '2px 0', fontSize: 13 }}>
        Số phiếu: <b>{sale.code}</b>
      </p>

      <div style={{ marginTop: 12, fontSize: 13 }}>
        <p style={{ margin: 2 }}>- Họ và tên người nhận hàng: <b>{sale.customer?.name ?? 'Khách lẻ'}</b></p>
        {sale.customer?.address && <p style={{ margin: 2 }}>- Địa chỉ: {sale.customer.address}</p>}
        <p style={{ margin: 2 }}>- Lý do xuất kho: Bán hàng cho khách</p>
        <p style={{ margin: 2 }}>- Xuất tại kho: Kho chính</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 12 }}>
        <thead>
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>STT</th>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>Tên, nhãn hiệu, quy cách, phẩm chất</th>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>Mã số</th>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>ĐVT</th>
            <th colSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>Số lượng</th>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>Đơn giá</th>
            <th rowSpan={2} style={{ padding: '6px 4px', border: '1px solid #000' }}>Thành tiền</th>
          </tr>
          <tr style={{ borderBottom: '1px solid #000' }}>
            <th style={{ padding: '4px', border: '1px solid #000' }}>Yêu cầu</th>
            <th style={{ padding: '4px', border: '1px solid #000' }}>Thực xuất</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it: any, idx: number) => (
            <tr key={it.id}>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center' }}>{idx + 1}</td>
              <td style={{ padding: '4px', border: '1px solid #000' }}>
                <div>{it.product.name}</div>
                {it.serials.length > 0 && <div style={{ fontSize: 10, color: '#555' }}>S/N: {it.serials.map((s: any) => s.serialNumber).join(', ')}</div>}
              </td>
              <td style={{ padding: '4px', border: '1px solid #000', fontFamily: 'monospace', fontSize: 11 }}>{it.product.sku}</td>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'center' }}>{it.product.unit}</td>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{it.quantity}</td>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{it.quantity}</td>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{Number(it.unitPrice).toLocaleString()}</td>
              <td style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>{Number(it.lineTotal).toLocaleString()}</td>
            </tr>
          ))}
          <tr style={{ fontWeight: 'bold' }}>
            <td colSpan={7} style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>Tổng cộng:</td>
            <td style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>{Number(sale.total).toLocaleString()}</td>
          </tr>
        </tbody>
      </table>

      <p style={{ marginTop: 10, fontSize: 12 }}>
        - Tổng số tiền (viết bằng chữ): <b>{numberToWords(Number(sale.total))}</b>
      </p>
      <p style={{ fontSize: 12 }}>
        - Số chứng từ gốc kèm theo: Hoá đơn bán hàng {sale.code}
      </p>

      <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontSize: 11, textAlign: 'center' }}>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Người lập phiếu</p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>(Ký, họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Người nhận hàng</p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>(Ký, họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Thủ kho</p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>(Ký, họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>Kế toán trưởng</p>
          <p style={{ margin: 0, fontStyle: 'italic' }}>(Ký, họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>
    </div>
  );
}
