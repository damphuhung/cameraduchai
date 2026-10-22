'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

function calcStatus(endDate: string) {
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `Hết hạn ${-days} ngày`, variant: 'destructive' as const };
  if (days <= 30) return { label: `Còn ${days} ngày`, variant: 'secondary' as const };
  return { label: `Còn ${days} ngày`, variant: 'default' as const };
}

const CLAIM_STATUS: Record<string, { label: string; variant: any }> = {
  PENDING: { label: 'Đang xử lý', variant: 'secondary' },
  DONE: { label: 'Đã xong', variant: 'default' },
  REJECTED: { label: 'Từ chối', variant: 'destructive' },
};

export default function WarrantyDetailPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimForm, setClaimForm] = useState({ description: '', resolution: '', cost: 0, status: 'PENDING' });

  async function load() {
    setData(await fetch(`/api/warranties/${params.id}`).then((r) => r.json()));
  }
  useEffect(() => { load(); }, [params.id]);

  async function saveClaim() {
    const r = await fetch(`/api/warranties/${params.id}/claims`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(claimForm),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    setClaimOpen(false);
    setClaimForm({ description: '', resolution: '', cost: 0, status: 'PENDING' });
    load();
  }

  async function updateClaim(claim: any, patch: any) {
    const r = await fetch(`/api/warranties/${params.id}/claims`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId: claim.id, ...patch }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  if (!data) return <p>Đang tải...</p>;
  if (data.error) return <p className="text-red-600">{data.error}</p>;
  const st = calcStatus(data.endDate);

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/warranty" className="text-sm text-slate-500 hover:underline">← Bảo hành</Link>

      <Card className="p-6 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-500">Phiếu BH</p>
            <h2 className="text-2xl font-bold font-mono">BH-{String(data.id).padStart(6, '0')}</h2>
            <p className="text-slate-600 mt-1">S/N: <b className="font-mono">{data.serial.serialNumber}</b></p>
          </div>
          <Badge variant={st.variant}>{st.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t pt-3 text-sm">
          <div>
            <p className="text-slate-500 text-xs">Sản phẩm</p>
            <p className="font-medium">{data.product.name}</p>
            <p className="text-xs text-slate-500 font-mono">{data.product.sku}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Thời hạn BH</p>
            <p className="font-medium">{data.warrantyMonths} tháng</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Ngày mua</p>
            <p>{new Date(data.startDate).toLocaleDateString('vi-VN')}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Hết hạn</p>
            <p className="font-medium">{new Date(data.endDate).toLocaleDateString('vi-VN')}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Khách hàng</p>
            <p>{data.customer?.name ?? 'Khách lẻ'}</p>
            {data.customer?.phone && <p className="text-xs text-slate-500">{data.customer.phone}</p>}
          </div>
          <div>
            <p className="text-slate-500 text-xs">Hoá đơn gốc</p>
            {data.sale ? (
              <Link href={`/sales/${data.sale.id}`} className="font-mono text-xs text-blue-600 hover:underline">{data.sale.code}</Link>
            ) : <p>—</p>}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/print/warranty/${data.id}`} target="_blank">
            <Button variant="outline">In thẻ bảo hành</Button>
          </Link>
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold">Lịch sử bảo hành ({data.claims.length})</h3>
          <Button size="sm" onClick={() => setClaimOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Tạo phiếu BH
          </Button>
        </div>

        {data.claims.length === 0 && <p className="text-sm text-slate-500 text-center py-4">Chưa có lần bảo hành nào</p>}

        {data.claims.map((c: any) => {
          const cs = CLAIM_STATUS[c.status] ?? { label: c.status, variant: 'outline' };
          return (
            <div key={c.id} className="border rounded-md p-3 space-y-1">
              <div className="flex justify-between items-start">
                <p className="font-medium text-sm">{c.description}</p>
                <Badge variant={cs.variant} className="text-xs">{cs.label}</Badge>
              </div>
              <p className="text-xs text-slate-500">Ngày tiếp nhận: {new Date(c.issueDate).toLocaleString('vi-VN')}</p>
              {c.resolution && <p className="text-sm"><span className="text-slate-500">Xử lý:</span> {c.resolution}</p>}
              {Number(c.cost) > 0 && <p className="text-sm"><span className="text-slate-500">Chi phí:</span> {Number(c.cost).toLocaleString()}đ</p>}
              {c.status === 'PENDING' && (
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => updateClaim(c, { status: 'DONE' })}>Đánh dấu hoàn thành</Button>
                  <Button size="sm" variant="outline" onClick={() => updateClaim(c, { status: 'REJECTED' })}>Từ chối</Button>
                </div>
              )}
            </div>
          );
        })}
      </Card>

      <Dialog open={claimOpen} onOpenChange={setClaimOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tạo phiếu bảo hành</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Mô tả lỗi *</Label>
              <Textarea rows={3} value={claimForm.description} onChange={(e) => setClaimForm({ ...claimForm, description: e.target.value })} placeholder="VD: Camera không lên nguồn..." />
            </div>
            <div>
              <Label>Hướng xử lý</Label>
              <Textarea rows={2} value={claimForm.resolution} onChange={(e) => setClaimForm({ ...claimForm, resolution: e.target.value })} placeholder="VD: Đã thay board nguồn" />
            </div>
            <div>
              <Label>Chi phí (0 nếu miễn phí)</Label>
              <Input type="number" min={0} value={claimForm.cost} onChange={(e) => setClaimForm({ ...claimForm, cost: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <Label>Trạng thái</Label>
              <Select value={claimForm.status} onValueChange={(v) => setClaimForm({ ...claimForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Đang xử lý</SelectItem>
                  <SelectItem value="DONE">Đã xong</SelectItem>
                  <SelectItem value="REJECTED">Từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={saveClaim} className="w-full" disabled={!claimForm.description.trim()}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
