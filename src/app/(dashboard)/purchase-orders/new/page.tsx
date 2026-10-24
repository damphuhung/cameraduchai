'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';
import { X, ScanLine, Plus, ImagePlus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Đảm bảo file này đã có

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [note, setNote] = useState('');
  const [paid, setPaid] = useState(0);
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // STATE CHO ẢNH
  const [proofImages, setProofImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [scanForItem, setScanForItem] = useState<any | null>(null);
  const [manualInputForItem, setManualInputForItem] = useState<any | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/suppliers').then((r) => r.json()), 
      fetch('/api/products').then((r) => r.json())
    ]).then(([s, p]) => { setSuppliers(s); setProducts(p); });
  }, []);

  // HÀM UPLOAD ẢNH LÊN SUPABASE
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage.from('proofs').upload(fileName, file);
      
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(data.path);
        newUrls.push(publicUrl);
      } else {
        alert('Lỗi upload ảnh: ' + error?.message);
      }
    }
    setProofImages([...proofImages, ...newUrls]);
    setUploading(false);
  }

  function addProduct(p: any) {
    if (items.some((i) => i.productId === p.id)) return;
    setItems([...items, { 
      productId: p.id, productName: p.name, sku: p.sku, trackSerial: p.trackSerial, 
      quantity: 1, unitCost: Number(p.costPrice), serials: [] 
    }]);
    setSearch('');
    setShowDropdown(false);
  }

  function updateItem(idx: number, patch: any) {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    if (next[idx].trackSerial && next[idx].serials.length > next[idx].quantity) {
      next[idx].serials = next[idx].serials.slice(0, next[idx].quantity);
    }
    setItems(next);
  }

  function addSerialToItem(item: any, serial: string) {
    const trimmed = serial.trim();
    if (!trimmed) return;
    if (item.serials.includes(trimmed)) { alert(`Serial ${trimmed} đã có`); return; }
    if (item.serials.length >= item.quantity) { alert(`Đã đủ ${item.quantity} serial`); return; }
    const next = [...items];
    const idx = next.findIndex((i) => i.productId === item.productId);
    next[idx] = { ...next[idx], serials: [...next[idx].serials, trimmed] };
    setItems(next);
  }

  const total = items.reduce((s, i) => s + i.unitCost * i.quantity, 0);

  async function save() {
    if (!supplierId) { alert('Vui lòng chọn Nhà cung cấp'); return; }
    if (items.length === 0) { alert('Chưa có sản phẩm nào'); return; }
    for (const it of items) {
      if (it.trackSerial && it.serials.length !== it.quantity) { 
        alert(`"${it.productName}": cần nhập đủ ${it.quantity} serial`); return; 
      }
    }
    
    setSaving(true);
    const res = await fetch('/api/purchase-orders', { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ 
        supplierId: Number(supplierId), 
        note: note || undefined, 
        paid, 
        proofImages: proofImages.length > 0 ? proofImages : undefined, // GỬI ẢNH LÊN API
        items: items.map((i) => ({ 
          productId: i.productId, quantity: i.quantity, unitCost: i.unitCost, 
          serials: i.trackSerial ? i.serials : undefined 
        })) 
      }) 
    });
    setSaving(false);
    
    if (!res.ok) { alert((await res.json()).error); return; }
    const po = await res.json();
    router.push(`/purchase-orders/${po.id}`);
  }

  const filteredProducts = products.filter((p) => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
  }).slice(0, 10);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/purchase-orders" className="text-sm text-slate-500 hover:underline">← DS</Link>
        <h2 className="text-xl font-semibold ml-2">Tạo phiếu nhập</h2>
      </div>
      
      <Card className="p-4 space-y-3 overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>Nhà cung cấp *</Label>
            <Select value={supplierId || ""} onValueChange={setSupplierId}>
              <SelectTrigger>
                {supplierId ? (suppliers.find(s => String(s.id) === supplierId)?.name || "Chọn NCC...") : "Chọn NCC..."}
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ghi chú</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tuỳ chọn" />
          </div>
        </div>
      </Card>

      <Card className="p-4 space-y-3 overflow-visible">
        <Label>Thêm SP</Label>
        <div className="relative">
          <Input 
            placeholder="Tìm tên hoặc SKU (bấm để xem danh sách)..." 
            value={search} 
            onChange={(e) => { setSearch(e.target.value); setShowDropdown(true); }}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          />
          {showDropdown && filteredProducts.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white border rounded-md shadow-lg max-h-72 overflow-auto">
              {filteredProducts.map((p) => (
                <button key={p.id} type="button" onClick={() => addProduct(p)} className="w-full text-left px-3 py-2 hover:bg-slate-100 border-b last:border-0">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{p.sku} · Tồn: {p.stock}</p>
                    </div>
                    {p.trackSerial && <Badge variant="secondary" className="text-xs">S/N</Badge>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>

      <div className="space-y-3">
        {items.map((it, idx) => (
          <Card key={it.productId} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{it.productName}</p>
                <p className="text-xs text-slate-500 font-mono">{it.sku}</p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label className="text-xs">SL</Label>
                <Input type="number" min={1} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div>
                <Label className="text-xs">Đơn giá</Label>
                <Input type="number" min={0} value={it.unitCost} onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value) || 0 })} />
              </div>
            </div>

            {it.trackSerial && (
              <div className="mt-3 border-t pt-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-xs">Serial ({it.serials.length}/{it.quantity})</Label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => setScanForItem(it)}><ScanLine className="h-3 w-3 mr-1" /> Quét</Button>
                    <Button size="sm" variant="outline" onClick={() => setManualInputForItem({ item: it, value: '' })}><Plus className="h-3 w-3 mr-1" /> Nhập</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {it.serials.map((s: string) => (
                    <Badge key={s} variant="secondary" className="font-mono text-xs">
                      {s}
                      <button type="button" onClick={() => updateItem(idx, { serials: it.serials.filter((x: string) => x !== s) })} className="ml-1 hover:text-red-600">×</button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-right mt-2 text-sm">Thành tiền: <b>{(it.unitCost * it.quantity).toLocaleString()}đ</b></p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-3 sticky bottom-16 lg:bottom-0 bg-white shadow-lg">
        <div className="flex justify-between text-lg font-semibold"><span>Tổng</span><span>{total.toLocaleString()}đ</span></div>
        <div><Label className="text-xs">Đã trả NCC</Label><Input type="number" min={0} value={paid} onChange={(e) => setPaid(Number(e.target.value) || 0)} /></div>
        
        {/* KHU VỰC UPLOAD ẢNH */}
        <div className="border-t pt-3">
          <Label className="text-sm font-medium">Ảnh chứng minh thanh toán (Bill, ảnh chụp...)</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {proofImages.map((url, idx) => (
              <div key={idx} className="relative w-20 h-20 border rounded overflow-hidden shadow-sm">
                <img src={url} alt="proof" className="w-full h-full object-cover" />
                <button type="button" onClick={() => setProofImages(proofImages.filter((_, i) => i !== idx))} className="absolute top-0 right-0 bg-red-600/80 hover:bg-red-600 text-white p-1 rounded-bl">
                  <Trash2 className="h-3 w-3"/>
                </button>
              </div>
            ))}
            <label className={`w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
              <ImagePlus className="h-6 w-6 text-slate-400" />
              <span className="text-[10px] text-slate-500 mt-1 text-center">{uploading ? 'Đang up...' : 'Thêm ảnh'}</span>
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          </div>
        </div>

        <Button onClick={save} disabled={saving || uploading} className="w-full mt-4" size="lg">{saving ? 'Đang lưu...' : 'Lưu phiếu'}</Button>
      </Card>

      {/* Dialogs */}
      <Dialog open={!!scanForItem} onOpenChange={() => setScanForItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Quét serial — {scanForItem?.productName}</DialogTitle></DialogHeader>
          {scanForItem && <BarcodeScanner onScan={(code) => { addSerialToItem(scanForItem, code); const fresh = items.find((i) => i.productId === scanForItem.productId); if (fresh && fresh.serials.length + 1 >= fresh.quantity) setScanForItem(null); }} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!manualInputForItem} onOpenChange={() => setManualInputForItem(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nhập serial</DialogTitle></DialogHeader>
          {manualInputForItem && (
            <form onSubmit={(e) => { e.preventDefault(); addSerialToItem(manualInputForItem.item, manualInputForItem.value); setManualInputForItem({ ...manualInputForItem, value: '' }); }} className="space-y-3">
              <Input autoFocus placeholder="Serial..." value={manualInputForItem.value} onChange={(e) => setManualInputForItem({ ...manualInputForItem, value: e.target.value })} />
              <Button type="submit" className="w-full">Thêm</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}