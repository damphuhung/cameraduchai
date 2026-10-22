'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { BarcodeScanner } from '@/components/shared/BarcodeScanner';

const STATUS_LABEL: Record<string, string> = { IN_STOCK: 'Trong kho', SOLD: 'Đã bán', RETURNED: 'Đã trả', DEFECTIVE: 'Hỏng' };

export default function SerialLookupPage() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  async function lookup(c: string) {
    setCode(c); setResult(null); setError(null);
    const res = await fetch(`/api/serials/lookup?code=${encodeURIComponent(c)}`);
    if (!res.ok) { setError((await res.json()).error); return; }
    setResult(await res.json());
  }
  return (
    <div className="max-w-2xl space-y-4">
      <h2 className="text-xl font-semibold">Tra cứu S/N</h2>
      <Card className="p-4 space-y-3">
        <form onSubmit={(e) => { e.preventDefault(); if (code.trim()) lookup(code.trim()); }} className="flex gap-2"><Input placeholder="Serial..." value={code} onChange={(e) => setCode(e.target.value)} /></form>
        <details><summary className="text-sm text-slate-600 cursor-pointer">Hoặc quét camera</summary><div className="mt-3"><BarcodeScanner onScan={lookup} /></div></details>
      </Card>
      {error && <Card className="p-4 text-red-600">{error}</Card>}
      {result && (
        <Card className="p-6 space-y-4">
          <div><p className="text-xs text-slate-500">Serial</p><p className="text-2xl font-bold font-mono">{result.serialNumber}</p><Badge className="mt-2">{STATUS_LABEL[result.status] ?? result.status}</Badge></div>
          <div className="border-t pt-4 space-y-1 text-sm"><p><span className="text-slate-500">SP:</span> <b>{result.product.name}</b></p><p><span className="text-slate-500">NCC:</span> {result.purchaseItem?.purchaseOrder.supplier.name}</p></div>
        </Card>
      )}
    </div>
  );
}
