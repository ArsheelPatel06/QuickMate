"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, ShoppingCart, Factory, Truck, Package, AlertTriangle, Info } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; dotColor: string }> = {
  SHORTAGE:      { label: 'Shortage Alert',   icon: AlertTriangle, color: 'text-red-600',     bg: 'bg-red-50',     dotColor: 'bg-red-500'     },
  PO_APPROVAL:   { label: 'Approval Request', icon: Truck,         color: 'text-amber-600',   bg: 'bg-amber-50',   dotColor: 'bg-amber-500'   },
  MO_CREATED:    { label: 'MO Created',       icon: Factory,       color: 'text-blue-600',    bg: 'bg-blue-50',    dotColor: 'bg-blue-500'    },
  DELIVERY_READY:{ label: 'Ready to Deliver', icon: Package,       color: 'text-emerald-600', bg: 'bg-emerald-50', dotColor: 'bg-emerald-500' },
  APPROVAL_DONE: { label: 'Approval Update',  icon: CheckCheck,    color: 'text-purple-600',  bg: 'bg-orange-50',  dotColor: 'bg-orange-500'  },
  SYSTEM:        { label: 'System',           icon: Info,          color: 'text-slate-600',   bg: 'bg-slate-50',   dotColor: 'bg-slate-500'   },
};

function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return 'just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(data.data?.notifications ?? []);
      setUnread(data.data?.unreadCount ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    await fetch(`${API}/notifications/read-all`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await fetch(`${API}/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const types = ['ALL', ...Object.keys(TYPE_META)];
  const filtered = filter === 'ALL' ? notifications : notifications.filter(n => n.type === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unread > 0 ? `${unread} unread notification${unread > 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all"
          >
            <CheckCheck className="h-4 w-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {types.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === t
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            {t === 'ALL' ? 'All' : (TYPE_META[t]?.label ?? t)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-slate-100">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4 animate-pulse">
                <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-40 bg-slate-200 rounded-full" />
                  <div className="h-3 w-64 bg-slate-100 rounded-full" />
                  <div className="h-2.5 w-16 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Bell className="h-7 w-7 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm">No notifications here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(n => {
              const meta = TYPE_META[n.type] ?? TYPE_META.SYSTEM;
              const Icon = meta.icon;
              return (
                <div
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex gap-4 px-6 py-4 cursor-pointer transition-all hover:bg-slate-50 ${!n.read ? 'bg-orange-50/40' : ''}`}
                >
                  {/* Icon */}
                  <div className={`h-10 w-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-5 w-5 ${meta.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm ${!n.read ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {!n.read && <span className={`h-2 w-2 rounded-full ${meta.dotColor}`} />}
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.body}</p>
                    <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
