"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, Zap, Activity, Truck, Factory, Package,
  ShoppingCart, Clock, CheckCircle2, RefreshCcw, ArrowRight,
  TrendingUp, TrendingDown, Shield
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface OICData {
  healthScore: { overall: number; inventory: number; manufacturing: number; procurement: number };
  alerts: Array<{ type: string; severity: string; message: string }>;
  inventoryRisk: {
    components: Array<{ component: string; risk: string; gap: number; available: number; required: number }>;
  };
  procurementForecast: {
    forecast: Array<{ product: string; daysRemaining: number; status: string }>;
  };
  bottleneck: {
    workCenters: Array<{ workCenter: string; utilization: number; status: string; queueDepth: number }>;
  };
  orderRisk: {
    orders: Array<{ orderNumber: string; delayDays: number; riskLevel: string; reason: string }>;
  };
  advisor: { recommendations: Array<{ urgency: string; category: string; action: string; impact: string }> };
}

interface PendingApproval {
  id: string;
  entityNumber: string;
  entityType: string;
  amount: number;
  requestedBy: { name: string };
  createdAt: string;
}

interface ActiveFlow {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string | number;
}

const HEALTH_COLOR = (v: number) =>
  v >= 80 ? 'text-emerald-600' : v >= 60 ? 'text-amber-600' : 'text-red-600';
const HEALTH_BG = (v: number) =>
  v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-amber-500' : 'bg-red-500';

const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: 'border-l-red-500 bg-red-50',
  HIGH:     'border-l-orange-500 bg-orange-50',
  MEDIUM:   'border-l-amber-500 bg-amber-50',
  LOW:      'border-l-blue-500 bg-blue-50',
};

const URGENCY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500',
  HIGH:     'bg-orange-500',
  MEDIUM:   'bg-amber-500',
  LOW:      'bg-blue-500',
};

