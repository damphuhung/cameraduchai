'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PODetailPage({ params }: { params: { id: string } }) {
  const [po, setPo] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { fetch(`/api/purchase-orders/${params.id}`).then(async (r) => { if (!r.ok) { setErr('Không tìm thấy'); return; } setPo(await r.json()); }); }, [params.id]);
  if (err) return <p className="text-red-600">{err}</p>;
  if (!po) return <p>Đang tải...</p>;
  return (
    <div className="space-y-4 max-w-3xl">
      <Link href="/purchase-orders" className="text-sm text-slate-500 hover:underline">← DS</Link>
      <Card className="p-6 space-y-4">
        <div><h2 className="text-2xl font-bold font-mono">{po.code}</h2><p className="text-slate-600 mt-1">{new Date(po.createdAt).toLocaleString('vi-VN')} · NCC: <b>{po.supplier.name}</b></p></div>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b"><tr className="text-left"><th className="px-3 py-2">SP</th><th className="px-3 py-2 text-right">SL</th><th className="px-3 py-2 text-right">Giá</th><th className="px-3 py-2 text-right">T.Tiền</th></tr></thead>
            <tbody>
              {po.items.map((it: any) => (
                <tr key={it.id} className="border-b"><td className="px-3 py-2"><p className="font-medium">{it.product.name}</p><p className="text-xs text-slate-500 font-mono">{it.product.sku}</p><div className="flex flex-wrap gap-1 mt-1">{it.serials.map((s: any) => <Badge key={s.id} variant="secondary" className="text-xs font-mono">{s.serialNumber}</Badge>)}</div></td><td className="px-3 py-2 text-right">{it.quantity}</td><td className="px-3 py-2 text-right">{Number(it.unitCost).toLocaleString()}</td><td className="px-3 py-2 text-right">{(Number(it.unitCost) * it.quantity).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-end gap-1"><p className="text-lg">Tổng: <b>{Number(po.total).toLocaleString()}đ</b></p><p className="text-sm">Đã trả: {Number(po.paid).toLocaleString()}đ</p></div>
      </Card>
    </div>
  );
}
