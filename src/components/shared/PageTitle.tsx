'use client';
import { useEffect } from 'react';
import { useSettings } from '@/lib/settings-context';

export function PageTitle() {
  const { settings, loaded } = useSettings();
  useEffect(() => {
    if (loaded && settings.shopName) {
      document.title = `${settings.shopName} | Quản lý bán hàng`;
    }
  }, [loaded, settings.shopName]);
  return null;
}
