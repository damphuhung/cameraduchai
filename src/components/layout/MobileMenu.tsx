'use client';
import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from './SidebarContent';
import { useSettings } from '@/lib/settings-context';

export function MobileMenu({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Dùng thẻ div/button thuần của SheetTrigger để tránh lồng nút */}
      <SheetTrigger className="lg:hidden mr-2 -ml-2 inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 h-10 w-10">
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      
      <SheetContent side="left" className="p-0 w-64 flex flex-col">
        <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
        
        <div className="h-16 flex items-center px-6 border-b shrink-0">
          <span className="text-base font-bold truncate">{settings.shopName}</span>
        </div>
        
        <SidebarContent role={role} onItemClick={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
