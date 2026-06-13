"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from 'recharts';
import {
  Activity, AlertTriangle, TrendingDown, Zap, Package,
  RefreshCcw, CheckCircle2, Clock, AlertCircle, Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { RiskBadge } from '@/components/oic/RiskBadge';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Alert {
  level: 'CRITICAL' | 'HIGH' | string;
  engine: string;
  message: string;
}

interface HealthScore {
  overall: number;
  signal: string;
  breakdown: { inventoryHealth: number; manufacturingHealth: number; procurementHealth: number };
}

interface ComponentRisk {
  component: string; sku: string;
  available: number; required: number; gap: number; coverage: number; risk: string;
}

interface ForecastItem {
  product: string; sku: string;
  onHand: number; avgDailyConsumption: number; daysRemaining: number | null; status: string;
}

interface WorkCenterData {
  workCenter: string; capacity: number;
  queueDepth: number; utilization: number; status: string;
}

interface OrderRiskItem {
  orderNumber: string; customer: string; items: string;
  promisedDate: string; delayDays: number; orderRisk: string; primaryReason: string;
}

interface AdvisorRecommendation {
  urgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'PROCUREMENT' | 'MANUFACTURING' | 'SALES' | 'INVENTORY' | 'OPERATIONS';
  title: string;
  impact: string;
  action: string;
  metric: string;
  relatedEntities: string[];
}

interface AdvisorData {
  generatedAt: string;
  totalRecommendations: number;
  recommendations: AdvisorRecommendation[];
}

interface OICData {
  advisor: AdvisorData;
  healthScore: HealthScore;
  alerts: Alert[];
  inventoryRisk: { summary: Record<string, number>; components: ComponentRisk[] };
  procurementForecast: { summary: Record<string, number>; forecast: ForecastItem[] };
  bottleneck: { summary: Record<string, number>; workCenters: WorkCenterData[] };
  orderRisk: { summary: Record<string, number>; orders: OrderRiskItem[] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 80) return 'text-green-600';
  if (score >= 65) return 'text-yellow-600';
  return 'text-red-600';
}

function scoreRingColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 65) return '#ca8a04';
  return '#dc2626';
}

function riskBarColor(risk: string) {
  return risk === 'CRITICAL' ? '#ef4444'
       : risk === 'HIGH'     ? '#f97316'
       : risk === 'MEDIUM'   ? '#eab308'
       : '#22c55e';
}

function forecastBarColor(status: string) {
  return status === 'CRITICAL' ? '#ef4444'
       : status === 'HIGH'     ? '#f97316'
       : status === 'MEDIUM'   ? '#eab308'
       : '#22c55e';
}

function utilizationBarColor(pct: number) {
  if (pct > 100) return 'bg-red-500';
  if (pct > 70)  return 'bg-orange-500';
  if (pct > 40)  return 'bg-yellow-500';
  return 'bg-green-500';
}

// ─── Health Score Gauge (SVG arc) ────────────────────────────────────────────

function HealthGauge({ score, breakdown }: { score: number; breakdown: HealthScore['breakdown'] }) {
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circumference = Math.PI * r;          // half-circle arc
  const filled = (score / 100) * circumference;
  const color = scoreRingColor(score);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg width="140" height="80" viewBox="0 0 140 85">
          {/* Track */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round"
          />
          {/* Filled arc */}
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${filled} ${circumference}`}
            style={{ transition: 'stroke-dasharray 0.8s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className={`text-4xl font-black ${scoreColor(score)}`}>{score}</span>
          <span className="text-xs text-gray-400 font-medium">/ 100</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 w-full text-center">
        {[
          { label: 'Inventory', value: breakdown.inventoryHealth },
          { label: 'Manufacturing', value: breakdown.manufacturingHealth },
          { label: 'Procurement', value: breakdown.procurementHealth },
        ].map(({ label, value }) => (
          <div key={label} className="flex flex-col items-center">
            <span className={`text-lg font-bold ${scoreColor(value)}`}>{value}</span>
            <span className="text-xs text-gray-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section Card wrapper ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, iconColor = 'text-gray-600', children }: {
  title: string; icon: React.ElementType; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Critical Alerts ─────────────────────────────────────────────────────────

function CriticalAlerts({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600 py-2">
        <CheckCircle2 className="h-5 w-5" />
        <span className="font-medium text-sm">All systems operating normally</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert, i) => (
        <div key={i} className={`flex items-start gap-3 rounded-lg px-4 py-3 ${
          alert.level === 'CRITICAL' ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'
        }`}>
          <span className="text-lg leading-none mt-0.5">
            {alert.level === 'CRITICAL' ? '🔴' : '🟠'}
          </span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${alert.level === 'CRITICAL' ? 'text-red-800' : 'text-orange-800'}`}>
              {alert.message}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">{alert.engine} engine</p>
          </div>
          <RiskBadge level={alert.level} />
        </div>
      ))}
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}{p.name === 'Coverage' ? '%' : p.name === 'Days Left' ? ' days' : ''}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Operations Advisor ──────────────────────────────────────────────────────

