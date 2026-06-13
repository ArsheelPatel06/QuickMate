"use client";

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Menu, Bell, Search, LogOut, User, ChevronDown } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const TYPE_DOT: Record<string, string> = {
  SHORTAGE:      'bg-red-500',
  PO_APPROVAL:   'bg-amber-500',
  MO_CREATED:    'bg-orange-500',
  DELIVERY_READY:'bg-emerald-500',
  APPROVAL_DONE: 'bg-teal-500',
  SYSTEM:        'bg-slate-400',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:         'Super Admin',
  OWNER:         'Owner',
  SALES:         'Sales Manager',
  PURCHASE:      'Purchase Manager',
  MANUFACTURING: 'Manufacturing Manager',
  INVENTORY:     'Inventory Manager',
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function Header({ toggleSidebar }: HeaderProps) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [showBell, setShowBell] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Load current user from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const fetchNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setUnread(data.data?.unreadCount ?? 0);
    } catch {}
  };

  const markAllRead = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`${API}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifications();
  };

  const handleLogout = async () => {
    try {
      // Dynamic import avoids SSR issues
      const { firebaseLogout } = await import('@/lib/firebase');
      await firebaseLogout();
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
    }
    window.location.href = '/login';
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowBell(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setShowUser(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const displayName = currentUser?.name ?? 'User';
  const displayEmail = currentUser?.email ?? '';
  const displayRole  = ROLE_LABEL[currentUser?.role ?? ''] ?? currentUser?.role ?? '';
  const avatarText   = initials(displayName);

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">

      <button
        type="button"
        className="-m-2.5 p-2.5 text-slate-600 hover:text-slate-900 lg:hidden"
        onClick={toggleSidebar}
      >
        <Menu className="h-6 w-6" />
      </button>

      <div className="h-6 w-px bg-slate-200 lg:hidden" />

      <div className="flex flex-1 gap-x-4 self-stretch items-center justify-between">

        {/* Search */}
        <div className="flex flex-1 max-w-lg">
          <div className="relative flex w-full items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
            <input
              className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 transition-colors"
              placeholder="Search orders, products, logs…"
              type="search"
            />
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-x-3">

          {/* Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => { setShowBell(v => !v); if (!showBell && unread > 0) markAllRead(); }}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showBell && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <p className="font-semibold text-slate-800 text-sm">Notifications</p>
                  <Link href="/notifications" onClick={() => setShowBell(false)} className="text-xs text-purple-600 hover:underline font-medium">
                    View all
                  </Link>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {notifications.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-8">All caught up!</p>
                  )}
                  {notifications.slice(0, 6).map(n => (
                    <div key={n.id} className={`flex gap-3 px-4 py-3 hover:bg-slate-50 transition-colors ${!n.read ? 'bg-amber-50/40' : ''}`}>
                      <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${TYPE_DOT[n.type] ?? 'bg-slate-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{n.body}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-slate-200" />

          {/* User menu */}
          <div className="relative" ref={userRef}>
            <button
              onClick={() => setShowUser(v => !v)}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition-all"
            >
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center text-white shadow-sm shrink-0">
                <span className="text-xs font-bold">{avatarText}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-slate-700 leading-none">{displayName}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{displayRole}</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {showUser && (
              <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="px-4 py-3 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">{displayName}</p>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{displayEmail}</p>
                  {displayRole && (
                    <span className="mt-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{displayRole}</span>
                  )}
                </div>
                <Link
                  href="/user-management"
                  onClick={() => setShowUser(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User className="h-4 w-4" /> Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
