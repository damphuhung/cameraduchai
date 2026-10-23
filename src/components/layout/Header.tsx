'use client';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import { MobileMenu } from './MobileMenu';

export function Header({ role }: { role: string }) {
  const { data: session } = useSession();
  
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center min-w-0">
        <MobileMenu role={role} />
        <h1 className="text-base lg:text-lg font-semibold truncate">Quản lý bán hàng</h1>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-sm text-slate-700">
          <UserIcon className="h-4 w-4" />
          <span className="truncate max-w-[100px]">{session?.user?.name}</span>
          <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{role}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
          <LogOut className="h-4 w-4" /><span className="hidden sm:inline ml-1">Đăng xuất</span>
        </Button>
      </div>
    </header>
  );
}