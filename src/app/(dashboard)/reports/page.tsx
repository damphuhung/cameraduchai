'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }
function pct(n: number) { return n.toFixed(1) + '%'; }

function toISO(d: Date) { return d.toISOString().slice(0, 10); }

export default function ReportsPage() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [from, setFrom] = useState(toISO(firstOfMonth));
  const [to, setTo] = useState(toISO(today));
  const [tab, setTab] = useState<'revenue' | 'profit' | 'stock'>('revenue');

  const [revenue, setRevenue] = useState<any>(null);
  const [profit, setProfit] = useState<any>(null);
  const [stock, setStock] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function loadAll() {
    setLoading(true);
    const q = `?from=${from}&to=${to}`;
    const [r, p, s] = await Promise.all([
      fetch('/api/reports/revenue' + q).then((x) => x.json()),
      fetch('/api/reports/profit' + q).then((x) => x.json()),
      fetch('/api/reports/stock').then((x) => x.json()),
    ]);
    setRevenue(r); setProfit(p); setStock(s);
    setLoading(false);
  }

  useEffect(() => { loadAll(); }, []);

  const maxRevenue = revenue?.byDay?.length ? Math.max(...revenue.byDay.map((d: any) => d.revenue)) : 1;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Báo cáo</h2>

      {/* Filter */}
      <Card className="p-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <Label className="text-xs">Từ ngày</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Đến ngày</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button onClick={loadAll} disabled={loading}>{loading ? 'Đang tải...' : 'Xem'}</Button>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex border rounded-md overflow-hidden">
        {(['revenue', 'profit', 'stock'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2.5 text-sm font-medium ${tab === t ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
          >
            {t === 'revenue' ? 'Doanh thu' : t === 'profit' ? 'Lợi nhuận' : 'Tồn kho'}
          </button>
        ))}
      </div>

      {/* Revenue */}
      {tab === 'revenue' && revenue && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-slate-500">Doanh thu</p><p className="text-lg font-bold">{fmt(revenue.summary.totalRevenue)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Số đơn</p><p className="text-lg font-bold">{revenue.summary.totalOrders}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">TB/đơn</p><p className="text-lg font-bold">{fmt(Math.round(revenue.summary.avgOrderValue))}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Còn nợ</p><p className="text-lg font-bold text-red-600">{fmt(revenue.summary.totalDebt)}</p></Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Doanh thu theo ngày</h3>
            {revenue.byDay.length === 0 && <p className="text-sm text-slate-500">Không có dữ liệu</p>}
            <div className="flex items-end gap-1 h-40 border-b border-l px-2 pb-1 overflow-x-auto">
              {revenue.byDay.map((d: any) => (
                <div key={d.date} className="flex flex-col items-center min-w-[24px] flex-1 group">
                  <div className="relative w-full">
                    <div
                      className="bg-slate-800 hover:bg-slate-600 rounded-t transition-all"
                      style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 140)}px` }}
                      title={`${d.date}: ${fmt(d.revenue)} (${d.orders} đơn)`}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 rotate-45 origin-left">{d.date.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Top SP theo doanh thu</h3>
            {revenue.topProducts.length === 0 && <p className="text-sm text-slate-500">Không có dữ liệu</p>}
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr><th className="py-2">#</th><th>Sản phẩm</th><th className="text-right">SL</th><th className="text-right">Doanh thu</th></tr>
              </thead>
              <tbody>
                {revenue.topProducts.map((p: any, i: number) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5 text-slate-400">{i + 1}</td>
                    <td><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></td>
                    <td className="text-right">{p.quantity}</td>
                    <td className="text-right">{fmt(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Profit */}
      {tab === 'profit' && profit && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-slate-500">Doanh thu</p><p className="text-lg font-bold">{fmt(profit.summary.totalRevenue)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Giá vốn</p><p className="text-lg font-bold">{fmt(profit.summary.totalCost)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Lợi nhuận</p><p className="text-lg font-bold text-green-600">{fmt(profit.summary.totalProfit)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Biên LN</p><p className="text-lg font-bold">{pct(profit.summary.margin)}</p></Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Lợi nhuận theo SP</h3>
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="py-2">SP</th>
                  <th className="text-right">SL</th>
                  <th className="text-right">Doanh thu</th>
                  <th className="text-right">Giá vốn</th>
                  <th className="text-right">Lợi nhuận</th>
                  <th className="text-right">Biên</th>
                </tr>
              </thead>
              <tbody>
                {profit.byProduct.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></td>
                    <td className="text-right">{p.quantity}</td>
                    <td className="text-right">{fmt(p.revenue)}</td>
                    <td className="text-right">{fmt(p.cost)}</td>
                    <td className="text-right text-green-600 font-medium">{fmt(p.profit)}</td>
                    <td className="text-right">{p.revenue > 0 ? pct((p.profit / p.revenue) * 100) : '—'}</td>
                  </tr>
                ))}
                {profit.byProduct.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-slate-500">Không có dữ liệu</td></tr>}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && stock && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-3"><p className="text-xs text-slate-500">Số SP</p><p className="text-lg font-bold">{stock.summary.totalProducts}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Tổng SP tồn</p><p className="text-lg font-bold">{stock.summary.totalStockUnits}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Giá trị tồn</p><p className="text-lg font-bold">{fmt(stock.summary.totalValue)}</p></Card>
            <Card className="p-3"><p className="text-xs text-slate-500">Sắp hết</p><p className="text-lg font-bold text-amber-600">{stock.summary.lowStockCount}</p></Card>
          </div>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Cảnh báo tồn thấp</h3>
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr><th className="py-2">SP</th><th>Danh mục</th><th className="text-right">Tồn</th><th className="text-right">Min</th></tr>
              </thead>
              <tbody>
                {stock.lowStock.map((p: any) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-1.5"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></td>
                    <td>{p.category}</td>
                    <td className="text-right"><Badge variant="destructive">{p.stock}</Badge></td>
                    <td className="text-right">{p.minStock}</td>
                  </tr>
                ))}
                {stock.lowStock.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">Không có SP nào sắp hết</td></tr>}
              </tbody>
            </table>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">Toàn bộ tồn kho</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left sticky top-0 bg-white">
                  <tr><th className="py-2">SP</th><th>Danh mục</th><th className="text-right">Tồn</th><th className="text-right">Giá trị</th></tr>
                </thead>
                <tbody>
                  {stock.all.map((p: any) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-1.5"><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></td>
                      <td className="text-xs">{p.category}</td>
                      <td className={`text-right ${p.stock < p.minStock ? 'text-red-600 font-bold' : ''}`}>{p.stock}</td>
                      <td className="text-right">{fmt(p.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
