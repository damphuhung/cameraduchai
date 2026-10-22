'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import { ScanLine, Search, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

function calcStatus(endDate: string) {
  const end = new Date(endDate);
  const now = new Date();
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: `Hết hạn ${-diffDays} ngày`, variant: 'destructive' as const, icon: ShieldX };
  if (diffDays <= 30) return { label: `Còn ${diffDays} ngày`, variant: 'secondary' as const, icon: ShieldAlert };
  return { label: `Còn ${diffDays} ngày`, variant: 'default' as const, icon: ShieldCheck };
}

export default function WarrantyPage() {
  const [filter, setFilter] = useState<'all' | 'active' | 'expiring' | 'expired'>('active');
  const [search, setSearch] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  // Lookup quick
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const q = `?filter=${filter}&search=${encodeURIComponent(search)}`;
    setList(await fetch('/api/warranties' + q).then((r) => r.json()));
    setLoading(false);
  }
  useEffect(() => { load(); }, [filter, search]);

  async function lookup(code: string) {
    setLookupError(null);
    setLookupResult(null);
    const r = await fetch(`/api/warranties/lookup?code=${encodeURIComponent(code)}`);
    if (!r.ok) { setLookupError((await r.json()).error); return; }
    const data = await r.json();
    if (!data.warranty) {
      setLookupError(`Serial ${data.serialNumber} chưa có phiếu bảo hành (chưa bán hoặc SP không BH)`);
      return;
    }
    setLookupResult(data);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-xl font-semibold">Bảo hành</h2>
      </div>

      {/* Tra cứu nhanh */}
      <Card className="p-4 space-y-3">
        <p className="font-medium text-sm">Tra cứu bảo hành theo S/N</p>
        <div className="flex gap-2">
          <Input
            placeholder="Nhập số serial..."
            value={lookupCode}
            onChange={(e) => setLookupCode(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') lookup(lookupCode.trim()); }}
          />
          <Button onClick={() => lookup(lookupCode.trim())} disabled={!lookupCode.trim()}>
            <Search className="h-4 w-4 mr-1" /> Tra
          </Button>
          <Button variant="outline" onClick={() => setScannerOpen(true)}>
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>

        {lookupError && <div className="text-sm text-red-600 p-2 bg-red-50 rounded">{lookupError}</div>}

        {lookupResult && (() => {
          const st = calcStatus(lookupResult.warranty.endDate);
          const Icon = st.icon;
          return (
            <Card className="p-4 border-2 bg-slate-50">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-slate-500">S/N</p>
                  <p className="text-lg font-bold font-mono">{lookupResult.serialNumber}</p>
                  <p className="font-medium mt-1">{lookupResult.product.name}</p>
                  <p className="text-xs text-slate-500 font-mono">{lookupResult.product.sku}</p>
                </div>
                <Badge variant={st.variant} className="flex items-center gap-1">
                  <Icon className="h-3 w-3" /> {st.label}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3 text-sm border-t pt-3">
                <div>
                  <p className="text-slate-500 text-xs">Ngày mua</p>
                  <p>{new Date(lookupResult.warranty.startDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Hết hạn BH</p>
                  <p className="font-medium">{new Date(lookupResult.warranty.endDate).toLocaleDateString('vi-VN')}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Khách hàng</p>
                  <p>{lookupResult.warranty.customer?.name ?? 'Khách lẻ'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Số phiếu BH</p>
                  <p className="font-mono text-xs">BH-{String(lookupResult.warranty.id).padStart(6, '0')}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Link href={`/warranty/${lookupResult.warranty.id}`} className="flex-1">
                  <Button className="w-full" variant="outline">Chi tiết BH</Button>
                </Link>
                <Link href={`/print/warranty/${lookupResult.warranty.id}`} target="_blank" className="flex-1">
                  <Button className="w-full" variant="outline">In thẻ BH</Button>
                </Link>
              </div>
            </Card>
          );
        })()}
      </Card>

      {/* Filter tabs */}
      <div className="flex border rounded-md overflow-hidden">
        {([
          { key: 'active', label: 'Còn hạn' },
          { key: 'expiring', label: 'Sắp hết (30 ngày)' },
          { key: 'expired', label: 'Hết hạn' },
          { key: 'all', label: 'Tất cả' },
        ] as const).map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium ${filter === t.key ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input placeholder="Tìm theo S/N, SP, tên/SĐT khách..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">S/N</th>
                <th className="px-3 py-2">Sản phẩm</th>
                <th className="px-3 py-2">Khách</th>
                <th className="px-3 py-2">Ngày mua</th>
                <th className="px-3 py-2">Hết hạn</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2">Claim</th>
              </tr>
            </thead>
            <tbody>
              {list.map((w) => {
                const st = calcStatus(w.endDate);
                return (
                  <tr key={w.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <Link href={`/warranty/${w.id}`} className="font-mono text-xs text-blue-600 hover:underline">
                        {w.serial.serialNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{w.product.name}</td>
                    <td className="px-3 py-2">{w.customer?.name ?? <span className="text-slate-400">Khách lẻ</span>}</td>
                    <td className="px-3 py-2">{new Date(w.startDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2">{new Date(w.endDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2"><Badge variant={st.variant}>{st.label}</Badge></td>
                    <td className="px-3 py-2">{w.claims.length > 0 ? <Badge variant="outline">{w.claims.length}</Badge> : '—'}</td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Không có phiếu BH</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {list.map((w) => {
            const st = calcStatus(w.endDate);
            return (
              <Link key={w.id} href={`/warranty/${w.id}`} className="block p-3">
                <div className="flex justify-between">
                  <span className="font-mono text-xs">{w.serial.serialNumber}</span>
                  <Badge variant={st.variant} className="text-xs">{st.label}</Badge>
                </div>
                <p className="font-medium mt-1">{w.product.name}</p>
                <p className="text-xs text-slate-500">{w.customer?.name ?? 'Khách lẻ'} · Hết hạn {new Date(w.endDate).toLocaleDateString('vi-VN')}</p>
              </Link>
            );
          })}
          {!loading && list.length === 0 && <p className="p-6 text-center text-slate-500">Không có phiếu BH</p>}
        </div>
      </Card>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quét S/N</DialogTitle></DialogHeader>
          <BarcodeScanner onScan={(code) => { setLookupCode(code); lookup(code); setScannerOpen(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
