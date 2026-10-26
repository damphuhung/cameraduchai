'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

const STATUS_LABEL: Record<string, string> = { 
  IN_STOCK: 'Trong kho', 
  SOLD: 'Đã bán', 
  RETURNED: 'Đã trả', 
  DEFECTIVE: 'Hỏng' 
};

export default function SerialLookupPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup(c: string) {
    setCode(c); setResult(null); setError(null);
    const res = await fetch(`/api/serials/lookup?code=${encodeURIComponent(c)}`);
    if (!res.ok) { 
      setError((await res.json()).error); 
      return; 
    }
    setResult(await res.json());
  }

  // Tính toán lợi nhuận dự kiến
  const importPrice = Number(result?.importPrice || 0);
  const sellPrice = Number(result?.product?.sellPrice || 0);
  const profit = sellPrice - importPrice;

  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Tra cứu S/N</h2>

      <Card className="p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) lookup(code.trim()); }} className="flex gap-2">
          <Input placeholder="Nhập số serial..." value={code} onChange={(e) => setCode(e.target.value)} />
          <Button type="submit">Tra cứu</Button>
        </form>
        <details>
          <summary className="text-sm text-slate-600 cursor-pointer">Hoặc quét bằng camera</summary>
          <div className="mt-3">
            <BarcodeScanner onScan={lookup} />
          </div>
        </details>
      </Card>

      {error && <Card className="p-4 text-red-600">{error}</Card>}

      {result && (
        <Card className="p-6 space-y-5">
          {/* Thông tin cơ bản */}
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-500">Số Serial (S/N)</p>
              <p className="text-2xl font-bold font-mono">{result.serialNumber}</p>
            </div>
            <Badge variant={result.status === 'IN_STOCK' ? 'secondary' : 'default'} className="text-sm px-3 py-1">
              {STATUS_LABEL[result.status] ?? result.status}
            </Badge>
          </div>

          <div className="border-t pt-4 space-y-2 text-sm">
            <p><span className="text-slate-500">Sản phẩm:</span> <b className="text-base">{result.product.name}</b></p>
            <p><span className="text-slate-500">Mã SKU:</span> <span className="font-mono">{result.product.sku}</span></p>
            <p><span className="text-slate-500">Danh mục:</span> {result.product.category.name} {result.product.brand ? `· ${result.product.brand.name}` : ''}</p>
          </div>

          {/* THÔNG TIN GIÁ VỐN / LỢI NHUẬN */}
          <div className="bg-slate-50 border rounded-lg p-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-slate-500 mb-1">Giá nhập (Vốn)</p>
              <p className="font-semibold text-slate-800">{importPrice.toLocaleString()}đ</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Giá bán (Niêm yết)</p>
              <p className="font-semibold text-slate-800">{sellPrice.toLocaleString()}đ</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Lợi nhuận dự kiến</p>
              <p className={`font-bold ${profit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profit.toLocaleString()}đ
              </p>
            </div>
          </div>

          {/* Lịch sử Nhập kho */}
          {result.purchaseItem && (
            <div className="border-t pt-4 text-sm space-y-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold">Thông tin nhập kho</p>
                <Link href={`/purchase-orders/${result.purchaseItem.purchaseOrder.id}`}>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Xem phiếu nhập
                  </Button>
                </Link>
              </div>
              <p><span className="text-slate-500">Ngày nhập:</span> {result.importedAt ? new Date(result.importedAt).toLocaleString('vi-VN') : '—'}</p>
              <p><span className="text-slate-500">Nhà cung cấp:</span> <b>{result.purchaseItem.purchaseOrder.supplier.name}</b></p>
              <p><span className="text-slate-500">Mã phiếu:</span> <span className="font-mono">{result.purchaseItem.purchaseOrder.code}</span></p>
            </div>
          )}

          {/* Lịch sử Bán hàng */}
          {result.sale && (
            <div className="border-t pt-4 text-sm space-y-2">
              <p className="font-semibold text-blue-600">Thông tin bán ra</p>
              <p><span className="text-slate-500">Ngày bán:</span> {result.soldAt ? new Date(result.soldAt).toLocaleString('vi-VN') : '—'}</p>
              <p><span className="text-slate-500">Khách hàng:</span> {result.sale.customer?.name ?? 'Khách lẻ'}</p>
              {result.sale.customer?.phone && <p><span className="text-slate-500">SĐT:</span> {result.sale.customer.phone}</p>}
              <p><span className="text-slate-500">Mã đơn:</span> <span className="font-mono">{result.sale.code}</span></p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}