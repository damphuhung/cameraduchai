'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Download, Upload, FileJson, FileSpreadsheet, CheckCircle2, Database } from 'lucide-react';
import * as XLSX from 'xlsx';

const TABLE_LABEL: Record<string, string> = {
  settings: 'Cấu hình',
  users: 'Nhân viên',
  categories: 'Danh mục',
  brands: 'Thương hiệu',
  suppliers: 'Nhà cung cấp',
  customers: 'Khách hàng',
  products: 'Sản phẩm',
  purchaseOrders: 'Phiếu nhập',
  purchaseItems: 'Chi tiết nhập',
  sales: 'Đơn bán',
  saleItems: 'Chi tiết bán',
  productSerials: 'Serial',
  warranties: 'Phiếu BH',
  warrantyClaims: 'Lịch sử BH',
  auditLogs: 'Nhật ký',
};

export default function BackupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [backup, setBackup] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Restore state
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (status === 'authenticated' && session.user.role !== 'ADMIN') router.push('/');
  }, [status, session, router]);

  async function loadBackup() {
    setLoading(true);
    const r = await fetch('/api/backup/export');
    setLoading(false);
    if (!r.ok) { alert((await r.json()).error); return; }
    setBackup(await r.json());
  }

  function downloadJSON() {
    if (!backup) return;
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-erp-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadExcel() {
    if (!backup) return;
    const wb = XLSX.utils.book_new();
    for (const [tableName, rows] of Object.entries(backup.tables as Record<string, any[]>)) {
      if (!rows || rows.length === 0) continue;
      // Flatten dates to string for readability
      const flatRows = rows.map((r) => {
        const out: any = {};
        for (const [k, v] of Object.entries(r)) {
          if (v === null || v === undefined) out[k] = '';
          else if (typeof v === 'object') out[k] = JSON.stringify(v);
          else out[k] = v;
        }
        return out;
      });
      const ws = XLSX.utils.json_to_sheet(flatRows);
      // Sheet name max 31 chars
      const sheetName = (TABLE_LABEL[tableName] ?? tableName).slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    XLSX.writeFile(wb, `backup-erp-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setParsed(null);
    setParseError(null);
    setResult(null);
    setConfirmText('');
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (!json.tables) throw new Error('Thiếu trường "tables"');
      if (json.version !== '1.0') {
        // Cho phép nhưng cảnh báo
        console.warn('Unknown backup version:', json.version);
      }
      setParsed(json);
    } catch (err: any) {
      setParseError(err.message);
    }
  }

  async function doRestore() {
    if (!parsed) return;
    if (mode === 'replace' && confirmText !== 'RESTORE') {
      alert('Vui lòng gõ chính xác "RESTORE" để xác nhận');
      return;
    }
    if (!confirm(mode === 'replace'
      ? '⚠️ THAY THẾ toàn bộ dữ liệu hiện tại? Không thể hoàn tác!'
      : 'Hợp nhất dữ liệu từ backup vào DB hiện tại?')) return;

    setRestoring(true);
    setResult(null);
    const r = await fetch('/api/backup/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup: parsed, mode }),
    });
    setRestoring(false);
    const data = await r.json();
    if (!r.ok) { alert(data.error); return; }
    setResult(data);
  }

  if (status === 'loading' || (session && session.user.role !== 'ADMIN')) {
    return <p className="text-slate-500">Đang kiểm tra quyền...</p>;
  }

  const sizeMB = file ? (file.size / (1024 * 1024)).toFixed(2) : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-xl font-semibold">Backup & Restore</h2>

      {/* ─── BACKUP ─── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold">Sao lưu dữ liệu</h3>
        </div>
        <p className="text-sm text-slate-600">
          Xuất toàn bộ dữ liệu ra file để lưu trữ. Nên backup <b>mỗi tuần</b> hoặc trước khi restore.
        </p>

        {!backup && (
          <Button onClick={loadBackup} disabled={loading}>
            {loading ? 'Đang tải...' : 'Tải dữ liệu'}
          </Button>
        )}

        {backup && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(backup.counts).map(([k, v]) => (
                <div key={k} className="border rounded p-2 text-center">
                  <p className="text-xs text-slate-500">{TABLE_LABEL[k] ?? k}</p>
                  <p className="text-lg font-bold">{v as number}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 flex-wrap pt-2 border-t">
              <Button onClick={downloadJSON}>
                <FileJson className="h-4 w-4 mr-1" /> Tải JSON (dùng để restore)
              </Button>
              <Button variant="outline" onClick={downloadExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Tải Excel (để xem)
              </Button>
              <Button variant="ghost" onClick={loadBackup} disabled={loading}>
                Tải lại
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              File JSON: <b>{backup.totalRecords}</b> bản ghi · Xuất lúc {new Date(backup.exportedAt).toLocaleString('vi-VN')} bởi {backup.exportedBy}
            </p>
          </>
        )}
      </Card>

      {/* ─── RESTORE ─── */}
      <Card className="p-4 space-y-3 border-2 border-red-200">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <h3 className="font-semibold text-red-700">Phục hồi từ backup</h3>
        </div>
        <p className="text-sm text-slate-600">
          Upload file JSON đã backup để phục hồi dữ liệu.
        </p>

        <div>
          <Label>Chọn file JSON</Label>
          <Input type="file" accept=".json" onChange={onFileSelect} />
          {file && <p className="text-xs text-slate-500 mt-1">{file.name} — {sizeMB} MB</p>}
          {parseError && <p className="text-sm text-red-600 mt-1">❌ {parseError}</p>}
        </div>

        {parsed && (
          <>
            <div className="border rounded p-3 bg-slate-50 space-y-1">
              <p className="text-sm"><b>File backup:</b></p>
              <p className="text-xs">Version: {parsed.version} · Xuất lúc: {new Date(parsed.exportedAt).toLocaleString('vi-VN')}</p>
              <p className="text-xs">Bởi: {parsed.exportedBy}</p>
              <p className="text-xs">Tổng cộng: <b>{parsed.totalRecords}</b> bản ghi</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {Object.entries(parsed.counts ?? {}).map(([k, v]) => (
                  <Badge key={k} variant="outline" className="text-xs">
                    {TABLE_LABEL[k] ?? k}: {v as number}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label>Chế độ phục hồi</Label>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => { setMode('merge'); setConfirmText(''); }}
                  className={`flex-1 p-3 border-2 rounded text-left ${mode === 'merge' ? 'border-green-500 bg-green-50' : 'border-slate-200'}`}
                >
                  <p className="font-medium text-sm">🔀 Hợp nhất (An toàn)</p>
                  <p className="text-xs text-slate-600 mt-1">Chỉ thêm record chưa có. Không xoá gì hiện tại.</p>
                </button>
                <button
                  onClick={() => setMode('replace')}
                  className={`flex-1 p-3 border-2 rounded text-left ${mode === 'replace' ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}
                >
                  <p className="font-medium text-sm text-red-700">⚠️ Thay thế (Nguy hiểm)</p>
                  <p className="text-xs text-slate-600 mt-1">Xoá sạch DB hiện tại, sau đó phục hồi từ file.</p>
                </button>
              </div>
            </div>

            {mode === 'replace' && (
              <div className="border-2 border-red-400 rounded p-3 bg-red-50 space-y-2">
                <p className="text-sm text-red-700 font-medium">
                  ⚠️ Toàn bộ dữ liệu hiện tại sẽ bị XOÁ VĨNH VIỄN và thay bằng dữ liệu trong file backup.
                </p>
                <p className="text-xs text-red-700">
                  Gõ <b>RESTORE</b> vào ô dưới để xác nhận:
                </p>
                <Input
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESTORE"
                  className="font-mono"
                />
              </div>
            )}

            <Button
              onClick={doRestore}
              disabled={restoring || (mode === 'replace' && confirmText !== 'RESTORE')}
              className="w-full"
              variant={mode === 'replace' ? 'destructive' : 'default'}
              size="lg"
            >
              <Upload className="h-4 w-4 mr-1" />
              {restoring ? 'Đang phục hồi...' : mode === 'replace' ? 'THAY THẾ TOÀN BỘ' : 'Hợp nhất dữ liệu'}
            </Button>
          </>
        )}

        {result && (
          <Card className="p-3 bg-green-50 border-green-300">
            <div className="flex items-center gap-2 text-green-700 font-medium">
              <CheckCircle2 className="h-5 w-5" /> Phục hồi thành công ({result.mode})
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              {Object.entries(result.inserted).map(([k, v]) => (
                <div key={k} className="border rounded p-1.5 bg-white">
                  <p className="text-slate-500">{TABLE_LABEL[k] ?? k}</p>
                  <p className="font-bold">{v as number}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
          </Card>
        )}
      </Card>

      {/* ─── TIPS ─── */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-sm mb-2">💡 Gợi ý backup định kỳ</h3>
        <ul className="text-sm text-slate-700 space-y-1 list-disc pl-5">
          <li><b>Hàng tuần</b>: vào trang này, tải file JSON, lưu vào Google Drive / máy tính</li>
          <li><b>Trước khi nâng cấp</b>: luôn backup trước khi deploy version mới</li>
          <li><b>Lưu trữ 3 nơi</b>: máy tính + Google Drive + USB (nguyên tắc 3-2-1)</li>
          <li><b>Đặt tên file có ngày</b>: hệ thống đã tự đặt tên kèm timestamp</li>
          <li>Excel chỉ để <b>xem</b>, không dùng để restore — luôn dùng file JSON</li>
        </ul>
      </Card>
    </div>
  );
}
