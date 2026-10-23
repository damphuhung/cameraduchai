'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal, X, ArrowUpDown, Settings2 } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [trackSerial, setTrackSerial] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Product Form
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({ sku: '', name: '', categoryId: '', brandId: '', unit: 'cái', costPrice: 0, sellPrice: 0, stock: 0, minStock: 3, warrantyMonths: 12, trackSerial: false });

  // Manage Categories/Brands
  const [manageOpen, setManageOpen] = useState(false);
  const [manageType, setManageType] = useState<'category'|'brand'>('category');
  const [newItemName, setNewItemName] = useState('');

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId) params.set('categoryId', categoryId);
    if (brandId) params.set('brandId', brandId);
    if (trackSerial) params.set('trackSerial', trackSerial);
    if (stockStatus) params.set('stockStatus', stockStatus);
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);

    const [p, c, b] = await Promise.all([
      fetch('/api/products?' + params.toString()).then((r) => r.json()),
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/brands').then((r) => r.json()),
    ]);
    setProducts(p); setCats(c); setBrands(b);
  }
  useEffect(() => { load(); }, [search, categoryId, brandId, trackSerial, stockStatus, sortBy, sortDir]);

  function clearFilters() {
    setSearch(''); setCategoryId(''); setBrandId(''); setTrackSerial(''); setStockStatus('');
    setSortBy('createdAt'); setSortDir('desc');
  }
  const hasFilter = categoryId || brandId || trackSerial || stockStatus;

  function openNew() {
    setEditing(null);
    setForm({ sku: '', name: '', categoryId: '', brandId: '', unit: 'cái', costPrice: 0, sellPrice: 0, stock: 0, minStock: 3, warrantyMonths: 12, trackSerial: false });
    setOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    setForm({ sku: p.sku, name: p.name, categoryId: String(p.categoryId), brandId: p.brandId ? String(p.brandId) : '', unit: p.unit, costPrice: Number(p.costPrice), sellPrice: Number(p.sellPrice), stock: p.stock, minStock: p.minStock, warrantyMonths: p.warrantyMonths, trackSerial: p.trackSerial });
    setOpen(true);
  }
  async function save() {
    const body = { ...form, categoryId: Number(form.categoryId), brandId: form.brandId ? Number(form.brandId) : null };
    const url = editing ? `/api/products/${editing.id}` : '/api/products';
    const res = await fetch(url, { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setOpen(false); load();
  }
  async function del(id: number) {
    if (!confirm('Xoá sản phẩm?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' }); load();
  }

  async function addManageItem() {
    if (!newItemName.trim()) return;
    const url = manageType === 'category' ? '/api/categories' : '/api/brands';
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newItemName }) });
    if (!res.ok) { alert((await res.json()).error); return; }
    setNewItemName('');
    load();
  }
  async function deleteManageItem(id: number) {
    if (!confirm('Xoá mục này?')) return;
    const url = manageType === 'category' ? '/api/categories' : '/api/brands';
    const res = await fetch(`${url}?id=${id}`, { method: 'DELETE' });
    if (!res.ok) alert((await res.json()).error);
    else load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-semibold">Sản phẩm ({products.length})</h2>
        <div className="flex gap-2 flex-wrap">
          <Input placeholder="Tìm tên / SKU..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal className="h-4 w-4 mr-1" /> Lọc {hasFilter ? '(bật)' : ''}
          </Button>
          <Button variant="outline" onClick={() => setManageOpen(true)}>
            <Settings2 className="h-4 w-4 mr-1" /> Quản lý Danh mục/Hãng
          </Button>
          <Button onClick={openNew}>+ Thêm SP</Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <Label className="text-xs">Danh mục</Label>
              <Select value={categoryId || ""} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  {cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Hãng</Label>
              <Select value={brandId || ""} onValueChange={setBrandId}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  {brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tồn kho</Label>
              <Select value={stockStatus || ""} onValueChange={setStockStatus}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Còn hàng</SelectItem>
                  <SelectItem value="low">Sắp hết</SelectItem>
                  <SelectItem value="out">Hết hàng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Serial</Label>
              <Select value={trackSerial || ""} onValueChange={setTrackSerial}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Có S/N</SelectItem>
                  <SelectItem value="0">Không S/N</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-end pt-1">
            <div>
              <Label className="text-xs">Sắp xếp theo</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Ngày tạo</SelectItem>
                  <SelectItem value="name">Tên A-Z</SelectItem>
                  <SelectItem value="sku">SKU</SelectItem>
                  <SelectItem value="stock">Tồn kho</SelectItem>
                  <SelectItem value="sellPrice">Giá bán</SelectItem>
                  <SelectItem value="costPrice">Giá nhập</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="icon" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
            {hasFilter && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" /> Xoá lọc</Button>}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="hidden lg:block">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left">
                <th className="px-3 py-2">SKU</th><th className="px-3 py-2">Tên</th><th className="px-3 py-2">Danh mục</th><th className="px-3 py-2">Hãng</th>
                <th className="px-3 py-2 text-right">Giá nhập</th><th className="px-3 py-2 text-right">Giá bán</th><th className="px-3 py-2 text-right">Tồn</th><th className="px-3 py-2">S/N</th><th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.category.name}</td>
                  <td className="px-3 py-2">{p.brand?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right">{Number(p.costPrice).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(p.sellPrice).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right"><Badge variant={p.stock === 0 ? 'destructive' : p.stock < p.minStock ? 'outline' : 'secondary'}>{p.stock}</Badge></td>
                  <td className="px-3 py-2">{p.trackSerial ? '✓' : ''}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>Sửa</Button>
                    <Button size="sm" variant="ghost" onClick={() => del(p.id)}>Xoá</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="lg:hidden divide-y">
          {products.map((p) => (
            <div key={p.id} className="p-3" onClick={() => openEdit(p)}>
              <div className="flex justify-between">
                <div><p className="font-medium">{p.name}</p><p className="text-xs text-slate-500 font-mono">{p.sku} · {p.category.name}</p></div>
                <Badge variant={p.stock === 0 ? 'destructive' : p.stock < p.minStock ? 'outline' : 'secondary'}>{p.stock}</Badge>
              </div>
              <p className="text-sm mt-1">{Number(p.sellPrice).toLocaleString()}đ</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Dialog Edit/Add Product */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div><Label>Đơn vị</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div><Label>Tên</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Danh mục</Label>
                <Select value={form.categoryId || ""} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                  <SelectTrigger>
                    {form.categoryId 
                    ? (cats.find(c => String(c.id) === form.categoryId)?.name || "Chọn...") 
                    : "Chọn..."}
                  </SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Hãng</Label>
                <Select value={form.brandId || ""} onValueChange={(v) => setForm({ ...form, brandId: v })}>
                  <SelectTrigger>
                    {form.brandId 
                    ? (brands.find(b => String(b.id) === form.brandId)?.name || "Không") 
                    : "Không"}
                  </SelectTrigger>
                <SelectContent>{brands.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Giá nhập</Label><Input type="number" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} /></div>
              <div><Label>Giá bán</Label><Input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Tồn</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} /></div>
              <div><Label>Tồn min</Label><Input type="number" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} /></div>
              <div><Label>BH (tháng)</Label><Input type="number" value={form.warrantyMonths} onChange={(e) => setForm({ ...form, warrantyMonths: Number(e.target.value) })} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.trackSerial} onChange={(e) => setForm({ ...form, trackSerial: e.target.checked })} />
              Quản lý theo số serial (S/N)
            </label>
            <Button onClick={save} className="w-full">Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Quản lý Danh mục & Hãng */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quản lý Danh mục & Hãng</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-4">
            <Button variant={manageType === 'category' ? 'default' : 'outline'} onClick={() => setManageType('category')} className="flex-1">Danh mục</Button>
            <Button variant={manageType === 'brand' ? 'default' : 'outline'} onClick={() => setManageType('brand')} className="flex-1">Hãng</Button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Tên mới..." onKeyDown={e => e.key === 'Enter' && addManageItem()} />
            <Button onClick={addManageItem}>Thêm</Button>
          </div>

          <div className="max-h-60 overflow-y-auto border rounded divide-y">
            {(manageType === 'category' ? cats : brands).map(item => (
              <div key={item.id} className="flex justify-between items-center p-2">
                <span>{item.name}</span>
                <Button size="sm" variant="ghost" className="text-red-600 h-7 px-2" onClick={() => deleteManageItem(item.id)}>Xoá</Button>
              </div>
            ))}
            {(manageType === 'category' ? cats : brands).length === 0 && <p className="p-4 text-center text-sm text-slate-500">Chưa có dữ liệu</p>}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}