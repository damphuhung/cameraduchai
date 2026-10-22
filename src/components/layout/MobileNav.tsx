'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, ShoppingCart, Package, ScanLine, MoreHorizontal } from 'lucide-react';
const items = [
  { href: '/',               label: 'Tổng quan', icon: Home },
  { href: '/sales/new',      label: 'Bán',       icon: ShoppingCart },
  { href: '/products',       label: 'Hàng',      icon: Package },
  { href: '/serials/lookup', label: 'S/N',       icon: ScanLine },
  { href: '/customers',      label: 'Khách',     icon: MoreHorizontal },
];
export function MobileNav() {
  const path = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t flex justify-around h-16">
      {items.map((it) => {
        const active = path === it.href || (it.href !== '/' && path.startsWith(it.href));
        const Icon = it.icon;
        return (
          <Link key={it.href} href={it.href}
            className={cn('flex flex-col items-center justify-center flex-1 text-xs gap-0.5',
              active ? 'text-slate-900 font-semibold' : 'text-slate-500')}>
            <Icon className="h-5 w-5" />{it.label}
          </Link>
        );
      })}
    </nav>
  );
}
