'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PM: Record<string, string> = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', DEBT: 'Ghi nợ' };

export default function PrintSalePage({ params }: { params: { id: string } }) {
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
  const owe = Number(sale.total) - Number(sale.paid);

  return (
    <div style={{ padding: 20, maxWidth: 700, margin: '0 auto', fontFamily: 'Arial, sans-serif', color: '#000' }}>
      <div className="no-print" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
        <button onClick={() => window.print()} style={{ padding: '8px 16px', background: '#0f172a', color: '#fff', border: 0, borderRadius: 4, cursor: 'pointer' }}>In</button>
        <button onClick={() => router.back()} style={{ padding: '8px 16px', background: '#fff', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>Đóng</button>
      </div>

      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 20 }}>{settings.shopName}</h2>
        {settings.address && <p style={{ margin: '4px 0', fontSize: 12 }}>{settings.address}</p>}
        {settings.phone && <p style={{ margin: 0, fontSize: 12 }}>ĐT: {settings.phone}</p>}
        {settings.taxCode && <p style={{ margin: 0, fontSize: 12 }}>MST: {settings.taxCode}</p>}
      </div>

      <h1 style={{ textAlign: 'center', fontSize: 22, margin: '16px 0' }}>HOÁ ĐƠN BÁN HÀNG</h1>
      <p style={{ textAlign: 'center', fontSize: 14, marginBottom: 16 }}>Số: <b>{sale.code}</b></p>

      <div style={{ fontSize: 13, marginBottom: 12 }}>
        <p style={{ margin: 2 }}>Khách hàng: <b>{sale.customer?.name ?? 'Khách lẻ'}</b></p>
        {sale.customer?.phone && <p style={{ margin: 2 }}>SĐT: {sale.customer.phone}</p>}
        {sale.customer?.address && <p style={{ margin: 2 }}>Địa chỉ: {sale.customer.address}</p>}
        <p style={{ margin: 2 }}>Ngày: {new Date(sale.createdAt).toLocaleString('vi-VN')}</p>
        <p style={{ margin: 2 }}>Thu ngân: {sale.user.name}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderTop: '1px solid #000', borderBottom: '1px solid #000' }}>
            <th style={{ textAlign: 'left', padding: '6px 4px' }}>STT</th>
            <th style={{ textAlign: 'left', padding: '6px 4px' }}>Sản phẩm</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>SL</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>Đơn giá</th>
            <th style={{ textAlign: 'right', padding: '6px 4px' }}>T.Tiền</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((it: any, idx: number) => (
            <tr key={it.id} style={{ borderBottom: '1px dashed #ccc' }}>
              <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>{idx + 1}</td>
              <td style={{ padding: '6px 4px', verticalAlign: 'top' }}>
                <div>{it.product.name}</div>
                <div style={{ fontSize: 11, color: '#666' }}>SKU: {it.product.sku}</div>
                {it.serials.length > 0 && <div style={{ fontSize: 11, color: '#666' }}>S/N: {it.serials.map((s: any) => s.serialNumber).join(', ')}</div>}
              </td>
              <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>{it.quantity}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>{Number(it.unitPrice).toLocaleString()}</td>
              <td style={{ padding: '6px 4px', textAlign: 'right', verticalAlign: 'top' }}>{Number(it.lineTotal).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 12, fontSize: 13 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}><span style={{ minWidth: 160, textAlign: 'right' }}>Tạm tính:&nbsp;</span><span style={{ minWidth: 100, textAlign: 'right' }}>{Number(sale.subtotal).toLocaleString()}đ</span></div>
        {Number(sale.discount) > 0 && <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}><span style={{ minWidth: 160, textAlign: 'right' }}>Giảm giá:&nbsp;</span><span style={{ minWidth: 100, textAlign: 'right' }}>-{Number(sale.discount).toLocaleString()}đ</span></div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 0', borderTop: '1px solid #000', marginTop: 4, fontSize: 16, fontWeight: 'bold' }}><span style={{ minWidth: 160, textAlign: 'right' }}>TỔNG:&nbsp;</span><span style={{ minWidth: 100, textAlign: 'right' }}>{Number(sale.total).toLocaleString()}đ</span></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}><span style={{ minWidth: 160, textAlign: 'right' }}>Đã trả ({PM[sale.paymentMethod]}):&nbsp;</span><span style={{ minWidth: 100, textAlign: 'right' }}>{Number(sale.paid).toLocaleString()}đ</span></div>
        {owe > 0 && <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0', color: 'red' }}><span style={{ minWidth: 160, textAlign: 'right' }}>Còn nợ:&nbsp;</span><span style={{ minWidth: 100, textAlign: 'right' }}>{owe.toLocaleString()}đ</span></div>}
      </div>

      {sale.paymentMethod === 'TRANSFER' && settings.bankId && settings.bankAccount && (
        <div style={{ marginTop: 20, border: '1px dashed #000', padding: 12, fontSize: 12 }}>
          <p style={{ margin: '2px 0', fontWeight: 'bold' }}>Thông tin chuyển khoản:</p>
          <p style={{ margin: 2 }}>Ngân hàng: <b>{settings.bankId}</b></p>
          <p style={{ margin: 2 }}>Số TK: <b>{settings.bankAccount}</b></p>
          <p style={{ margin: 2 }}>Chủ TK: <b>{settings.bankOwner}</b></p>
          <p style={{ margin: 2 }}>Nội dung: <b>{sale.code}</b></p>
        </div>
      )}

      <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Khách hàng</p>
          <p style={{ margin: 0, fontStyle: 'italic', color: '#999' }}>(Ký, ghi rõ họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Người bán hàng</p>
          <p style={{ margin: 0, fontStyle: 'italic', color: '#999' }}>(Ký, ghi rõ họ tên)</p>
          <div style={{ height: 60 }} />
        </div>
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, marginTop: 24, color: '#666' }}>Cảm ơn quý khách đã mua hàng!</p>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  );
}
