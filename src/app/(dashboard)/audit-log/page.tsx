'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SlidersHorizontal, X } from 'lucide-react';

const ACTION_LABEL: Record<string, { label: string; variant: any }> = {
  CREATE: { label: 'Tạo mới', variant: 'default' },
  UPDATE: { label: 'Cập nhật', variant: 'secondary' },
  DELETE: { label: 'Xoá', variant: 'destructive' },
  IMPORT: { label: 'Import', variant: 'outline' },
  EXPORT: { label: 'Export', variant: 'outline' },
  MARK_PAID: { label: 'Thu tiền', variant: 'default' },
  LOGIN: { label: 'Đăng nhập', variant: 'outline' },
};

const ENTITY_LABEL: Record<string, string> = {
  Product: 'Sản phẩm', Sale: 'Đơn hàng', Setting: 'Cấu hình',
  PurchaseOrder: 'Phiếu nhập', Customer: 'Khách hàng', Supplier: 'Nhà CC',
  ProductSerial: 'Serial', User: 'Nhân viên', Auth: 'Đăng nhập',
};

export default function AuditLogPage() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (action) params.set('action', action);
    if (entity) params.set('entity', entity);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    setList(await fetch('/api/audit-logs?' + params.toString()).then((r) => r.json()));
    setLoading(false);
  }
  useEffect(() => { load(); }, [search, action, entity, from, to]);

  function clearFilters() { setAction(''); setEntity(''); setFrom(''); setTo(''); }
  const hasFilter = action || entity || from || to;

  function entityLink(log: any) {
    if (log.entity === 'Sale') return `/sales/${log.entityId}`;
    if (log.entity === 'PurchaseOrder') return `/purchase-orders/${log.entityId}`;
    if (log.entity === 'Product') return `/products`;
    if (log.entity === 'Customer') return `/customers`;
    if (log.entity === 'Supplier') return `/suppliers`;
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Nhật ký thao tác ({list.length})</h2>
        <div className="flex gap-2">
          <Input placeholder="Tìm trong mô tả / user..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Lọc {hasFilter ? '(bật)' : ''}
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Thao tác</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Đối tượng</Label>
              <Select value={entity} onValueChange={setEntity}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Từ ngày</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
            <div><Label className="text-xs">Đến ngày</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          </div>
          {hasFilter && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Xoá lọc</Button>}
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2 whitespace-nowrap">Thời gian</th>
                <th className="px-3 py-2">Nhân viên</th>
                <th className="px-3 py-2">Thao tác</th>
                <th className="px-3 py-2">Đối tượng</th>
                <th className="px-3 py-2">Mô tả</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((log) => {
                const a = ACTION_LABEL[log.action] ?? { label: log.action, variant: 'outline' };
                const link = entityLink(log);
                return (
                  <tr key={log.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="px-3 py-2">{log.userName}</td>
                    <td className="px-3 py-2"><Badge variant={a.variant}>{a.label}</Badge></td>
                    <td className="px-3 py-2 text-xs">{ENTITY_LABEL[log.entity] ?? log.entity}{log.entityId && <span className="text-slate-400"> #{log.entityId}</span>}</td>
                    <td className="px-3 py-2">{log.description}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {link && <Link href={link} className="text-xs text-blue-600 hover:underline mr-2">Xem</Link>}
                      {log.metadata && <button onClick={() => setDetail(log)} className="text-xs text-slate-500 hover:underline">Chi tiết</button>}
                    </td>
                  </tr>
                );
              })}
              {!loading && list.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500">Chưa có nhật ký</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {list.map((log) => {
            const a = ACTION_LABEL[log.action] ?? { label: log.action, variant: 'outline' };
            return (
              <div key={log.id} className="p-3 space-y-1">
                <div className="flex justify-between">
                  <Badge variant={a.variant} className="text-xs">{a.label}</Badge>
                  <span className="text-xs text-slate-500">{new Date(log.createdAt).toLocaleString('vi-VN')}</span>
                </div>
                <p className="text-sm">{log.description}</p>
                <p className="text-xs text-slate-500">{log.userName} · {ENTITY_LABEL[log.entity] ?? log.entity}</p>
              </div>
            );
          })}
          {!loading && list.length === 0 && <p className="p-6 text-center text-slate-500">Chưa có nhật ký</p>}
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Chi tiết thay đổi</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2">
              <p className="text-sm"><b>{detail.description}</b></p>
              <pre className="text-xs bg-slate-50 p-3 rounded overflow-auto max-h-96">
{JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
