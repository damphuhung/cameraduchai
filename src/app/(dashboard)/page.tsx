'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, ShoppingCart, DollarSign, AlertTriangle, ShieldAlert } from 'lucide-react';

function fmt(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

export default function DashboardHome() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { fetch('/api/dashboard').then((r) => r.json()).then(setData); }, []);
  if (!data) return <p className="text-slate-500">Đang tải...</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Tổng quan</h2>
        <Link href="/sales/new"><Button>+ Bán hàng</Button></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm"><DollarSign className="h-4 w-4" /> Doanh thu hôm nay</div>
            <p className="text-2xl font-bold mt-1">{fmt(data.today.revenue)}</p>
            <p className="text-xs text-slate-400 mt-1">
              {data.today.orders} đơn · LN: {fmt(data.today.profit)} 
              {data.today.bonus > 0 && <span className="text-green-600 ml-1">· Tip: {fmt(data.today.bonus)}</span>}
            </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><TrendingUp className="h-4 w-4" /> Doanh thu tháng</div>
          <p className="text-2xl font-bold mt-1">{fmt(data.month.revenue)}</p>
          <p className="text-xs text-slate-400 mt-1">{data.month.orders} đơn · LN: {fmt(data.month.profit)}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><AlertTriangle className="h-4 w-4 text-amber-600" /> Sắp hết hàng</div>
          <p className="text-2xl font-bold mt-1 text-amber-600">{data.lowStockCount}</p>
          <Link href="/reports" className="text-xs text-blue-600 hover:underline">Xem →</Link>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm"><ShieldAlert className="h-4 w-4 text-orange-600" /> BH sắp hết hạn</div>
          <p className="text-2xl font-bold mt-1 text-orange-600">{data.expiringWarrantyCount}</p>
          <Link href="/warranty?filter=expiring" className="text-xs text-blue-600 hover:underline">Xem →</Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Top 5 SP bán chạy (tháng)</h3>
          {data.topProducts.length === 0 && <p className="text-sm text-slate-500">Chưa có dữ liệu</p>}
          <div className="space-y-2">
            {data.topProducts.map((p: any, i: number) => (
              <div key={p.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                <div className="flex items-center gap-2"><span className="text-slate-400 w-4">{i + 1}.</span><span className="font-medium truncate max-w-[250px]">{p.name}</span></div>
                <span className="text-slate-600">{p.quantity} · {fmt(p.revenue)}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-3">Sắp hết hàng</h3>
          {data.lowStock.length === 0 && <p className="text-sm text-slate-500">Không có</p>}
          <div className="space-y-2">
            {data.lowStock.slice(0, 5).map((p: any) => (
              <div key={p.id} className="flex justify-between items-center text-sm border-b pb-1 last:border-0">
                <div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku}</p></div>
                <Badge variant="destructive">{p.stock}/{p.minStock}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {data.expiringWarranties?.length > 0 && (
        <Card className="p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-orange-600" /> Bảo hành sắp hết hạn (30 ngày)</h3>
            <Link href="/warranty?filter=expiring" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
          </div>
          <div className="space-y-1">
            {data.expiringWarranties.map((w: any) => (
              <Link key={w.id} href={`/warranty/${w.id}`} className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm hover:bg-slate-50 px-1 rounded">
                <div>
                  <p className="font-mono text-xs">{w.serialNumber} · {w.productName}</p>
                  <p className="text-xs text-slate-500">{w.customerName}</p>
                </div>
                <span className="text-xs text-orange-600">{new Date(w.endDate).toLocaleDateString('vi-VN')}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Đơn gần đây</h3>
          <Link href="/sales" className="text-xs text-blue-600 hover:underline">Xem tất cả →</Link>
        </div>
        {data.recentSales.length === 0 && <p className="text-sm text-slate-500">Chưa có đơn</p>}
        <div className="space-y-1">
          {data.recentSales.map((s: any) => {
            const owe = s.total - s.paid;
            return (
              <Link key={s.id} href={`/sales/${s.id}`} className="flex justify-between items-center py-2 border-b last:border-0 hover:bg-slate-50 px-1 rounded">
                <div>
                  <p className="text-sm font-mono">{s.code}</p>
                  <p className="text-xs text-slate-500">{s.customerName} · {new Date(s.createdAt).toLocaleString('vi-VN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{fmt(s.total)}</p>
                  {owe > 0 ? <Badge variant="destructive" className="text-xs">Nợ {fmt(owe)}</Badge> : <Badge variant="secondary" className="text-xs">Đã TT</Badge>}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
