'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

export type ShopSettings = {
  shopName: string;
  address?: string;
  phone?: string;
  taxCode?: string;
  bankId?: string;
  bankAccount?: string;
  bankOwner?: string;
};

const DEFAULT_SETTINGS: ShopSettings = { shopName: 'ERP Cửa hàng' };
const STORAGE_KEY = 'erp:settings:v1';

type Ctx = { settings: ShopSettings; loaded: boolean };
const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false });

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false });
  const fetched = useRef(false);
  const pathname = usePathname();

  useEffect(() => {
    // Không gọi API ở trang đăng nhập (chưa có phiên)
    if (fetched.current || pathname === '/login') return;
    fetched.current = true;

    // Hiện ngay bản đã lưu của lần trước (nếu có), rồi cập nhật bằng bản mới từ server
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) setState({ settings: JSON.parse(cached), loaded: true });
    } catch {}

    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => {
        if (s && s.shopName) {
          setState({ settings: s, loaded: true });
          try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
        }
      })
      .catch(() => {});
  }, [pathname]);

  return <SettingsContext.Provider value={state}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
