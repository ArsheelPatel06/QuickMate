"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BrainCircuit, RefreshCcw, Package, Zap, Clock, TrendingDown, ArrowRight } from 'lucide-react';
import { RiskBadge } from '@/components/oic/RiskBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComponentRisk {
  component: string; sku: string;
  available: number; required: number; gap: number; coverage: number; risk: string;
}
interface WorkCenter {
  workCenter: string; utilization: number; queueDepth: number;
  queuedMinutes: number; availableMinutes: number; status: string;
}
interface OrderRiskItem {
  orderNumber: string; customer: string; items: string;
  estimatedDaysToDeliver: number; delayDays: number; orderRisk: string; primaryReason: string;
}
interface ForecastItem {
  product: string; sku: string; onHand: number;
  avgDailyConsumption: number; daysRemaining: number | null; status: string;
}
interface AdvisorRec {
  urgency: string; category: string; title: string;
  impact: string; action: string; metric: string;
}
interface OICPayload {
  advisor:             { recommendations: AdvisorRec[] };
  inventoryRisk:       { components: ComponentRisk[] };
  bottleneck:          { workCenters: WorkCenter[] };
  orderRisk:           { orders: OrderRiskItem[] };
  procurementForecast: { forecast: ForecastItem[] };
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor = 'text-gray-600', count, children }: {
  title: string; icon: React.ElementType; iconColor?: string;
  count?: number; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">{title}</h2>
        {count !== undefined && count > 0 && (
          <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">{count}</span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManufacturingIntelligencePage() {
  const [data,    setData]    = useState<OICPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/intelligence/overview`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastRefresh(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading || !data) {
    return (
      <div className="space-y-6 pb-10 animate-pulse">
        <div className="h-8 w-72 bg-gray-200 rounded" />
        {[0,1,2,3].map(i => <div key={i} className="h-40 bg-gray-200 rounded-xl" />)}
      </div>
    );
  }

  const { advisor, inventoryRisk, bottleneck, orderRisk, procurementForecast } = data;

  const criticalComps   = inventoryRisk.components.filter(c => c.risk === 'CRITICAL' || c.risk === 'HIGH');
  const bottleneckWCs   = bottleneck.workCenters.filter(wc => wc.status === 'BOTTLENECK' || wc.status === 'HIGH_LOAD');
  const riskyOrders     = orderRisk.orders.filter(o => o.orderRisk === 'CRITICAL' || o.orderRisk === 'HIGH');
  const criticalForecast = procurementForecast.forecast.filter(f => f.status === 'CRITICAL' || f.status === 'HIGH');

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <BrainCircuit className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <nav className="text-xs text-gray-400 mb-0.5">
              <Link href="/manufacturing" className="hover:text-purple-600">Manufacturing</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-600">Intelligence</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturing Intelligence</h1>
            {lastRefresh && <p className="text-xs text-gray-400 mt-0.5">Updated {lastRefresh.toLocaleTimeString()}</p>}
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Operations Advisor (manufacturing-specific) */}
      {advisor.recommendations.length > 0 && (
        <div className="rounded-xl border border-indigo-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gradient-to-r from-amber-600 to-amber-700 flex items-center gap-3">
            <BrainCircuit className="h-4 w-4 text-white" />
            <span className="font-bold text-white text-sm tracking-wide uppercase">Operations Advisor</span>
            <span className="ml-auto text-xs text-indigo-200">{advisor.recommendations.length} recommendations</span>
          </div>
          <div className="bg-white divide-y divide-gray-100">
            {advisor.recommendations.map((rec, i) => (
              <div key={i} className="px-5 py-4 flex items-start gap-4">
                <div className={`shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-black ${
                  rec.urgency === 'CRITICAL' ? 'bg-red-500' : rec.urgency === 'HIGH' ? 'bg-orange-500' : 'bg-yellow-500'
                }`}>{i + 1}</div>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={rec.urgency} />
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">{rec.category}</span>
                    <span className="font-semibold text-gray-900 text-sm">{rec.title}</span>
                  </div>
                  <p className="text-xs text-gray-500">{rec.impact}</p>
                  <div className="flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                    <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-800 font-medium">{rec.action}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-gray-500 font-mono">{rec.metric}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Inventory Risks */}
        <Section title="Inventory Risks" icon={Package} iconColor="text-red-500" count={criticalComps.length}>
          {criticalComps.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">All components adequately stocked</p>
          ) : (
            <div className="space-y-3">
              {criticalComps.map(c => (
                <div key={c.sku} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{c.component}</p>
                    <p className="text-xs text-gray-400">{c.available} available / {c.required} required · gap: {c.gap}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RiskBadge level={c.risk} />
                    <span className="text-xs text-gray-400">{c.coverage}% coverage</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Bottlenecks */}
        <Section title="Work Center Bottlenecks" icon={Zap} iconColor="text-yellow-500" count={bottleneckWCs.length}>
          {bottleneckWCs.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">All work centers within capacity</p>
          ) : (
            <div className="space-y-3">
              {bottleneckWCs.map(wc => (
                <div key={wc.workCenter}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-800">{wc.workCenter}</span>
                      <RiskBadge level={wc.status} />
                    </div>
                    <span className={`text-sm font-black ${wc.utilization > 100 ? 'text-red-600' : 'text-purple-600'}`}>
                      {wc.utilization}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${wc.utilization > 100 ? 'bg-red-500' : 'bg-orange-500'}`}
                      style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{wc.queueDepth} work orders · {Math.round(wc.queuedMinutes / 60)}h queued</p>
                </div>
              ))}
            </div>
          )}
          <Link href="/manufacturing/capacity" className="text-xs text-purple-600 font-semibold hover:text-purple-700 flex items-center gap-1 mt-4">
            Capacity Planning <ArrowRight className="h-3 w-3" />
          </Link>
        </Section>

        {/* At-Risk Orders */}
        <Section title="At-Risk Orders" icon={Clock} iconColor="text-purple-500" count={riskyOrders.length}>
          {riskyOrders.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No at-risk orders</p>
          ) : (
            <div className="space-y-3">
              {riskyOrders.slice(0, 4).map(o => (
                <div key={o.orderNumber} className={`rounded-lg p-3 border ${
                  o.orderRisk === 'CRITICAL' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-semibold text-sm text-gray-900">{o.orderNumber}</span>
                      <span className="text-xs text-gray-500 ml-2">{o.customer}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {o.delayDays > 0 && <span className="text-xs font-bold text-red-600">+{o.delayDays}d</span>}
                      <RiskBadge level={o.orderRisk} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{o.primaryReason}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Procurement Forecast */}
        <Section title="Procurement Forecast" icon={TrendingDown} iconColor="text-orange-500" count={criticalForecast.length}>
          {criticalForecast.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No critical procurement items</p>
          ) : (
            <div className="space-y-3">
              {criticalForecast.map(f => (
                <div key={f.sku} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-gray-800 truncate">{f.product}</p>
                    <p className="text-xs text-gray-400">
                      {f.onHand} on hand · {f.avgDailyConsumption}/day
                      {f.daysRemaining !== null && ` · ${f.daysRemaining}d remaining`}
                    </p>
                  </div>
                  <RiskBadge level={f.status} />
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      {/* Footer link to full OIC */}
      <div className="flex justify-center">
        <Link
          href="/operations-intelligence"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-semibold hover:bg-indigo-100 transition-colors"
        >
          <BrainCircuit className="h-4 w-4" />
          View Full Operations Intelligence Center
        </Link>
      </div>

    </div>
  );
}
