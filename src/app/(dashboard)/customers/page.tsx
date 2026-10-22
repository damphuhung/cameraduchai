'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export default function CustomersPage() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', address: '' });

  async function load() {
    setList(await fetch(`/api/customers?search=${encodeURIComponent(search)}`).then((r) => r.json()));
  }
  useEffect(() => { load(); }, [search]);

  async function save() {
    const res = await fetch('/api/customers', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (!res.ok) { alert((await res.json()).error); return; }
    setOpen(false); setForm({ name: '', phone: '', address: '' }); load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Khách hàng</h2>
        <div className="flex gap-2">
          <Input placeholder="Tìm tên / SĐT..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
          <Button onClick={() => setOpen(true)}>+ Thêm KH</Button>
        </div>
      </div>
      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2">SĐT</th>
                <th className="px-3 py-2">Địa chỉ</th>
                <th className="px-3 py-2">Loại</th>
                <th className="px-3 py-2 text-right">Công nợ</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2">{c.phone}</td>
                  <td className="px-3 py-2 text-slate-600">{c.address ?? '—'}</td>
                  <td className="px-3 py-2">
                    <Badge variant={c.type === 'WHOLESALE' ? 'default' : 'secondary'}>
                      {c.type === 'WHOLESALE' ? 'Buôn' : 'Lẻ'}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-right">{Number(c.debt).toLocaleString()}đ</td>
                </tr>
              ))}
              {list.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">Chưa có khách hàng</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {list.map((c) => (
            <div key={c.id} className="p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-slate-500">{c.phone}</p>
              {Number(c.debt) > 0 && <p className="text-sm text-red-600 mt-1">Nợ: {Number(c.debt).toLocaleString()}đ</p>}
            </div>
          ))}
        </div>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm khách hàng</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>SĐT *</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>Địa chỉ</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <Button onClick={save} className="w-full" disabled={!form.name.trim() || !form.phone.trim()}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
