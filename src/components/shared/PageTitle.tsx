'use client';
import { useEffect } from 'react';

export function PageTitle() {
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        if (s.shopName) {
          document.title = `${s.shopName} | Quản lý bán hàng`;
        }
      })
      .catch(() => {});
  }, []);
  return null;
}