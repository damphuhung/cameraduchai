'use client';
import { useEffect, useState } from 'react';
import { SidebarContent } from './SidebarContent';

export function Sidebar({ role }: { role: string }) {
  const [shopName, setShopName] = useState('ERP Cửa hàng');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.shopName) setShopName(s.shopName);
    });
  }, []);

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-white h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <span className="text-base font-bold truncate">{shopName}</span>
      </div>
      <SidebarContent role={role} />
    </aside>
  );
}