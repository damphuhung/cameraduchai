'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const BANKS = [
  { id: 'MB', name: 'MB Bank' },
  { id: 'VCB', name: 'Vietcombank' },
  { id: 'ICB', name: 'VietinBank' },
  { id: 'BIDV', name: 'BIDV' },
  { id: 'VBA', name: 'Agribank' },
  { id: 'TCB', name: 'Techcombank' },
  { id: 'ACB', name: 'ACB' },
  { id: 'STB', name: 'Sacombank' },
  { id: 'VPB', name: 'VPBank' },
  { id: 'TPB', name: 'TPBank' },
  { id: 'VIB', name: 'VIB' },
  { id: 'SHB', name: 'SHB' },
  { id: 'EIB', name: 'Eximbank' },
  { id: 'MSB', name: 'MSB' },
  { id: 'HDB', name: 'HDBank' },
  { id: 'OCB', name: 'OCB' },
  { id: 'LPB', name: 'LPBank' },
  { id: 'SEAB', name: 'SeABank' },
  { id: 'NAB', name: 'Nam A Bank' },
  { id: 'KLB', name: 'KienLongBank' },
  { id: 'BAB', name: 'BacABank' },
  { id: 'ABB', name: 'ABBank' },
  { id: 'SCB', name: 'SCB' },
  { id: 'DOB', name: 'DongA Bank' },
  { id: 'PGB', name: 'PGBank' },
];

export default function SettingsPage() {
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setForm);
  }, []);

  if (!form) return <p className="text-slate-500">Đang tải...</p>;

  async function save() {
    setSaving(true);
    const r = await fetch('/api/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    alert('Đã lưu cấu hình');
  }

  const qrPreview =
    form.bankId && form.bankAccount
      ? `https://img.vietqr.io/image/${form.bankId}-${form.bankAccount}-compact2.png?amount=100000&addInfo=Preview&accountName=${encodeURIComponent(form.bankOwner || '')}`
      : null;

  return (
    <div className="max-w-3xl space-y-4">
      <h2 className="text-xl font-semibold">Cấu hình cửa hàng</h2>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-slate-700">Thông tin doanh nghiệp</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Tên cửa hàng *</Label>
            <Input value={form.shopName ?? ''} onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          </div>
          <div>
            <Label>Số điện thoại</Label>
            <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Địa chỉ</Label>
          <Input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <Label>Mã số thuế</Label>
          <Input value={form.taxCode ?? ''} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} placeholder="Để trống nếu chưa có" />
        </div>
      </Card>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-slate-700">Tài khoản ngân hàng nhận tiền (VietQR)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Ngân hàng</Label>
            <Select value={form.bankId ?? 'MB'} onValueChange={(v) => setForm({ ...form, bankId: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BANKS.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Số tài khoản</Label>
            <Input value={form.bankAccount ?? ''} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} placeholder="VD: 0123456789" />
          </div>
        </div>
        <div>
          <Label>Chủ tài khoản (không dấu)</Label>
          <Input value={form.bankOwner ?? ''} onChange={(e) => setForm({ ...form, bankOwner: e.target.value })} placeholder="VD: NGUYEN VAN A" />
        </div>
        {qrPreview && (
          <div className="border rounded-md p-3 text-center">
            <p className="text-xs text-slate-500 mb-2">Xem trước QR (demo 100.000đ)</p>
            <img src={qrPreview} alt="Preview QR" className="mx-auto w-48" />
          </div>
        )}
      </Card>

      <Button onClick={save} disabled={saving} size="lg">
        {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
      </Button>
    </div>
  );
}
