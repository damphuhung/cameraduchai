'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle2, CircleDollarSign } from 'lucide-react';

const PM: Record<string, string> = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', DEBT: 'Ghi nợ' };

export default function SaleDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [sale, setSale] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [payDialog, setPayDialog] = useState(false);
  const [extraAmount, setExtraAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch(`/api/sales/${params.id}`);
    if (!r.ok) { setErr('Không tìm thấy'); return; }
    setSale(await r.json());
  }
  useEffect(() => { load(); }, [params.id]);

  if (err) return <p className="text-red-600">{err}</p>;
  if (!sale) return <p>Đang tải...</p>;

  const owe = Number(sale.total) - Number(sale.paid);

  async function markPaid() {
    if (!confirm('Xác nhận đã thu đủ tiền?')) return;
    setBusy(true);
    const r = await fetch(`/api/sales/${sale.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAsPaid: true }),
    });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  async function recordPayment() {
    if (extraAmount <= 0) { alert('Nhập số tiền'); return; }
    setBusy(true);
    const r = await fetch(`/api/sales/${sale.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ additionalPaid: extraAmount }),
    });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    setPayDialog(false); setExtraAmount(0); load();
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <Link href="/sales" className="text-sm text-slate-500 hover:underline">← Đơn hàng</Link>
        <div className="flex gap-2">
          {owe > 0 && (
            <>
              <Button variant="outline" onClick={() => { setExtraAmount(owe); setPayDialog(true); }}>
                <CircleDollarSign className="h-4 w-4 mr-1" /> Ghi nhận thanh toán
              </Button>
              <Button onClick={markPaid} disabled={busy}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Thu đủ
              </Button>
            </>
          )}
          <Link href={`/print/sales/${sale.id}`} target="_blank">
            <Button variant="outline">In hoá đơn</Button>
          </Link>
          <Link href={`/print/stock-out/${sale.id}`} target="_blank">
            <Button variant="outline">In phiếu xuất kho</Button>
          </Link>
        </div>
      </div>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-2xl font-bold font-mono">{sale.code}</h2>
          <p className="text-slate-600 mt-1">{new Date(sale.createdAt).toLocaleString('vi-VN')}</p>
          <p className="text-slate-600">Khách: <b>{sale.customer?.name ?? 'Khách lẻ'}</b></p>
          <p className="text-slate-600">Thu ngân: {sale.user.name}</p>
        </div>
        <div className="border rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">SP</th>
                <th className="px-3 py-2 text-right">SL</th>
                <th className="px-3 py-2 text-right">Đơn giá</th>
                <th className="px-3 py-2 text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((it: any) => (
                <tr key={it.id} className="border-b">
                  <td className="px-3 py-2">
                    <p className="font-medium">{it.product.name}</p>
                    <p className="text-xs text-slate-500 font-mono">{it.product.sku}</p>
                    {it.serials.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {it.serials.map((s: any) => <Badge key={s.id} variant="secondary" className="text-xs font-mono">{s.serialNumber}</Badge>)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{it.quantity}</td>
                  <td className="px-3 py-2 text-right">{Number(it.unitPrice).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(it.lineTotal).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-end gap-1">
          <p className="text-sm">Tạm tính: {Number(sale.subtotal).toLocaleString()}đ</p>
          {Number(sale.discount) > 0 && <p className="text-sm text-orange-600">Giảm giá: -{Number(sale.discount).toLocaleString()}đ</p>}
          <p className="text-xl font-bold">Tổng: {Number(sale.total).toLocaleString()}đ</p>
          <p className="text-sm">Phương thức: <Badge variant="outline">{PM[sale.paymentMethod]}</Badge></p>
          <p className="text-sm">Đã trả: {Number(sale.paid).toLocaleString()}đ</p>
          {owe > 0 ? (
            <p className="text-sm text-red-600 font-semibold">Còn nợ: {owe.toLocaleString()}đ</p>
          ) : (
            <Badge>Đã thanh toán đủ</Badge>
          )}
        </div>
      </Card>

      <Dialog open={payDialog} onOpenChange={setPayDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Ghi nhận thanh toán</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Còn nợ: <b>{owe.toLocaleString()}đ</b></p>
          <div>
            <Label>Số tiền khách trả thêm</Label>
            <Input
              type="number"
              min={0}
              max={owe}
              value={extraAmount}
              onChange={(e) => setExtraAmount(Math.max(0, Math.min(owe, Number(e.target.value) || 0)))}
            />
          </div>
          <Button onClick={recordPayment} disabled={busy} className="w-full">
            {busy ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
