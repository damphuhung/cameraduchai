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
import { Plus, Lock, Unlock, Trash2, KeyRound } from 'lucide-react';

const ROLE_LABEL: Record<string, { label: string; variant: any }> = {
  ADMIN: { label: 'Quản trị', variant: 'destructive' },
  MANAGER: { label: 'Quản lý', variant: 'default' },
  STAFF: { label: 'Nhân viên', variant: 'secondary' },
};

export default function UsersPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'STAFF' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session.user.role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  async function load() {
    setLoading(true);
    const r = await fetch('/api/users');
    if (r.ok) setUsers(await r.json());
    setLoading(false);
  }
  useEffect(() => { if (status === 'authenticated') load(); }, [status]);

  function openNew() {
    setEditing(null);
    setForm({ email: '', name: '', password: '', role: 'STAFF' });
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
    setOpen(false);
    load();
  }

  async function toggleActive(u: any) {
    const action = u.active ? 'khoá' : 'mở khoá';
    if (!confirm(`Xác nhận ${action} tài khoản "${u.name}"?`)) return;
    const r = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  async function del(u: any) {
    if (!confirm(`Xoá vĩnh viễn tài khoản "${u.name}"? Không thể hoàn tác.`)) return;
    const r = await fetch(`/api/users/${u.id}`, { method: 'DELETE' });
    if (!r.ok) { alert((await r.json()).error); return; }
    load();
  }

  if (status === 'loading' || (session && session.user.role !== 'ADMIN')) {
    return <p className="text-slate-500">Đang kiểm tra quyền...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-xl font-semibold">Nhân viên ({users.length})</h2>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-1" /> Thêm nhân viên
        </Button>
      </div>

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Tên</th>
                <th className="px-3 py-2">Quyền</th>
                <th className="px-3 py-2">Trạng thái</th>
                <th className="px-3 py-2 text-right">Đơn đã bán</th>
                <th className="px-3 py-2">Ngày tạo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const role = ROLE_LABEL[u.role];
                const isMe = u.id === session?.user?.id;
                return (
                  <tr key={u.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{u.email}{isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Bạn</span>}</td>
                    <td className="px-3 py-2 font-medium">{u.name}</td>
                    <td className="px-3 py-2"><Badge variant={role.variant}>{role.label}</Badge></td>
                    <td className="px-3 py-2">
                      {u.active ? <Badge variant="secondary" className="text-green-700 bg-green-100">Hoạt động</Badge> : <Badge variant="destructive">Đã khoá</Badge>}
                    </td>
                    <td className="px-3 py-2 text-right">{u._count.sales}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(u.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(u)}>
                        <KeyRound className="h-3 w-3 mr-1" /> Sửa
                      </Button>
                      {!isMe && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => toggleActive(u)} title={u.active ? 'Khoá' : 'Mở khoá'}>
                            {u.active ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                          </Button>
                          {u._count.sales === 0 && (
                            <Button size="sm" variant="ghost" onClick={() => del(u)} title="Xoá">
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </Button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!loading && users.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Chưa có nhân viên</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {users.map((u) => {
            const role = ROLE_LABEL[u.role];
            const isMe = u.id === session?.user?.id;
            return (
              <div key={u.id} className="p-3 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{u.name}{isMe && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">Bạn</span>}</p>
                    <p className="text-xs font-mono text-slate-500">{u.email}</p>
                  </div>
                  <Badge variant={role.variant} className="text-xs">{role.label}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {u.active ? <Badge variant="secondary" className="text-green-700 bg-green-100 text-xs">Hoạt động</Badge> : <Badge variant="destructive" className="text-xs">Đã khoá</Badge>}
                    <span className="text-xs text-slate-500">{u._count.sales} đơn</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>Sửa</Button>
                    {!isMe && <Button size="sm" variant="outline" onClick={() => toggleActive(u)}>{u.active ? 'Khoá' : 'Mở'}</Button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? `Sửa: ${editing.name}` : 'Thêm nhân viên'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editing}
                placeholder="nhanvien@erp.local"
              />
              {editing && <p className="text-xs text-slate-500 mt-1">Không thể đổi email</p>}
            </div>
            <div>
              <Label>Tên</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nguyễn Văn A" />
            </div>
            <div>
              <Label>{editing ? 'Mật khẩu mới (để trống = không đổi)' : 'Mật khẩu *'}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder={editing ? 'Để trống nếu giữ nguyên' : 'Tối thiểu 6 ký tự'}
              />
            </div>
            <div>
              <Label>Quyền</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Nhân viên — bán hàng, nhập kho, xem SP</SelectItem>
                  <SelectItem value="MANAGER">Quản lý — xem báo cáo, import Excel</SelectItem>
                  <SelectItem value="ADMIN">Quản trị — toàn quyền</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={save}
              className="w-full"
              disabled={
                busy ||
                !form.name.trim() ||
                (!editing && (!form.email.trim() || form.password.length < 6))
              }
            >
              {busy ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
