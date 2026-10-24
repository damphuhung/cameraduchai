'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PODetailPage({ params }: { params: { id: string } }) {
  const [po, setPo] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/purchase-orders/${params.id}`)
      .then(async (r) => {
        if (!r.ok) {
          setErr('Không tìm thấy phiếu nhập');
          return;
        }
        setPo(await r.json());
      });
  }, [params.id]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!po) return <p>Đang tải...</p>;

  const owe = Number(po.total) - Number(po.paid);

  return (
    <div className="space-y-4 max-w-4xl">
      <Link href="/purchase-orders" className="text-sm text-slate-500 hover:underline">← Danh sách phiếu nhập</Link>
      
      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold font-mono">{po.code}</h2>
            <p className="text-slate-600 mt-1">
              {new Date(po.createdAt).toLocaleString('vi-VN')} · NCC: <b>{po.supplier.name}</b>
            </p>
            {po.note && <p className="text-sm text-slate-500 mt-1">Ghi chú: {po.note}</p>}
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Tổng tiền</p>
            <p className="text-xl font-bold">{Number(po.total).toLocaleString()}đ</p>
          </div>
        </div>

        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">Sản phẩm</th>
                <th className="px-3 py-2 text-right">SL</th>
                <th className="px-3 py-2 text-right">Đơn giá</th>
                <th className="px-3 py-2 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {po.items.map((it: any) => (
                <tr key={it.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2">
                    <p className="font-medium">{it.product.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{it.product.sku}</p>
                    {it.serials && it.serials.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.serials.map((s: any) => (
                          <Badge key={s.id} variant="secondary" className="text-xs font-mono">{s.serialNumber}</Badge>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{it.quantity}</td>
                  <td className="px-3 py-2 text-right">{Number(it.unitCost).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{(Number(it.unitCost) * it.quantity).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-1">
          <p className="text-sm">Đã trả: <b>{Number(po.paid).toLocaleString()}đ</b></p>
          {owe > 0 ? (
            <p className="text-sm text-red-600 font-semibold">Còn nợ: {owe.toLocaleString()}đ</p>
          ) : (
            <Badge variant="default" className="bg-green-600">Đã thanh toán đủ</Badge>
          )}
        </div>
      </Card>

      {/* 1. LỊCH SỬ THANH TOÁN */}
      {po.payments && po.payments.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Lịch sử thanh toán</h3>
          <div className="border rounded-md divide-y">
            {po.payments.map((p: any) => (
              <div key={p.id} className="p-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-medium text-green-600">+{Number(p.amount).toLocaleString()}đ</p>
                  <p className="text-xs text-slate-500">{p.note}</p>
                </div>
                <p className="text-xs text-slate-500">{new Date(p.createdAt).toLocaleString('vi-VN')}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 2. ẢNH CHỨNG MINH THANH TOÁN */}
      {po.proofImages && (po.proofImages as string[]).length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Ảnh chứng minh thanh toán</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(po.proofImages as string[]).map((url, i) => (
              <a 
                key={i} 
                href={url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="block border rounded-lg overflow-hidden aspect-square hover:shadow-md transition"
                title="Bấm để xem ảnh gốc"
              >
                <img src={url} alt={`Bill ${i+1}`} className="w-full h-full object-cover hover:scale-105 transition duration-300" />
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}