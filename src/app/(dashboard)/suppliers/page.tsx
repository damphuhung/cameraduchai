'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SuppliersPage() {
  const [list, setList] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });
  const load = async () => setList(await fetch('/api/suppliers').then((r) => r.json()));
  useEffect(() => { load(); }, []);
  async function save() {
    const res = await fetch('/api/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setOpen(false); setForm({ name: '', phone: '', address: '' }); load();
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Nhà cung cấp</h2>
        <Button onClick={() => setOpen(true)}>+ Thêm NCC</Button>
      </div>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b"><tr className="text-left"><th className="px-3 py-2">Tên</th><th className="px-3 py-2">SĐT</th><th className="px-3 py-2">Địa chỉ</th><th className="px-3 py-2 text-right">Công nợ</th></tr></thead>
          <tbody>{list.map((s) => (<tr key={s.id} className="border-b hover:bg-slate-50"><td className="px-3 py-2 font-medium">{s.name}</td><td className="px-3 py-2">{s.phone ?? '—'}</td><td className="px-3 py-2 text-slate-600">{s.address ?? '—'}</td><td className="px-3 py-2 text-right">{Number(s.debt).toLocaleString()}đ</td></tr>))}</tbody>
        </table>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm nhà cung cấp</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SĐT</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Địa chỉ</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button onClick={save} className="w-full" disabled={!form.name.trim()}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
