"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Factory, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  ChevronRight, Zap, RefreshCcw, BrainCircuit,
} from 'lucide-react';
import { RiskBadge } from '@/components/oic/RiskBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MO {
  id: string;
  orderNumber: string;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  createdAt: string;
  product: { name: string; sku: string };
}

interface WorkCenter {
  workCenter: string;
  capacity: number;
  queueDepth: number;
  queuedMinutes: number;
  availableMinutes: number;
  utilization: number;
  status: string;
}

interface AdvisorRec {
  urgency: string;
  category: string;
  title: string;
  action: string;
  metric: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function token() { return localStorage.getItem('token') ?? ''; }

function authedFetch(url: string) {
  return fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
}

function utilizationColor(pct: number) {
  if (pct > 100) return { bar: 'bg-red-500',    text: 'text-red-600',    card: 'border-red-200 bg-red-50/40' };
  if (pct > 70)  return { bar: 'bg-orange-500', text: 'text-purple-600', card: 'border-orange-200 bg-orange-50/40' };
  if (pct > 40)  return { bar: 'bg-yellow-500', text: 'text-yellow-600', card: 'border-yellow-200 bg-yellow-50/40' };
  return            { bar: 'bg-green-500',   text: 'text-green-600',  card: 'border-green-200 bg-green-50/40' };
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    DRAFT:       'bg-gray-100 text-gray-600',
    PLANNED:     'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    DONE:        'bg-green-100 text-green-700',
    CANCELLED:   'bg-red-100 text-red-600',
  };
  const label: Record<string, string> = {
    DRAFT: 'Draft', PLANNED: 'Planned', IN_PROGRESS: 'In Progress', DONE: 'Done', CANCELLED: 'Cancelled',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManufacturingOverviewPage() {
  const [orders,      setOrders]      = useState<MO[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [advisor,     setAdvisor]     = useState<AdvisorRec[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mosRes, oicRes] = await Promise.all([
        authedFetch(`${API}/manufacturing-orders?limit=20`),
        authedFetch(`${API}/intelligence/overview`),
      ]);
      const [mosJson, oicJson] = await Promise.all([mosRes.json(), oicRes.json()]);

      if (mosJson.success) setOrders(mosJson.data.orders ?? []);
      if (oicJson.success) {
        setWorkCenters(oicJson.data.bottleneck?.workCenters ?? []);
        setAdvisor(
          (oicJson.data.advisor?.recommendations ?? []).filter(
            (r: AdvisorRec) => r.category === 'MANUFACTURING' || r.category === 'PROCUREMENT'
          )
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const open      = orders.filter(o => o.status === 'PLANNED').length;
  const inProg    = orders.filter(o => o.status === 'IN_PROGRESS').length;
  const done      = orders.filter(o => o.status === 'DONE').length;
  const recent    = [...orders]
    .filter(o => o.status !== 'DONE' && o.status !== 'CANCELLED')
    .slice(0, 6);
  const bottlenecks = workCenters.filter(wc => wc.status === 'BOTTLENECK').length;

  const stats = [
    { label: 'Open Orders',       value: open,        icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-100' },
    { label: 'In Progress',       value: inProg,      icon: TrendingUp,    color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
    { label: 'Completed',         value: done,        icon: CheckCircle2,  color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-100' },
    { label: 'Bottleneck Centers',value: bottlenecks, icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-100' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 pb-10 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
        </div>
        <div className="h-56 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Factory className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturing</h1>
            <p className="text-sm text-gray-500">Shiv Furniture Works · Production Overview</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <RefreshCcw className="h-4 w-4" />
          </button>
          <Link
            href="/manufacturing/orders"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-700 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 transition-colors"
          >
            <Factory className="h-4 w-4" />
            + Create MO
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className={`rounded-xl border ${s.border} ${s.bg} p-5`}>
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Work Center Utilization ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">Work Center Utilization</h2>
          </div>
          <Link href="/manufacturing/work-centers" className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="p-5 space-y-4">
          {workCenters.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No work center data available</p>
          )}
          {workCenters.map(wc => {
            const c = utilizationColor(wc.utilization);
            return (
              <div key={wc.workCenter} className={`rounded-lg border p-4 ${c.card}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800 text-sm">{wc.workCenter}</span>
                    <RiskBadge level={wc.status} />
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">{wc.queueDepth} WOs queued</span>
                    <span className={`font-black text-lg ${c.text}`}>{wc.utilization}%</span>
                  </div>
                </div>
                <div className="h-2.5 bg-white/70 rounded-full overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-700 ${c.bar}`}
                    style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                  />
                </div>
                {wc.utilization > 100 && (
                  <p className="text-xs text-red-600 mt-1.5 font-medium">
                    ⚠ {Math.round(wc.queuedMinutes - wc.availableMinutes)} min overflow beyond daily capacity
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Recent Manufacturing Orders ── */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2">
            <Factory className="h-4 w-4 text-orange-500" />
            <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">Active Manufacturing Orders</h2>
          </div>
          <Link href="/manufacturing/orders" className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1">
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No active manufacturing orders</p>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50/50">
                <tr>
                  {['MO Number', 'Product', 'Qty', 'Progress', 'Status', 'Created'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recent.map(mo => {
                  const pct = mo.plannedQuantity > 0
                    ? Math.round((mo.completedQuantity / mo.plannedQuantity) * 100)
                    : 0;
                  return (
                    <tr key={mo.id} className="hover:bg-orange-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/manufacturing-orders/${mo.id}`} className="font-semibold text-purple-600 hover:text-purple-700 text-sm">
                          {mo.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{mo.product.name}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{mo.plannedQuantity}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-20 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-indigo-700 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3"><StatusPill status={mo.status} /></td>
                      <td className="px-5 py-3 text-xs text-gray-400">
                        {new Date(mo.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── AI Insights ── */}
      {advisor.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-orange-100 bg-orange-50/60">
            <BrainCircuit className="h-4 w-4 text-purple-600" />
            <h2 className="font-semibold text-orange-800 text-sm tracking-wide uppercase">AI Insights</h2>
            <span className="ml-auto text-xs text-orange-500">From Intelligence Engine</span>
          </div>
          <div className="divide-y divide-orange-50">
            {advisor.map((rec, i) => (
              <div key={i} className="flex items-start gap-4 px-5 py-4">
                <span className="text-lg mt-0.5">
                  {rec.urgency === 'CRITICAL' ? '🔴' : rec.urgency === 'HIGH' ? '🟠' : '🟡'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{rec.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{rec.action.split('.')[0]}.</p>
                </div>
                <RiskBadge level={rec.urgency} />
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-orange-50/40 border-t border-orange-100">
            <Link href="/manufacturing/intelligence" className="text-xs text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1">
              Full Manufacturing Intelligence <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

    </div>
  );
}
