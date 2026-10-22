'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { readExcelFile, exportExcel, downloadTemplate } from '@/lib/excel';
import { Download, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';

type Tab = 'import' | 'export';
type ImportKind = 'products' | 'serials' | 'customers' | 'suppliers';

export default function ImportExportPage() {
  const [tab, setTab] = useState<Tab>('import');
  const [kind, setKind] = useState<ImportKind>('products');

  // Products / Customers / Suppliers
  const [rows, setRows] = useState<any[]>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Serials
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [serialsText, setSerialsText] = useState('');
  const [serialResult, setSerialResult] = useState<any>(null);

  useEffect(() => {
    if (kind === 'serials') {
      fetch('/api/products').then((r) => r.json()).then(setProducts);
    }
  }, [kind]);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    try {
      const parsed = await readExcelFile(file);
      setRows(parsed);
    } catch (err: any) {
      alert('Lỗi đọc file: ' + err.message);
    }
  }

  async function doImport() {
    if (rows.length === 0) return;
    setBusy(true);
    setResult(null);
    const r = await fetch(`/api/import/${kind}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    setResult(await r.json());
  }

  async function doImportSerials() {
    if (!selectedProductId) { alert('Chọn sản phẩm'); return; }
    const serials = serialsText
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (serials.length === 0) { alert('Chưa có serial nào'); return; }

    setBusy(true);
    setSerialResult(null);
    const r = await fetch('/api/import/serials', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: Number(selectedProductId), serials }),
    });
    setBusy(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    const data = await r.json();
    setSerialResult(data);
    if (data.created > 0) setSerialsText('');
  }

  async function onSerialsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const parsed = await readExcelFile(file);
    // Lấy cột đầu tiên của mỗi dòng
    const serials = parsed.map((r) => {
      const keys = Object.keys(r);
      return String(r[keys[0]] ?? '').trim();
    }).filter(Boolean);
    setSerialsText(serials.join('\n'));
  }

  // ============ EXPORTS ============
  async function exportProducts() {
    const r = await fetch('/api/export/products');
    const data = await r.json();
    exportExcel(data, `san-pham-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Sản phẩm');
  }
  async function exportSales() {
    const r = await fetch('/api/sales?limit=10000');
    const data = await r.json();
    const rows = data.map((s: any) => ({
      code: s.code,
      date: new Date(s.createdAt).toLocaleString('vi-VN'),
      customer: s.customer?.name ?? 'Khách lẻ',
      phone: s.customer?.phone ?? '',
      cashier: s.user?.name ?? '',
      subtotal: Number(s.subtotal),
      discount: Number(s.discount),
      total: Number(s.total),
      paid: Number(s.paid),
      debt: Number(s.total) - Number(s.paid),
      paymentMethod: s.paymentMethod,
    }));
    exportExcel(rows, `don-hang-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Đơn hàng');
  }
  async function exportCustomers() {
    const r = await fetch('/api/customers');
    const data = await r.json();
    const rows = data.map((c: any) => ({
      name: c.name, phone: c.phone, address: c.address ?? '', type: c.type, debt: Number(c.debt),
    }));
    exportExcel(rows, `khach-hang-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Khách hàng');
  }
  async function exportSuppliers() {
    const r = await fetch('/api/suppliers');
    const data = await r.json();
    const rows = data.map((s: any) => ({
      name: s.name, phone: s.phone ?? '', address: s.address ?? '', debt: Number(s.debt),
    }));
    exportExcel(rows, `nha-cung-cap-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Nhà cung cấp');
  }
  async function exportStock() {
    const r = await fetch('/api/reports/stock');
    const data = await r.json();
    const rows = data.all.map((p: any) => ({
      sku: p.sku, name: p.name, category: p.category, brand: p.brand ?? '',
      stock: p.stock, minStock: p.minStock,
      costPrice: p.costPrice, sellPrice: p.sellPrice, value: p.value,
    }));
    exportExcel(rows, `ton-kho-${new Date().toISOString().slice(0, 10)}.xlsx`, 'Tồn kho');
  }

  // ============ TEMPLATES ============
  function tplProducts() {
    downloadTemplate(
      ['sku', 'name', 'category', 'brand', 'unit', 'costPrice', 'sellPrice', 'stock', 'minStock', 'warrantyMonths', 'trackSerial'],
      'template-san-pham.xlsx',
      { sku: 'CAM-001', name: 'Camera Hikvision 2MP', category: 'Camera', brand: 'Hikvision', unit: 'cái', costPrice: 500000, sellPrice: 800000, stock: 0, minStock: 3, warrantyMonths: 12, trackSerial: 'Có' },
    );
  }
  function tplCustomers() {
    downloadTemplate(
      ['name', 'phone', 'address', 'type'],
      'template-khach-hang.xlsx',
      { name: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q1', type: 'RETAIL' },
    );
  }
  function tplSuppliers() {
    downloadTemplate(
      ['name', 'phone', 'address'],
      'template-nha-cung-cap.xlsx',
      { name: 'Hikvision VN', phone: '02812345678', address: 'TP.HCM' },
    );
  }
  function tplSerials() {
    downloadTemplate(['serial'], 'template-serial.xlsx', { serial: 'SN-0001' });
  }

  return (
    <div className="space-y-4 max-w-4xl">
      <h2 className="text-xl font-semibold">Import / Export Excel</h2>

      <div className="flex border rounded-md overflow-hidden">
        <button onClick={() => setTab('import')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'import' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          <Upload className="h-4 w-4" /> Nhập từ Excel
        </button>
        <button onClick={() => setTab('export')} className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 ${tab === 'export' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          <Download className="h-4 w-4" /> Xuất ra Excel
        </button>
      </div>

      {tab === 'import' && (
        <>
          <div className="flex border rounded-md overflow-hidden">
            {([
              { key: 'products', label: 'Sản phẩm' },
              { key: 'serials', label: 'Serial vào SP' },
              { key: 'customers', label: 'Khách hàng' },
              { key: 'suppliers', label: 'Nhà CC' },
            ] as const).map((t) => (
              <button
                key={t.key}
                onClick={() => { setKind(t.key); setRows([]); setResult(null); setSerialResult(null); setFileName(''); setSerialsText(''); }}
                className={`flex-1 py-2 text-xs sm:text-sm ${kind === t.key ? 'bg-slate-200 font-semibold' : 'bg-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {kind !== 'serials' && (
            <>
              <Card className="p-4 space-y-3">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <p className="text-sm font-medium">1. Tải file mẫu (nếu chưa có)</p>
                  <Button size="sm" variant="outline" onClick={
                    kind === 'products' ? tplProducts : kind === 'customers' ? tplCustomers : tplSuppliers
                  }>
                    <FileSpreadsheet className="h-4 w-4 mr-1" /> Tải template
                  </Button>
                </div>
                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">2. Upload file Excel</p>
                  <Input type="file" accept=".xlsx,.xls,.csv" onChange={onFileChange} />
                  {fileName && <p className="text-xs text-slate-500 mt-1">📄 {fileName} — {rows.length} dòng</p>}
                </div>
              </Card>

              {rows.length > 0 && (
                <Card className="p-4 space-y-3">
                  <p className="text-sm font-medium">3. Xem trước ({rows.length} dòng, hiển thị 10 dòng đầu)</p>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50">
                        <tr>
                          {Object.keys(rows[0]).map((k) => <th key={k} className="px-2 py-1 text-left border-b">{k}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-b last:border-0">
                            {Object.keys(rows[0]).map((k) => <td key={k} className="px-2 py-1">{String(r[k] ?? '')}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button onClick={doImport} disabled={busy} className="w-full">
                    {busy ? 'Đang nhập...' : `Nhập ${rows.length} dòng`}
                  </Button>
                </Card>
              )}

              {result && (
                <Card className="p-4 space-y-2">
                  <div className="flex gap-3">
                    {result.created > 0 && <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Tạo mới: {result.created}</Badge>}
                    {result.updated > 0 && <Badge variant="secondary">Cập nhật: {result.updated}</Badge>}
                    {result.failed?.length > 0 && <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Lỗi: {result.failed.length}</Badge>}
                  </div>
                  {result.failed?.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border rounded text-xs">
                      {result.failed.map((f: any, i: number) => (
                        <div key={i} className="px-2 py-1 border-b last:border-0 flex gap-2">
                          <span className="text-red-600 font-mono">Dòng {f.row}</span>
                          <span className="text-slate-500">{f.sku || f.name}:</span>
                          <span>{f.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}

          {kind === 'serials' && (
            <>
              <Card className="p-4 space-y-3">
                <div>
                  <Label>Chọn sản phẩm (phải bật quản lý S/N)</Label>
                  <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                    <SelectTrigger><SelectValue placeholder="Chọn SP..." /></SelectTrigger>
                    <SelectContent>
                      {products.filter((p) => p.trackSerial).map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name} — {p.sku} (tồn: {p.stock})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-3">
                  <div className="flex justify-between items-center mb-2">
                    <Label>Nhập serial (mỗi dòng 1 serial, hoặc cách nhau dấu phẩy)</Label>
                    <Button size="sm" variant="outline" onClick={tplSerials}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Tải template
                    </Button>
                  </div>
                  <Textarea
                    rows={6}
                    value={serialsText}
                    onChange={(e) => setSerialsText(e.target.value)}
                    placeholder="SN-0001&#10;SN-0002&#10;SN-0003&#10;hoặc: SN-0001, SN-0002, SN-0003"
                    className="font-mono text-sm"
                  />
                  <div className="mt-2 flex gap-2 items-center">
                    <Input type="file" accept=".xlsx,.xls,.csv" onChange={onSerialsFileChange} className="text-xs" />
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {serialsText.split(/[\n,;]/).filter((s) => s.trim()).length} serial
                    </span>
                  </div>
                </div>

                <Button onClick={doImportSerials} disabled={busy || !selectedProductId} className="w-full">
                  {busy ? 'Đang nhập...' : 'Nhập serial & tăng tồn kho'}
                </Button>
              </Card>

              {serialResult && (
                <Card className="p-4 space-y-2">
                  <div className="flex gap-3 flex-wrap">
                    <Badge variant="default" className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> Đã tạo: {serialResult.created}</Badge>
                    {serialResult.duplicated > 0 && <Badge variant="secondary">Trùng (bỏ qua): {serialResult.duplicated}</Badge>}
                  </div>
                  {serialResult.failed?.length > 0 && (
                    <div className="max-h-60 overflow-y-auto border rounded text-xs">
                      {serialResult.failed.map((f: any, i: number) => (
                        <div key={i} className="px-2 py-1 border-b last:border-0">
                          <span className="font-mono text-slate-500">{f.serial}</span> — <span className="text-red-600">{f.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Tồn kho đã được cập nhật tương ứng.</p>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {tab === 'export' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-green-600" /><p className="font-medium">Sản phẩm</p></div>
            <p className="text-xs text-slate-500">Danh sách toàn bộ SP đang bán</p>
            <Button onClick={exportProducts} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Xuất Excel
            </Button>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-blue-600" /><p className="font-medium">Đơn hàng</p></div>
            <p className="text-xs text-slate-500">Toàn bộ đơn bán (tối đa 10.000)</p>
            <Button onClick={exportSales} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Xuất Excel
            </Button>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-purple-600" /><p className="font-medium">Khách hàng</p></div>
            <p className="text-xs text-slate-500">Danh sách KH + công nợ</p>
            <Button onClick={exportCustomers} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Xuất Excel
            </Button>
          </Card>

          <Card className="p-4 space-y-2">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-orange-600" /><p className="font-medium">Nhà cung cấp</p></div>
            <p className="text-xs text-slate-500">Danh sách NCC + công nợ</p>
            <Button onClick={exportSuppliers} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Xuất Excel
            </Button>
          </Card>

          <Card className="p-4 space-y-2 md:col-span-2">
            <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-red-600" /><p className="font-medium">Tồn kho</p></div>
            <p className="text-xs text-slate-500">Toàn bộ SP + tồn kho hiện tại + giá trị</p>
            <Button onClick={exportStock} className="w-full" variant="outline">
              <Download className="h-4 w-4 mr-1" /> Xuất Excel
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
