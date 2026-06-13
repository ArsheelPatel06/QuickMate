"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { auth, isConfigured, onAuthStateChanged } from '@/lib/firebase';

// Pages that don't need the shell (sidebar + header)
const AUTH_ROUTES = ['/login', '/signup'];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [checked, setChecked] = useState(false);

  const isAuthPage = AUTH_ROUTES.some(r => pathname?.startsWith(r));

  useEffect(() => {
    if (isAuthPage) { setChecked(true); return; }

    if (isConfigured && auth) {
      // Firebase mode: wait for auth state, keep token fresh
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (!firebaseUser) {
          router.replace('/login');
        } else {
          const freshToken = await firebaseUser.getIdToken();
          localStorage.setItem('token', freshToken);
          setChecked(true);
        }
      });
      return () => unsub();
    } else {
      // Legacy JWT mode
      const token = localStorage.getItem('token');
      if (!token) { router.replace('/login'); } else { setChecked(true); }
    }
  }, [pathname, isAuthPage, router]);

  // Auth pages — render without any chrome
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Protected pages — wait for auth check before rendering to avoid flash
  if (!checked) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center animate-pulse">
            <span className="text-white font-black text-lg">Q</span>
          </div>
          <p className="text-indigo-400 text-sm">Loading QuickMate…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar
        isOpen={isMobileSidebarOpen}
        isCollapsed={isSidebarCollapsed}
        toggleCollapse={() => setSidebarCollapsed(c => !c)}
        closeMobileSidebar={() => setMobileSidebarOpen(false)}
      />
      <div className={`transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64'}`}>
        <Header toggleSidebar={() => setMobileSidebarOpen(true)} />
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