const URGENCY_STYLES: Record<string, { badge: string; border: string; numBg: string }> = {
  CRITICAL: { badge: 'bg-red-100 text-red-700 border border-red-200',     border: 'border-red-200',    numBg: 'bg-red-500' },
  HIGH:     { badge: 'bg-orange-100 text-purple-700 border border-orange-200', border: 'border-orange-200', numBg: 'bg-orange-500' },
  MEDIUM:   { badge: 'bg-yellow-100 text-yellow-700 border border-yellow-200', border: 'border-yellow-200', numBg: 'bg-yellow-500' },
  LOW:      { badge: 'bg-green-100 text-green-700 border border-green-200',   border: 'border-gray-200',   numBg: 'bg-green-500' },
};

const CATEGORY_STYLES: Record<string, string> = {
  PROCUREMENT:   'bg-blue-50 text-blue-700 border border-blue-200',
  MANUFACTURING: 'bg-purple-50 text-purple-700 border border-purple-200',
  SALES:         'bg-emerald-50 text-emerald-700 border border-emerald-200',
  INVENTORY:     'bg-orange-50 text-purple-700 border border-orange-200',
  OPERATIONS:    'bg-gray-100 text-gray-600 border border-gray-200',
};

function OperationsAdvisor({ advisor }: { advisor: AdvisorData }) {
  if (!advisor?.recommendations?.length) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-indigo-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-amber-600 to-amber-700">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center">
            <Lightbulb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm tracking-wide uppercase">Operations Advisor</h2>
            <p className="text-indigo-200 text-xs mt-0.5">Today&apos;s Priority Actions — {advisor.totalRecommendations} recommendation{advisor.totalRecommendations !== 1 ? 's' : ''} generated</p>
          </div>
        </div>
        <span className="rounded-full bg-white/20 text-white text-xs font-bold px-3 py-1 border border-white/30">
          AI-powered
        </span>
      </div>

      {/* Recommendations list */}
      <div className="bg-white divide-y divide-gray-100">
        {advisor.recommendations.map((rec, i) => {
          const u = URGENCY_STYLES[rec.urgency] ?? URGENCY_STYLES.LOW;
          const catStyle = CATEGORY_STYLES[rec.category] ?? CATEGORY_STYLES.OPERATIONS;

          return (
            <div key={i} className={`p-5 flex gap-4 items-start hover:bg-gray-50/50 transition-colors`}>
              {/* Priority number */}
              <div className={`shrink-0 h-8 w-8 rounded-full ${u.numBg} flex items-center justify-center`}>
                <span className="text-white text-sm font-black">{i + 1}</span>
              </div>

              {/* Body */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title row */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${u.badge}`}>
                    {rec.urgency}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${catStyle}`}>
                    {rec.category}
                  </span>
                  <span className="font-semibold text-gray-900 text-sm">{rec.title}</span>
                </div>

                {/* Impact */}
                <p className="text-xs text-gray-500 leading-relaxed">{rec.impact}</p>

                {/* Recommended action — indigo callout */}
                <div className="flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-800 font-medium leading-relaxed">{rec.action}</p>
                </div>
              </div>

              {/* Metric pill */}
              <div className={`shrink-0 rounded-lg px-3 py-2 text-center border ${u.border} bg-white`}>
                <span className={`text-xs font-bold block ${
                  rec.urgency === 'CRITICAL' ? 'text-red-600'
                  : rec.urgency === 'HIGH'   ? 'text-purple-600'
                  : rec.urgency === 'MEDIUM' ? 'text-yellow-600'
                  : 'text-green-600'
                }`}>{rec.metric}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function SkeletonBlock({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />;
}

function OICSkeleton() {
  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-72" />
          <SkeletonBlock className="h-4 w-48" />
        </div>
        <SkeletonBlock className="h-9 w-24 rounded-lg" />
      </div>

      {/* Advisor skeleton */}
      <SkeletonBlock className="h-56 rounded-xl" />

      {/* Row 1: Health + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-xl border border-gray-200 p-5 space-y-4">
          <SkeletonBlock className="h-4 w-36" />
          <SkeletonBlock className="h-20 w-full rounded-full mx-auto" />
          <div className="grid grid-cols-3 gap-2">
            {[0,1,2].map(i => <SkeletonBlock key={i} className="h-10" />)}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-xl border border-gray-200 p-5 space-y-3">
          <SkeletonBlock className="h-4 w-32" />
          {[0,1,2].map(i => <SkeletonBlock key={i} className="h-14 rounded-lg" />)}
        </div>
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0,1].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 space-y-3">
            <SkeletonBlock className="h-4 w-40" />
            <SkeletonBlock className="h-48" />
          </div>
        ))}
      </div>

      {/* Row 3: Bottleneck + Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0,1].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 p-5 space-y-4">
            <SkeletonBlock className="h-4 w-40" />
            {[0,1,2,3].map(j => <SkeletonBlock key={j} className="h-10 rounded-lg" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OperationsIntelligencePage() {
  const [data, setData] = useState<OICData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isManual = false) => {
    // First load → show skeleton. Background auto-refresh → subtle indicator only.
    if (!data || isManual) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
      const res = await fetch(`${baseUrl}/intelligence/overview`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastUpdated(new Date());
      } else {
        setError(json.message ?? 'Failed to load intelligence data');
      }
    } catch (err) {
      setError('Cannot reach the intelligence API. Make sure the backend is running.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  // Initial load + 30s auto-refresh
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !data) {
    return <OICSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <AlertCircle className="h-12 w-12 text-red-400" />
        <p className="text-gray-700 font-medium">{error ?? 'No data available'}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
          Retry
        </button>
      </div>
    );
  }

  const { advisor, healthScore, alerts, inventoryRisk, procurementForecast, bottleneck, orderRisk } = data;

  // Recharts data
  const invChartData = inventoryRisk.components.map(c => ({
    name: c.component.replace('Wooden ', ''),
    Coverage: c.coverage,
    risk: c.risk,
  }));

  const procChartData = procurementForecast.forecast
    .filter(f => f.daysRemaining !== null && f.daysRemaining < 30)
    .map(f => ({
      name: f.product.replace('Wood ', ''),
      'Days Left': Math.round(f.daysRemaining!),
      status: f.status,
    }));

  const criticalAlertCount = alerts.filter(a => a.level === 'CRITICAL').length;

  return (
    <div className="space-y-6 pb-10">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">Operations Intelligence Center</h1>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Real-time manufacturing intelligence • Shiv Furniture Works
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              {refreshing && <RefreshCcw className="h-3 w-3 animate-spin text-indigo-400" />}
              <span>Updated {lastUpdated.toLocaleTimeString()}</span>
              <span className="text-gray-300">· auto-refreshes every 30s</span>
            </div>
          )}
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            <RefreshCcw className={`h-4 w-4 ${(refreshing || loading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Operations Advisor ── */}
      <OperationsAdvisor advisor={advisor} />

      {/* ── Row 1: Health Score + Critical Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Health Score */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-indigo-50/60">
            <Activity className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-indigo-800 text-sm tracking-wide uppercase">
              Business Health Score
            </h2>
          </div>
          <div className="p-5">
            <HealthGauge score={healthScore.overall} breakdown={healthScore.breakdown} />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className={`flex items-center gap-2 px-5 py-4 border-b ${
            criticalAlertCount > 0 ? 'bg-red-50/60 border-red-100' : 'bg-gray-50/50 border-gray-100'
          }`}>
            <AlertTriangle className={`h-4 w-4 ${criticalAlertCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
            <h2 className="font-semibold text-sm tracking-wide uppercase text-gray-800">
              Critical Alerts
            </h2>
            {alerts.length > 0 && (
              <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="p-5">
            <CriticalAlerts alerts={alerts} />
          </div>
        </div>
      </div>

      {/* ── Row 2: Inventory Risk + Procurement Forecast ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Inventory Risk */}
        <Section title="Inventory Risk" icon={Package} iconColor="text-red-500">
          <div className="flex items-center gap-3 mb-4">
            {Object.entries(inventoryRisk.summary)
              .filter(([k]) => k !== 'totalComponents')
              .map(([k, v]) => (
                <div key={k} className="flex items-center gap-1.5">
                  <RiskBadge level={k.toUpperCase()} />
                  <span className="text-sm font-bold text-gray-700">{v as number}</span>
                </div>
              ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={invChartData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Coverage" radius={[0, 4, 4, 0]} name="Coverage">
                {invChartData.map((entry, i) => (
                  <Cell key={i} fill={riskBarColor(entry.risk)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">Coverage % — how much of required stock is available</p>
        </Section>

        {/* Procurement Forecast */}
        <Section title="Procurement Forecast" icon={TrendingDown} iconColor="text-orange-500">
          <div className="flex items-center gap-3 mb-4">
            {(['critical','high','medium','stable'] as const).map(k => (
              (procurementForecast.summary[k] ?? 0) > 0 && (
                <div key={k} className="flex items-center gap-1.5">
                  <RiskBadge level={k.toUpperCase()} />
                  <span className="text-sm font-bold text-gray-700">{procurementForecast.summary[k]}</span>
                </div>
              )
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={procChartData}
              layout="vertical"
              margin={{ top: 0, right: 30, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => `${v}d`} />
              <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomBarTooltip />} />
              <Bar dataKey="Days Left" radius={[0, 4, 4, 0]} name="Days Left">
                {procChartData.map((entry, i) => (
                  <Cell key={i} fill={forecastBarColor(entry.status)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-400 mt-2 text-center">Days of stock remaining at current consumption rate</p>
        </Section>
      </div>

      {/* ── Row 3: Bottleneck + Order Risk ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Bottleneck Analysis */}
        <Section title="Bottleneck Analysis" icon={Zap} iconColor="text-yellow-500">
          <div className="space-y-4">
            {bottleneck.workCenters.map(wc => (
              <div key={wc.workCenter}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">{wc.workCenter}</span>
                    <RiskBadge level={wc.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{wc.queueDepth} WOs queued</span>
                    <span className={`font-bold text-sm ${wc.utilization > 100 ? 'text-red-600' : wc.utilization > 70 ? 'text-purple-600' : 'text-green-600'}`}>
                      {wc.utilization}%
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${utilizationBarColor(wc.utilization)}`}
                    style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                  />
                </div>
                {wc.utilization > 100 && (
                  <p className="text-xs text-red-500 mt-1">
                    Overflow: {Math.round(wc.queuedMinutes - wc.availableMinutes)} min beyond daily capacity
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Order Risk */}
        <Section title="At-Risk Orders" icon={Clock} iconColor="text-purple-500">
          <div className="space-y-3">
            {orderRisk.orders.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No active confirmed orders</p>
            )}
            {orderRisk.orders.slice(0, 6).map(order => (
              <div key={order.orderNumber} className={`rounded-lg p-3 border ${
                order.orderRisk === 'CRITICAL' ? 'bg-red-50 border-red-200'
                : order.orderRisk === 'HIGH'   ? 'bg-orange-50 border-orange-200'
                : order.orderRisk === 'MEDIUM' ? 'bg-yellow-50 border-yellow-200'
                : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">{order.orderNumber}</span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-600 truncate">{order.customer}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{order.items}</p>
                    <p className="text-xs text-gray-400 mt-1">{order.primaryReason}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <RiskBadge level={order.orderRisk} />
                    {order.delayDays > 0 && (
                      <span className="text-xs font-semibold text-red-600">+{order.delayDays}d delay</span>
                    )}
                    {order.delayDays <= 0 && (
                      <span className="text-xs text-green-600 font-medium">On track</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                  <span>Promised: {order.promisedDate}</span>
                  <span>Est. delivery: {order.estimatedDaysToDeliver}d from now</span>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </div>

    </div>
  );
}
