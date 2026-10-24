'use client';
import { SidebarContent } from './SidebarContent';
import { useSettings } from '@/lib/settings-context';

export function Sidebar({ role }: { role: string }) {
  const { settings } = useSettings();

  return (
    <aside className="hidden lg:flex lg:flex-col w-64 border-r bg-white h-screen sticky top-0 shrink-0">
      <div className="h-16 flex items-center px-6 border-b shrink-0">
        <span className="text-base font-bold truncate">{settings.shopName}</span>
      </div>
      <SidebarContent role={role} />
    </aside>
  );
}
