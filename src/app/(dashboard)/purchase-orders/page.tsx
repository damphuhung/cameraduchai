'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SlidersHorizontal, X } from 'lucide-react';

export default function PurchaseOrdersPage() {
  const [list, setList] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (supplierId) params.set('supplierId', supplierId);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    setList(await fetch('/api/purchase-orders?' + params.toString()).then((r) => r.json()));
  }
  useEffect(() => { load(); }, [search, from, to, supplierId, paymentStatus]);
  useEffect(() => { fetch('/api/suppliers').then((r) => r.json()).then(setSuppliers); }, []);

  function clearFilters() { setFrom(''); setTo(''); setSupplierId(''); setPaymentStatus(''); }
  const hasFilter = from || to || supplierId || paymentStatus;

  // HÀM XỬ LÝ THANH TOÁN ĐỦ
  async function markAsPaid(id: number) {
    if (!confirm('Xác nhận đã thanh toán đủ tiền cho NCC?')) return;
    const r = await fetch(`/api/purchase-orders/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAsPaid: true }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    load(); // Tải lại danh sách
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Phiếu nhập ({list.length})</h2>
        <div className="flex gap-2">
          <Input placeholder="Mã phiếu / NCC..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-52" />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Lọc {hasFilter ? '(bật)' : ''}
          </Button>
          <Link href="/purchase-orders/new"><Button>+ Nhập</Button></Link>
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><Label className="text-xs">Từ ngày</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Đến ngày</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div>
              <Label className="text-xs">NCC</Label>
              <Select value={supplierId || ""} onValueChange={setSupplierId}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Trạng thái</Label>
              <Select value={paymentStatus || ""} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Đã thanh toán</SelectItem>
                  <SelectItem value="partial">Một phần</SelectItem>
                  <SelectItem value="unpaid">Chưa TT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilter && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Xoá lọc</Button>}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">Mã phiếu</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">NCC</th>
                <th className="px-3 py-2 text-right">SP</th>
                <th className="px-3 py-2 text-right">Tổng</th>
                <th className="px-3 py-2 text-right">Còn nợ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((po) => {
                const owe = Number(po.total) - Number(po.paid);
                return (
                  <tr key={po.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2"><Link href={`/purchase-orders/${po.id}`} className="font-mono text-xs text-blue-600 hover:underline">{po.code}</Link></td>
                    <td className="px-3 py-2">{new Date(po.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2">{po.supplier.name}</td>
                    <td className="px-3 py-2 text-right">{po.items.reduce((s: number, i: any) => s + i.quantity, 0)}</td>
                    <td className="px-3 py-2 text-right">{Number(po.total).toLocaleString()}đ</td>
                    <td className="px-3 py-2 text-right">
                      {/* HIỂN THỊ NÚT THU ĐỦ NẾU CÒN NỢ */}
                      {owe > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <Badge variant="destructive">{owe.toLocaleString()}đ</Badge>
                          <Button size="sm" variant="outline" onClick={() => markAsPaid(po.id)}>Thanh toán đủ</Button>
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs">Đủ</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500">Không có phiếu</td></tr>}
            </tbody>
          </table>
        </div>
        
        {/* Giao diện Mobile */}
        <div className="lg:hidden divide-y">
          {list.map((po) => {
            const owe = Number(po.total) - Number(po.paid);
            return (
              <div key={po.id} className="p-3 space-y-1">
                <div className="flex justify-between">
                  <Link href={`/purchase-orders/${po.id}`} className="font-mono text-xs text-blue-600">{po.code}</Link>
                  <span className="text-xs text-slate-500">{new Date(po.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="font-medium mt-1">{po.supplier.name}</p>
                <div className="flex justify-between items-center">
                  <p className="text-sm">{Number(po.total).toLocaleString()}đ</p>
                  {owe > 0 ? (
                    <Button size="sm" variant="outline" onClick={() => markAsPaid(po.id)}>Thanh toán đủ</Button>
                  ) : (
                    <span className="text-green-600 text-xs">Đã thanh toán đủ</span>
                  )}
                </div>
              </div>
            );
          })}
          {list.length === 0 && <p className="p-6 text-center text-slate-500">Không có phiếu</p>}
        </div>
      </Card>
    </div>
  );
}