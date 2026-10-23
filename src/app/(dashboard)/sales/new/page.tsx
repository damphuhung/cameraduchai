'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Minus, ShoppingCart, Package, ScanLine, Check } from 'lucide-react';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

type Product = { id: number; sku: string; name: string; sellPrice: string; stock: number; trackSerial: boolean };
type Customer = { id: number; name: string; phone: string };
type CartItem = { productId: number; productName: string; sku: string; unitPrice: number; quantity: number; trackSerial: boolean; serialIds: number[]; serialNumbers: string[] };
type Serial = { id: number; serialNumber: string };
type Settings = { shopName: string; bankId: string; bankAccount: string; bankOwner: string };

export default function POSPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>('');
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [mobileTab, setMobileTab] = useState<'products' | 'cart'>('products');

  const [serialPickerFor, setSerialPickerFor] = useState<Product | null>(null);
  const [serials, setSerials] = useState<Serial[]>([]);
  const [selectedSerials, setSelectedSerials] = useState<number[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [newCustomerOpen, setNewCustomerOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', address: '' });

  // Mã đơn preview (dùng để hiển thị trong QR và gửi lên API)
  const [saleCode] = useState(() => `HD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`);

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/customers').then((r) => r.json()),
      fetch('/api/settings').then((r) => r.json()),
    ]).then(([p, c, s]) => { setProducts(p); setCustomers(c); setSettings(s); });
  }, []);

  const subtotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  function addProductToCart(p: Product) {
    if (p.trackSerial) { openSerialPicker(p); return; }
    const existing = cart.find((i) => i.productId === p.id);
    if (existing) {
      if (existing.quantity + 1 > p.stock) { alert(`Chỉ còn ${p.stock}`); return; }
      setCart(cart.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      if (p.stock < 1) { alert('Hết hàng'); return; }
      setCart([...cart, { productId: p.id, productName: p.name, sku: p.sku, unitPrice: Number(p.sellPrice), quantity: 1, trackSerial: false, serialIds: [], serialNumbers: [] }]);
    }
  }

  async function openSerialPicker(p: Product) {
    const r = await fetch(`/api/products/${p.id}/serials`);
    const list: Serial[] = await r.json();
    if (list.length === 0) { alert('Không còn serial nào trong kho'); return; }
    setSerials(list); setSelectedSerials([]); setSerialPickerFor(p);
  }

  function confirmSerialPick() {
    if (!serialPickerFor || selectedSerials.length === 0) { setSerialPickerFor(null); return; }
    const picked = serials.filter((s) => selectedSerials.includes(s.id));
    const existing = cart.find((i) => i.productId === serialPickerFor.id);
    if (existing) {
      setCart(cart.map((i) => i.productId === serialPickerFor.id
        ? { ...i, quantity: i.quantity + picked.length, serialIds: [...i.serialIds, ...picked.map((x) => x.id)], serialNumbers: [...i.serialNumbers, ...picked.map((x) => x.serialNumber)] }
        : i));
    } else {
      setCart([...cart, { productId: serialPickerFor.id, productName: serialPickerFor.name, sku: serialPickerFor.sku, unitPrice: Number(serialPickerFor.sellPrice), quantity: picked.length, trackSerial: true, serialIds: picked.map((x) => x.id), serialNumbers: picked.map((x) => x.serialNumber) }]);
    }
    setSerialPickerFor(null);
  }

  function updateQuantity(idx: number, delta: number) {
    const item = cart[idx];
    const p = products.find((x) => x.id === item.productId);
    const newQty = item.quantity + delta;
    if (newQty < 1) return;
    if (p && newQty > p.stock) { alert(`Chỉ còn ${p.stock}`); return; }
    const next = [...cart];
    next[idx] = { ...next[idx], quantity: newQty };
    setCart(next);
  }

  function removeItem(idx: number) { setCart(cart.filter((_, i) => i !== idx)); }

  function removeSerial(idx: number, serialId: number) {
    const item = cart[idx];
    if (item.quantity <= 1) { removeItem(idx); return; }
    const newSerialIds = item.serialIds.filter((id) => id !== serialId);
    const newSerialNumbers = item.serialNumbers.filter((_, j) => item.serialIds[j] !== serialId);
    setCart(cart.map((it, i) => i === idx ? { ...it, quantity: it.quantity - 1, serialIds: newSerialIds, serialNumbers: newSerialNumbers } : it));
  }

  async function handleScan(code: string) {
    const trimmed = code.trim();
    if (!trimmed) return;
    const r = await fetch(`/api/serials/lookup?code=${encodeURIComponent(trimmed)}`);
    if (!r.ok) {
      const p = products.find((x) => x.sku === trimmed || x.sku.toLowerCase() === trimmed.toLowerCase());
      if (p) addProductToCart(p);
      else alert(`Không tìm thấy: ${trimmed}`);
      return;
    }
    const serial = await r.json();
    if (serial.status !== 'IN_STOCK') { alert(`Serial đã ${serial.status}`); return; }
    const p = products.find((x) => x.id === serial.productId);
    if (!p) return;
    const existing = cart.find((i) => i.productId === p.id);
    if (existing) {
      if (existing.serialIds.includes(serial.id)) { alert('Serial đã có trong giỏ'); return; }
      setCart(cart.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1, serialIds: [...i.serialIds, serial.id], serialNumbers: [...i.serialNumbers, serial.serialNumber] } : i));
    } else {
      setCart([...cart, { productId: p.id, productName: p.name, sku: p.sku, unitPrice: Number(p.sellPrice), quantity: 1, trackSerial: true, serialIds: [serial.id], serialNumbers: [serial.serialNumber] }]);
    }
    setScannerOpen(false);
    setMobileTab('cart');
  }

  async function saveNewCustomer() {
    const r = await fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCustomerForm) });
    if (!r.ok) { alert((await r.json()).error); return; }
    const c = await r.json();
    setCustomers([c, ...customers]); setCustomerId(String(c.id));
    setNewCustomerOpen(false); setNewCustomerForm({ name: '', phone: '', address: '' });
  }

  async function checkout() {
    if (cart.length === 0) { alert('Giỏ hàng trống'); return; }
    setSaving(true);
    const res = await fetch('/api/sales', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: saleCode,
        customerId: customerId ? Number(customerId) : null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, serialIds: i.trackSerial ? i.serialIds : undefined })),
        discount, paid, paymentMethod, note: note || undefined,
      }),
    });
    setSaving(false);
    if (!res.ok) { alert((await res.json()).error); return; }
    const sale = await res.json();
    router.push(`/sales/${sale.id}`);
  }

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)).slice(0, 30);
  }, [products, search]);

  const qrUrl = useMemo(() => {
    if (paymentMethod !== 'TRANSFER') return null;
    if (!settings?.bankId || !settings?.bankAccount) return null;
    if (total <= 0) return null;
    const params = new URLSearchParams({
      amount: String(Math.round(total)),
      addInfo: saleCode,
      accountName: settings.bankOwner || '',
    });
    return `https://img.vietqr.io/image/${settings.bankId}-${settings.bankAccount}-compact2.png?${params}`;
  }, [paymentMethod, settings, total, saleCode]);

  return (
    <div className="space-y-3">
      <div className="lg:hidden flex border rounded-md overflow-hidden">
        <button onClick={() => setMobileTab('products')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1 ${mobileTab === 'products' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          <Package className="h-4 w-4" /> Sản phẩm
        </button>
        <button onClick={() => setMobileTab('cart')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-1 ${mobileTab === 'cart' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          <ShoppingCart className="h-4 w-4" /> Giỏ ({cart.length})
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-3">
        <div className={`space-y-3 ${mobileTab === 'cart' ? 'hidden lg:block' : ''}`}>
          <Card className="p-3">
            <div className="flex gap-2">
              <Input placeholder="Tìm SP theo tên / SKU..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button variant="outline" onClick={() => setScannerOpen(true)}><ScanLine className="h-4 w-4" /></Button>
            </div>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filteredProducts.map((p) => (
              <button key={p.id} onClick={() => addProductToCart(p)} className="text-left p-3 rounded-lg border bg-white hover:border-slate-400 hover:shadow-sm transition">
                <p className="font-medium text-sm line-clamp-2">{p.name}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{p.sku}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-semibold">{Number(p.sellPrice).toLocaleString()}đ</span>
                  <Badge variant={p.stock < 3 ? 'destructive' : 'secondary'} className="text-xs">{p.stock}</Badge>
                </div>
                {p.trackSerial && <Badge variant="outline" className="mt-1 text-[10px]">S/N</Badge>}
              </button>
            ))}
            {filteredProducts.length === 0 && <div className="col-span-full text-center py-8 text-slate-500">Không có sản phẩm</div>}
          </div>
        </div>

        <div className={`space-y-3 ${mobileTab === 'products' ? 'hidden lg:block' : ''}`}>
          <Card className="p-3 space-y-2">
            <Label className="text-xs">Khách hàng</Label>
            <div className="flex gap-2">
              <Select value={customerId || ""} onValueChange={setCustomerId}>
                <SelectTrigger>
          {/* Thay <SelectValue /> bằng logic hiển thị thủ công */}
           {customerId 
            ? (customers.find(c => String(c.id) === customerId)?.name || "Khách lẻ") 
           : "Khách lẻ"}
          </SelectTrigger>
            <SelectContent>
             {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name} · {c.phone}</SelectItem>)}
            </SelectContent>
          </Select>
              <Button variant="outline" size="icon" onClick={() => setNewCustomerOpen(true)}><Plus className="h-4 w-4" /></Button>
            </div>
            {customerId && <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setCustomerId('')}>Bỏ chọn</Button>}
          </Card>

          <Card className="p-3 space-y-2">
            <div className="flex justify-between items-center">
              <Label>Giỏ hàng ({cart.length})</Label>
              {cart.length > 0 && <Button variant="ghost" size="sm" onClick={() => setCart([])}>Xoá hết</Button>}
            </div>
            <div className="space-y-2 max-h-64 lg:max-h-[35vh] overflow-y-auto">
              {cart.length === 0 && <p className="text-center py-6 text-sm text-slate-500">Chưa có sản phẩm</p>}
              {cart.map((it, idx) => (
                <div key={it.productId} className="border-b pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{it.productName}</p>
                      <p className="text-xs text-slate-500">{it.unitPrice.toLocaleString()}đ</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeItem(idx)}><X className="h-3 w-3" /></Button>
                  </div>
                  {it.trackSerial ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {it.serialNumbers.map((s, j) => (
                        <Badge key={j} variant="secondary" className="text-xs font-mono">
                          {s}
                          <button onClick={() => removeSerial(idx, it.serialIds[j])} className="ml-1 hover:text-red-600">×</button>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(idx, -1)}><Minus className="h-3 w-3" /></Button>
                      <span className="text-sm w-6 text-center">{it.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(idx, 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                  )}
                  <p className="text-right text-sm font-medium mt-1">{(it.unitPrice * it.quantity).toLocaleString()}đ</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-3 space-y-3">
            <div className="flex justify-between text-sm"><span>Tạm tính</span><span>{subtotal.toLocaleString()}đ</span></div>
            <div>
              <Label className="text-xs">Giảm giá</Label>
              <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} />
            </div>
            <div className="flex justify-between text-lg font-bold"><span>Tổng</span><span>{total.toLocaleString()}đ</span></div>
            <div>
              <Label className="text-xs">Phương thức thanh toán</Label>
              <Select value={paymentMethod || ""} onValueChange={(v) => setPaymentMethod(v as any)}>
                <SelectTrigger>
                {/* Thay <SelectValue /> bằng logic hiển thị thủ công */}
                 {paymentMethod === 'CASH' ? '💵 Tiền mặt' : paymentMethod === 'TRANSFER' ? '🏦 Chuyển khoản' : 'Chọn...'}
                 </SelectTrigger>
                <SelectContent>
                <SelectItem value="CASH">💵 Tiền mặt</SelectItem>
                <SelectItem value="TRANSFER">🏦 Chuyển khoản</SelectItem>
              </SelectContent>
            </Select>
            </div>

            {paymentMethod === 'TRANSFER' && (
              qrUrl ? (
                <div className="border rounded-md p-3 text-center space-y-2 bg-slate-50">
                  <p className="text-xs font-medium text-slate-700">Quét QR để chuyển khoản</p>
                  <img src={qrUrl} alt="VietQR" className="mx-auto w-56 rounded" />
                  <div className="text-xs text-slate-600 space-y-0.5">
                    <p><b>{settings?.bankId}</b> · {settings?.bankAccount}</p>
                    {settings?.bankOwner && <p>{settings.bankOwner}</p>}
                    <p>Số tiền: <b>{total.toLocaleString()}đ</b></p>
                    <p>ND: <span className="font-mono">{saleCode}</span></p>
                  </div>
                </div>
              ) : (
                <div className="border rounded-md p-3 text-xs text-amber-700 bg-amber-50">
                  ⚠️ Chưa cấu hình ngân hàng. Vào <b>Cấu hình</b> để thêm thông tin.
                </div>
              )
            )}

            <div>
              <Label className="text-xs">Khách đưa</Label>
              <Input type="number" min={0} value={paid} onChange={(e) => setPaid(Math.max(0, Number(e.target.value) || 0))} />
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => setPaid(total)}>Đã nhận đủ</Button>
                <Button size="sm" variant="outline" className="text-xs flex-1" onClick={() => setPaid(0)}>0</Button>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              {paid > total ? (
                <><span className="text-green-600">Tiền thừa</span><span className="text-green-600 font-medium">{(paid - total).toLocaleString()}đ</span></>
              ) : paid < total ? (
                <><span className="text-red-600">Còn nợ</span><span className="text-red-600 font-medium">{(total - paid).toLocaleString()}đ</span></>
              ) : (
                <><span className="text-green-600">Đã thanh toán đủ</span><Check className="h-4 w-4 text-green-600" /></>
              )}
            </div>
            <Button className="w-full" size="lg" onClick={checkout} disabled={saving || cart.length === 0}>
              {saving ? 'Đang lưu...' : 'Thanh toán'}
            </Button>
          </Card>
        </div>
      </div>

      <Dialog open={!!serialPickerFor} onOpenChange={() => setSerialPickerFor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Chọn serial — {serialPickerFor?.name}</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">Còn {serials.length} serial. Đã chọn {selectedSerials.length}.</p>
          <div className="max-h-72 overflow-y-auto border rounded-md">
            {serials.map((s) => (
              <label key={s.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 cursor-pointer border-b last:border-0">
                <input type="checkbox" checked={selectedSerials.includes(s.id)} onChange={(e) => setSelectedSerials(e.target.checked ? [...selectedSerials, s.id] : selectedSerials.filter((id) => id !== s.id))} />
                <span className="font-mono text-sm">{s.serialNumber}</span>
              </label>
            ))}
          </div>
          <Button onClick={confirmSerialPick} disabled={selectedSerials.length === 0} className="w-full">
            Thêm {selectedSerials.length} serial vào giỏ
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={scannerOpen} onOpenChange={setScannerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quét serial / SKU</DialogTitle></DialogHeader>
          <BarcodeScanner onScan={handleScan} />
        </DialogContent>
      </Dialog>

      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Thêm khách hàng nhanh</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Tên *</Label><Input value={newCustomerForm.name} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })} /></div>
            <div><Label>SĐT *</Label><Input value={newCustomerForm.phone} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })} /></div>
            <div><Label>Địa chỉ</Label><Input value={newCustomerForm.address} onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })} /></div>
            <Button onClick={saveNewCustomer} className="w-full" disabled={!newCustomerForm.name.trim() || !newCustomerForm.phone.trim()}>Lưu</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
