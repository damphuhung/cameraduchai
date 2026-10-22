'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Camera, Keyboard, X } from 'lucide-react';

interface Props {
  onScan: (code: string) => void;
  autoStart?: boolean;
}

export function BarcodeScanner({ onScan, autoStart = false }: Props) {
  const [mode, setMode] = useState<'camera' | 'manual'>(autoStart ? 'camera' : 'camera');
  const [manual, setManual] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const scannerRef = useRef<any>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  useEffect(() => {
    if (mode !== 'camera') return;
    let cancelled = false;

    (async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        if (cancelled) return;

        const scanner = new Html5Qrcode('barcode-reader', {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 160 } },
          (decoded) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (last && last.code === decoded && now - last.at < 1500) return;
            lastScanRef.current = { code: decoded, at: now };
            onScan(decoded);
          },
          () => {},
        );
        if (!cancelled) setReady(true);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'Không mở được camera');
      }
    })();

    return () => {
      cancelled = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => s.clear());
        scannerRef.current = null;
      }
    };
  }, [mode, onScan]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button type="button" size="sm" variant={mode === 'camera' ? 'default' : 'outline'} onClick={() => setMode('camera')}>
          <Camera className="mr-1 h-4 w-4" /> Camera
        </Button>
        <Button type="button" size="sm" variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>
          <Keyboard className="mr-1 h-4 w-4" /> Nhập tay
        </Button>
      </div>
      {mode === 'camera' ? (
        <div>
          <div id="barcode-reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[200px]" />
          {!ready && !error && <p className="text-sm text-slate-500 mt-2">Đang khởi động camera...</p>}
          {error && <p className="text-sm text-red-600 mt-2 flex items-center gap-1"><X className="h-4 w-4" /> {error}</p>}
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); const v = manual.trim(); if (!v) return; onScan(v); setManual(''); }} className="flex gap-2">
          <Input autoFocus placeholder="Nhập số serial / mã vạch..." value={manual} onChange={(e) => setManual(e.target.value)} />
          <Button type="submit">OK</Button>
        </form>
      )}
    </div>
  );
}
