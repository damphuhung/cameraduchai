'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, ScanLine, History, Database,
  BarChart3, Settings, Building2, ReceiptText, Cog, ShieldCheck, FileSpreadsheet,
} from 'lucide-react';

const menu = [
  { href: '/',                label: 'Tổng quan',  icon: LayoutDashboard },
  { href: '/sales/new',       label: 'Bán hàng',   icon: ShoppingCart },
  { href: '/sales',           label: 'Đơn hàng',   icon: ReceiptText },
  { href: '/products',        label: 'Sản phẩm',   icon: Package },
  { href: '/purchase-orders', label: 'Quản lý Kho',   icon: Truck },
  { href: '/suppliers',       label: 'Nhà Cung Cấp',     icon: Building2 },
  { href: '/customers',       label: 'Khách hàng', icon: Users },
  { href: '/warranty',        label: 'Bảo hành',   icon: ShieldCheck },
  { href: '/serials/lookup',  label: 'Tra cứu S/N',    icon: ScanLine },
  { href: '/import-export',   label: 'Export/Import',      icon: FileSpreadsheet, roles: ['ADMIN', 'MANAGER'] },
  { href: '/settings',        label: 'Cấu hình',   icon: Cog,             roles: ['ADMIN'] },
  { href: '/reports',         label: 'Báo cáo',    icon: BarChart3,       roles: ['ADMIN', 'MANAGER'] },
  { href: '/backup',          label: 'Backup/Restore',     icon: Database,        roles: ['ADMIN'] },
  { href: '/audit-log',       label: 'Nhật ký',    icon: History,         roles: ['ADMIN'] },
  { href: '/users',           label: 'Quản lý Nhân viên',  icon: Settings,        roles: ['ADMIN'] },
];

export function Sidebar({ role }: { role: string }) {
  const path = usePathname();
  const [shopName, setShopName] = useState('CAMERA ĐỨC HẢI - Trang Quản lý bán hàng');

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(s => {
      if (s.shopName) setShopName(s.shopName);
    });
  }, []);
  const visible = menu.filter((m: any) => !m.roles || m.roles.includes(role));

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-white h-screen sticky top-0">
      <div className="h-16 flex items-center px-6 border-b">
        <span className="text-base font-bold truncate">{shopName}</span>
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {visible.map((m: any) => {
          const active = path === m.href || (m.href !== '/' && path.startsWith(m.href));
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium',
                active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
              )}
            >
              <Icon className="h-4 w-4" />
              {m.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
