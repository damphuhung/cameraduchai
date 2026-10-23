'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Lock, Unlock, Trash2, KeyRound, Settings2 } from 'lucide-react';

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'STAFF' });
  const [busy, setBusy] = useState(false);

  // Role management
  const [manageRoleOpen, setManageRoleOpen] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });

  useEffect(() => {
    if (status === 'authenticated' && session.user.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  async function load() {
    setLoading(true);
    const [u, r] = await Promise.all([
      fetch('/api/users').then(res => res.json()),
      fetch('/api/roles').then(res => res.json())
    ]);
    setUsers(u); setRoles(r);
    setLoading(false);
  }
  useEffect(() => { if (status === 'authenticated') load(); }, [status]);

  function openNew() {
    setEditing(null);
    setForm({ email: '', name: '', password: '', role: roles.length > 0 ? roles[0].name : 'STAFF' });
    setOpen(true);
  }
  function openEdit(u: any) {
    setEditing(u);
    setForm({ email: u.email, name: u.name, password: '', role: u.role });
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    const isEdit = !!editing;
    const url = isEdit ? `/api/users/${editing.id}` : '/api/users';
    const method = isEdit ? 'PATCH' : 'POST';
    const body: any = { name: form.name, role: form.role };
    if (!isEdit) body.email = form.email;
    if (form.password) body.password = form.password;

    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    setOpen(false); load();
  }

  async function toggleActive(u: any) {
    if (!confirm(`Xác nhận ${u.active ? 'khoá' : 'mở khoá'} tài khoản "${u.name}"?`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: !u.active }) });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  async function del(u: any) {
    if (!confirm(`Xoá vĩnh viễn "${u.name}"?`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  async function addRole() {
    if (!newRole.name.trim()) return;
    const r = await fetch('/api/roles', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newRole) });
    if (!r.ok) { alert((await r.json()).error); return; }
    setNewRole({ name: '', description: '' }); load();
  }

  async function delRole(id: number) {
    if (!confirm('Xoá quyền này?')) return;
    const r = await fetch(`/api/roles?id=${id}`, { method: 'DELETE' });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  if (status === 'loading' || (session && session.user.role !== 'ADMIN')) return <p className="text-slate-500">Đang kiểm tra quyền...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Nhân viên ({users.length})</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageRoleOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Quản lý Quyền
          </Button>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> Thêm NV</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b">
            <tr className="text-left">
              <th className="px-3 py-2">Email</th><th className="px-3 py-2">Tên</th><th className="px-3 py-2">Quyền</th>
              <th className="px-3 py-2">Trạng thái</th><th className="px-3 py-2 text-right">Đơn đã bán</th><th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const isMe = u.id === session?.user?.id;
              return (
                <tr key={u.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{u.email}{isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Bạn</span>}</td>
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2"><Badge variant={u.role === 'ADMIN' ? 'destructive' : 'default'}>{u.role}</Badge></td>
                  <td className="px-3 py-2">{u.active ? <Badge variant="secondary" className="text-green-700 bg-green-100">Hoạt động</Badge> : <Badge variant="destructive">Đã khoá</Badge>}</td>
                  <td className="px-3 py-2 text-right">{u._count.sales}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(u)}><KeyRound className="h-3 w-3 mr-1" /> Sửa</Button>
                    {!isMe && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => toggleActive(u)}>{u.active ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}</Button>
                        {u._count.sales === 0 && <Button size="sm" variant="ghost" onClick={() => del(u)}><Trash2 className="h-3 w-3 text-red-600" /></Button>}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {/* Dialog Edit/Add User */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? `Sửa: ${editing.name}` : 'Thêm nhân viên'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={!!editing} /></div>
            <div><Label>Tên</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>{editing ? 'Mật khẩu mới (để trống = giữ nguyên)' : 'Mật khẩu *'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>Quyền</Label>
              <Select value={form.role || ""} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.name}>{r.name} {r.description ? `- ${r.description}` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} className="w-full" disabled={busy || !form.name.trim() || (!editing && (!form.email.trim() || form.password.length < 6))}>
              {busy ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Quản lý Quyền */}
      <Dialog open={manageRoleOpen} onOpenChange={setManageRoleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quản lý Quyền</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-4">
            <Input placeholder="Tên quyền (VD: KETOAN)" value={newRole.name} onChange={e => setNewRole({ ...newRole, name: e.target.value })} />
            <Input placeholder="Mô tả..." value={newRole.description} onChange={e => setNewRole({ ...newRole, description: e.target.value })} />
            <Button onClick={addRole}>Thêm</Button>
          </div>
          <div className="max-h-60 overflow-y-auto border rounded divide-y">
            {roles.map(r => (
              <div key={r.id} className="flex justify-between items-center p-2">
                <div><p className="font-medium">{r.name}</p><p className="text-xs text-slate-500">{r.description}</p></div>
                {r.name !== 'ADMIN' && r.name !== 'STAFF' && (
                  <Button size="sm" variant="ghost" className="text-red-600 h-7 px-2" onClick={() => delRole(r.id)}>Xoá</Button>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}