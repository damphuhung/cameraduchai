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

const PM: Record<string, string> = { CASH: 'Tiền mặt', TRANSFER: 'Chuyển khoản', CARD: 'Thẻ', DEBT: 'Ghi nợ' };

function getPaymentStatus(s: any) {
  const paid = Number(s.paid);
  const total = Number(s.total);
  if (paid >= total) return { label: 'Đã thanh toán', variant: 'default' as const };
  if (paid > 0) return { label: 'Một phần', variant: 'secondary' as const };
  return { label: 'Chưa TT', variant: 'destructive' as const };
}

export default function SalesPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const toISO = (d: Date) => d.toISOString().slice(0, 10);

  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (paymentMethod) params.set('paymentMethod', paymentMethod);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (userId) params.set('userId', userId);
    setList(await fetch('/api/sales?' + params.toString()).then((r) => r.json()));
    setLoading(false);
  }
  useEffect(() => { load(); }, [search, from, to, paymentMethod, paymentStatus, userId]);

  async function markAsPaid(id: number) {
    if (!confirm('Xác nhận đã thu đủ tiền?')) return;
    const r = await fetch(`/api/sales/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAsPaid: true }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  function clearFilters() {
    setFrom(''); setTo(''); setPaymentMethod(''); setPaymentStatus(''); setUserId('');
  }

  function quickRange(kind: 'today' | 'week' | 'month' | 'last30') {
    const t = new Date();
    if (kind === 'today') { setFrom(toISO(t)); setTo(toISO(t)); }
    else if (kind === 'week') {
      const start = new Date(t); start.setDate(t.getDate() - 6);
      setFrom(toISO(start)); setTo(toISO(t));
    } else if (kind === 'month') {
      setFrom(toISO(new Date(t.getFullYear(), t.getMonth(), 1))); setTo(toISO(t));
    } else {
      const start = new Date(t); start.setDate(t.getDate() - 29);
      setFrom(toISO(start)); setTo(toISO(t));
    }
  }

  const hasFilter = from || to || paymentMethod || paymentStatus || userId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Đơn hàng ({list.length})</h2>
        <div className="flex gap-2">
          <Input placeholder="Mã đơn / tên / SĐT khách..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Lọc {hasFilter ? '(bật)' : ''}
          </Button>
          <Link href="/sales/new"><Button>+ Bán</Button></Link>
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => quickRange('today')}>Hôm nay</Button>
            <Button size="sm" variant="outline" onClick={() => quickRange('week')}>7 ngày</Button>
            <Button size="sm" variant="outline" onClick={() => quickRange('month')}>Tháng này</Button>
            <Button size="sm" variant="outline" onClick={() => quickRange('last30')}>30 ngày</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div><Label className="text-xs">Từ ngày</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Đến ngày</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
            <div>
              <Label className="text-xs">Thanh toán</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Tiền mặt</SelectItem>
                  <SelectItem value="TRANSFER">Chuyển khoản</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Trạng thái</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Đã thanh toán</SelectItem>
                  <SelectItem value="partial">Một phần</SelectItem>
                  <SelectItem value="unpaid">Chưa TT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Xoá lọc</Button>
          )}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">Mã đơn</th>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2">Khách</th>
                <th className="px-3 py-2 text-right">Tổng</th>
                <th className="px-3 py-2">PT</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const owe = Number(s.total) - Number(s.paid);
                const st = getPaymentStatus(s);
                return (
                  <tr key={s.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2"><Link href={`/sales/${s.id}`} className="font-mono text-xs text-blue-600 hover:underline">{s.code}</Link></td>
                    <td className="px-3 py-2">{new Date(s.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-3 py-2">{s.customer?.name ?? <span className="text-slate-400">Khách lẻ</span>}</td>
                    <td className="px-3 py-2 text-right font-medium">{Number(s.total).toLocaleString()}đ</td>
                    <td className="px-3 py-2"><Badge variant="outline">{PM[s.paymentMethod]}</Badge></td>
                    <td className="px-3 py-2"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {owe > 0 && <Button size="sm" variant="outline" onClick={() => markAsPaid(s.id)}>Thu đủ</Button>}
                    </td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Không có đơn</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {list.map((s) => {
            const owe = Number(s.total) - Number(s.paid);
            const st = getPaymentStatus(s);
            return (
              <div key={s.id} className="p-3 space-y-1">
                <div className="flex justify-between">
                  <Link href={`/sales/${s.id}`} className="font-mono text-xs text-blue-600">{s.code}</Link>
                  <span className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>
                <p className="font-medium">{s.customer?.name ?? 'Khách lẻ'}</p>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm">{Number(s.total).toLocaleString()}đ</p>
                    <Badge variant={st.variant} className="text-xs mt-1">{st.label}</Badge>
                  </div>
                  {owe > 0 && <Button size="sm" variant="outline" onClick={() => markAsPaid(s.id)}>Thu đủ</Button>}
                </div>
              </div>
            );
          })}
          {!loading && list.length === 0 && <p className="p-6 text-center text-slate-500">Không có đơn</p>}
        </div>
      </Card>
    </div>
  );
}
