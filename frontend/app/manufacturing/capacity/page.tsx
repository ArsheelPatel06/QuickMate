"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { BarChart2, RefreshCcw, ArrowRight, BrainCircuit } from 'lucide-react';
import { RiskBadge } from '@/components/oic/RiskBadge';

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
  impact: string;
  action: string;
  metric: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function barColor(pct: number) {
  if (pct > 100) return 'bg-red-500';
  if (pct > 70)  return 'bg-orange-500';
  if (pct > 40)  return 'bg-yellow-500';
  return 'bg-green-500';
}

function textColor(pct: number) {
  if (pct > 100) return 'text-red-700 font-black';
  if (pct > 70)  return 'text-purple-700 font-bold';
  if (pct > 40)  return 'text-yellow-700 font-bold';
  return 'text-green-700 font-bold';
}

export default function CapacityPlanningPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [mfgRecs,     setMfgRecs]     = useState<AdvisorRec[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [botRes, advRes] = await Promise.all([
        fetch(`${API}/intelligence/bottleneck`, { headers }),
        fetch(`${API}/intelligence/overview`,   { headers }),
      ]);
      const [botJson, advJson] = await Promise.all([botRes.json(), advRes.json()]);
      if (botJson.success) setWorkCenters(botJson.data.workCenters ?? []);
      if (advJson.success) {
        setMfgRecs(
          (advJson.data.advisor?.recommendations ?? []).filter(
            (r: AdvisorRec) => r.category === 'MANUFACTURING'
          )
        );
      }
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalQueueH    = workCenters.reduce((s, wc) => s + wc.queuedMinutes, 0) / 60;
  const totalCapacityH = workCenters.reduce((s, wc) => s + wc.availableMinutes, 0) / 60;
  const overallUtil    = totalCapacityH > 0 ? Math.round((totalQueueH / totalCapacityH) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 pb-10 animate-pulse">
        <div className="h-8 w-72 bg-gray-200 rounded" />
        <div className="h-16 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <BarChart2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <nav className="text-xs text-gray-400 mb-0.5">
              <Link href="/manufacturing" className="hover:text-purple-600">Manufacturing</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-600">Capacity Planning</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Capacity Planning</h1>
            {lastRefresh && <p className="text-xs text-gray-400 mt-0.5">Updated {lastRefresh.toLocaleTimeString()}</p>}
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Overall utilization banner */}
      <div className={`rounded-xl p-5 border ${overallUtil > 100 ? 'bg-red-50 border-red-200' : overallUtil > 70 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Overall Factory Utilization</span>
          <span className={`text-2xl font-black ${textColor(overallUtil)}`}>{overallUtil}%</span>
        </div>
        <div className="h-3 bg-white/70 rounded-full overflow-hidden">
          <div className={`h-3 rounded-full transition-all ${barColor(overallUtil)}`} style={{ width: `${Math.min(overallUtil, 100)}%` }} />
        </div>
        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
          <span>{totalQueueH.toFixed(1)}h total work queued</span>
          <span>{totalCapacityH.toFixed(0)}h total daily capacity</span>
        </div>
      </div>

      {/* Per-center capacity table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <BarChart2 className="h-4 w-4 text-orange-500" />
          <h2 className="font-semibold text-gray-800 text-sm tracking-wide uppercase">Work Center Capacity</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Work Center', 'Daily Capacity', 'Queued Work', 'Utilization', 'WOs Queued', 'Status', 'Action'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {workCenters.map(wc => {
                const overflow = wc.queuedMinutes - wc.availableMinutes;
                return (
                  <tr key={wc.workCenter} className="hover:bg-orange-50/20 transition-colors">
                    <td className="px-5 py-4">
                      <span className="font-semibold text-gray-800 text-sm">{wc.workCenter}</span>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {Math.round(wc.availableMinutes / 60)}h / day
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {Math.round(wc.queuedMinutes / 60)}h
                      {overflow > 0 && (
                        <span className="ml-1.5 text-xs text-red-500 font-semibold">
                          (+{Math.round(overflow / 60)}h overflow)
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${barColor(wc.utilization)}`}
                            style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm ${textColor(wc.utilization)}`}>{wc.utilization}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700 font-semibold">{wc.queueDepth}</td>
                    <td className="px-5 py-4"><RiskBadge level={wc.status} /></td>
                    <td className="px-5 py-4 text-xs text-gray-500">
                      {wc.status === 'BOTTLENECK'    && <span className="text-red-600 font-medium">Redistribute WOs ↗</span>}
                      {wc.status === 'HIGH_LOAD'     && <span className="text-purple-600 font-medium">Monitor closely</span>}
                      {wc.status === 'MODERATE'      && <span className="text-yellow-600">Normal</span>}
                      {wc.status === 'UNDERUTILIZED' && <span className="text-green-600">Can absorb overflow</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Recommendations */}
      {mfgRecs.length > 0 && (
        <div className="rounded-xl border border-indigo-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-indigo-100 bg-indigo-50/60">
            <BrainCircuit className="h-4 w-4 text-amber-600" />
            <h2 className="font-semibold text-indigo-800 text-sm tracking-wide uppercase">AI Capacity Recommendations</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {mfgRecs.map((rec, i) => (
              <div key={i} className="p-5 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <RiskBadge level={rec.urgency} />
                  <span className="font-semibold text-gray-900 text-sm">{rec.title}</span>
                  <span className="ml-auto text-xs text-gray-400 font-mono">{rec.metric}</span>
                </div>
                <p className="text-xs text-gray-500">{rec.impact}</p>
                <div className="flex items-start gap-2 rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2">
                  <ArrowRight className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-800 font-medium">{rec.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