export default function ControlTowerPage() {
  const [oic, setOic] = useState<OICData | null>(null);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [flows, setFlows] = useState<ActiveFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchAll = useCallback(async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [oicRes, approvalRes, salesRes] = await Promise.all([
        fetch(`${API}/intelligence/overview`, { headers }),
        fetch(`${API}/approvals`, { headers }),
        fetch(`${API}/sales-orders?limit=10`, { headers }),
      ]);

      if (oicRes.ok) {
        const d = await oicRes.json();
        setOic(d.data);
      }
      if (approvalRes.ok) {
        const d = await approvalRes.json();
        setApprovals(d.data ?? []);
      }
      if (salesRes.ok) {
        const d = await salesRes.json();
        setFlows((d.data?.orders ?? d.data ?? []).slice(0, 5));
      }
      setLastUpdated(new Date());
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const health = oic?.healthScore;
  const criticalAlerts = oic?.alerts?.filter(a => ['CRITICAL','HIGH'].includes(a.severity)) ?? [];
  const recommendations = oic?.advisor?.recommendations ?? [];
  const bottlenecks = oic?.bottleneck?.workCenters?.filter(w => w.status === 'BOTTLENECK') ?? [];
  const criticalInventory = oic?.inventoryRisk?.components?.filter(i => ['CRITICAL','HIGH'].includes(i.risk)) ?? [];
  const atRiskOrders = oic?.orderRisk?.orders?.filter(o => ['CRITICAL','HIGH'].includes(o.riskLevel)) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center">
              <Activity className="h-4 w-4 text-white" />
            </span>
            Operations Control Tower
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time operational overview — {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchAll}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" /> Refresh
          </button>
          <Link
            href="/operations-intelligence"
            className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
          >
            <Zap className="h-3.5 w-3.5" /> Intelligence Center
          </Link>
        </div>
      </div>

      {/* Business Health Score */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 animate-pulse">
          <div className="h-4 w-40 bg-slate-200 rounded-full mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      ) : health && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-800">Business Health Score</h2>
            <Link href="/operations-intelligence" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
              Full Report <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Overall',        value: health.overall,       icon: Activity    },
              { label: 'Inventory',      value: health.inventory,     icon: Package     },
              { label: 'Manufacturing',  value: health.manufacturing, icon: Factory     },
              { label: 'Procurement',    value: health.procurement,   icon: Truck       },
            ].map(m => (
              <div key={m.label} className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
                <m.icon className={`h-5 w-5 mx-auto mb-2 ${HEALTH_COLOR(m.value)}`} />
                <p className={`text-3xl font-black ${HEALTH_COLOR(m.value)}`}>{m.value}</p>
                <p className="text-xs text-slate-500 mt-1">{m.label}</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${HEALTH_BG(m.value)}`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2-col grid: Alerts + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Critical Alerts */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" /> Critical Alerts
              {criticalAlerts.length > 0 && (
                <span className="rounded-full bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5">{criticalAlerts.length}</span>
              )}
            </h2>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {loading && [...Array(3)].map((_, i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-xl animate-pulse" />
            ))}
            {!loading && criticalAlerts.length === 0 && (
              <div className="flex flex-col items-center py-8 gap-2 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                <p className="text-sm text-slate-500">No critical alerts</p>
              </div>
            )}
            {!loading && criticalAlerts.map((alert, i) => (
              <div key={i} className={`border-l-4 rounded-r-xl px-3 py-2.5 ${SEVERITY_COLOR[alert.severity] ?? 'border-l-slate-300 bg-slate-50'}`}>
                <p className="text-xs font-semibold text-slate-700">{alert.message}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{alert.type}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" /> AI Recommendations
            </h2>
            <Link href="/operations-intelligence" className="text-xs text-purple-600 hover:underline">View all</Link>
          </div>
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {loading && [...Array(3)].map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-xl animate-pulse" />
            ))}
            {!loading && recommendations.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">All systems nominal.</p>
            )}
            {!loading && recommendations.map((r, i) => (
              <div key={i} className="flex gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${URGENCY_DOT[r.urgency] ?? 'bg-slate-400'}`} />
                <div>
                  <p className="text-xs font-semibold text-slate-700">{r.action}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{r.impact}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3-col: Bottlenecks, Inventory Risks, At-Risk Orders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">

        {/* Bottlenecks */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" /> Bottlenecks
            </h2>
          </div>
          <div className="p-4 space-y-3">
            {!loading && bottlenecks.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">No bottlenecks detected</p>
            )}
            {bottlenecks.map((b, i) => (
              <div key={i} className="rounded-xl bg-orange-50 border border-orange-100 p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold text-slate-700 truncate">{b.workCenter}</p>
                  <span className="text-xs font-bold text-purple-600">{b.utilization.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-orange-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-700 rounded-full" style={{ width: `${Math.min(100, b.utilization)}%` }} />
                </div>
                <p className="text-[10px] text-orange-500 mt-1">Queue: {b.queueDepth} WOs</p>
              </div>
            ))}
          </div>
        </div>

        {/* Inventory Risks */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Package className="h-4 w-4 text-red-500" /> Inventory Risks
            </h2>
          </div>
          <div className="p-4 space-y-2">
            {!loading && criticalInventory.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Inventory looks healthy</p>
            )}
            {criticalInventory.slice(0, 4).map((inv, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <div>
                  <p className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">{inv.component}</p>
                  <p className="text-[10px] text-red-500 mt-0.5">Gap: {inv.gap}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  inv.risk === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-purple-600'
                }`}>{inv.risk}</span>
              </div>
            ))}
          </div>
        </div>

        {/* At-Risk Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Clock className="h-4 w-4 text-red-500" /> At-Risk Orders
            </h2>
          </div>
          <div className="p-4 space-y-2">
            {!loading && atRiskOrders.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-4">Orders on track</p>
            )}
            {atRiskOrders.slice(0, 4).map((o, i) => (
              <div key={i} className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-700">{o.orderNumber}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    o.riskLevel === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-purple-600'
                  }`}>+{o.delayDays}d</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">{o.reason}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {approvals.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-amber-100 bg-amber-50/50">
            <h2 className="font-semibold text-amber-800 flex items-center gap-2">
              <Shield className="h-4 w-4 text-amber-600" /> Pending Approvals
              <span className="rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5">{approvals.length}</span>
            </h2>
            <Link href="/purchase-orders" className="text-xs text-amber-600 hover:underline">Manage</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {approvals.slice(0, 4).map(a => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{a.entityNumber}</p>
                  <p className="text-xs text-slate-400">Requested by {a.requestedBy.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">₹{Number(a.amount).toLocaleString()}</p>
                  <p className="text-[10px] text-amber-600 font-medium mt-0.5">Awaiting approval</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Sales Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-blue-500" /> Recent Orders
          </h2>
          <Link href="/sales-orders" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
            All Orders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-slate-100">
          {loading && [...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
              <div className="h-3 w-24 bg-slate-200 rounded-full" />
              <div className="h-3 w-32 bg-slate-100 rounded-full flex-1" />
              <div className="h-5 w-16 bg-slate-100 rounded-full" />
            </div>
          ))}
          {!loading && flows.map(f => {
            const STATUS_COLOR: Record<string, string> = {
              DRAFT:      'bg-slate-100 text-slate-600',
              CONFIRMED:  'bg-blue-100 text-blue-700',
              IN_PROGRESS:'bg-amber-100 text-amber-700',
              COMPLETED:  'bg-emerald-100 text-emerald-700',
              CANCELLED:  'bg-red-100 text-red-600',
            };
            return (
              <div key={f.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Link href={`/sales-orders/${f.id}`} className="text-sm font-semibold text-purple-600 hover:underline">
                    {f.orderNumber}
                  </Link>
                  <span className="text-xs text-slate-400">{f.customerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-600">₹{Number(f.totalAmount).toLocaleString()}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[f.status] ?? 'bg-slate-100 text-slate-500'}`}>
                    {f.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            );
          })}
          {!loading && flows.length === 0 && (
            <p className="text-center text-slate-400 py-8 text-sm">No orders yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
