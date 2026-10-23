'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Truck, ScanLine,
  BarChart3, Settings, Building2, ReceiptText, Cog, ShieldCheck, FileSpreadsheet, History, Database,
} from 'lucide-react';

const menu = [
  { href: '/',                label: 'Tổng quan',  icon: LayoutDashboard },
  { href: '/sales/new',       label: 'Bán hàng',   icon: ShoppingCart },
  { href: '/sales',           label: 'Đơn hàng',   icon: ReceiptText },
  { href: '/products',        label: 'Sản phẩm',   icon: Package },
  { href: '/purchase-orders', label: 'Nhập kho',   icon: Truck },
  { href: '/suppliers',       label: 'NCC',     icon: Building2 },
  { href: '/customers',       label: 'Khách hàng', icon: Users },
  { href: '/warranty',        label: 'Bảo hành',   icon: ShieldCheck },
  { href: '/serials/lookup',  label: 'Tra S/N',    icon: ScanLine },
  { href: '/import-export',   label: 'Excel',      icon: FileSpreadsheet, roles: ['ADMIN', 'MANAGER'] },
  { href: '/settings',        label: 'Cấu hình',   icon: Cog,             roles: ['ADMIN'] },
  { href: '/reports',         label: 'Báo cáo',    icon: BarChart3,       roles: ['ADMIN', 'MANAGER'] },
  { href: '/audit-log',       label: 'Nhật ký',    icon: History,         roles: ['ADMIN'] },
  { href: '/backup',          label: 'Backup',     icon: Database,        roles: ['ADMIN'] },
  { href: '/users',           label: 'Nhân viên',  icon: Settings,        roles: ['ADMIN'] },
];

export function SidebarContent({ role, onItemClick }: { role: string; onItemClick?: () => void }) {
  const path = usePathname();
  const visible = menu.filter((m) => !m.roles || m.roles.includes(role));

  return (
    <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
      {visible.map((m) => {
        const active = path === m.href || (m.href !== '/' && path.startsWith(m.href));
        const Icon = m.icon;
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
              active ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{m.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}