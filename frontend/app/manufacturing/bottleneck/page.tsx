"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, TrendingDown, CheckCircle2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface WorkCenter {
  workCenter: string;
  capacity: number;
  assignedHours: number;
  utilization: number;
  queueDepth: number;
  queueTime: number;
  status: string;
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; border: string; barColor: string; icon: React.ElementType }> = {
  BOTTLENECK:    { label: 'Bottleneck',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     barColor: 'bg-red-500',     icon: AlertTriangle  },
  HIGH_LOAD:     { label: 'High Load',     color: 'text-purple-700',  bg: 'bg-orange-50',  border: 'border-orange-200',  barColor: 'bg-orange-500',  icon: Activity       },
  MODERATE:      { label: 'Moderate',      color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   barColor: 'bg-amber-500',   icon: Activity       },
  UNDERUTILIZED: { label: 'Underutilized', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', barColor: 'bg-emerald-500', icon: TrendingDown    },
};

export default function BottleneckPage() {
  const [data, setData] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/intelligence/bottleneck`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setData(json.data?.workCenters ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const bottleneckCount    = data.filter(w => w.status === 'BOTTLENECK').length;
  const highLoadCount      = data.filter(w => w.status === 'HIGH_LOAD').length;
  const underutilizedCount = data.filter(w => w.status === 'UNDERUTILIZED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bottleneck Analysis</h1>
          <p className="text-sm text-slate-500 mt-1">Live work center utilization and capacity constraints</p>
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: 'Bottlenecks',    value: bottleneckCount,    color: 'bg-red-100 text-red-700 border-red-200'           },
          { label: 'High Load',      value: highLoadCount,      color: 'bg-orange-100 text-purple-700 border-orange-200'  },
          { label: 'Underutilized',  value: underutilizedCount, color: 'bg-emerald-100 text-emerald-700 border-emerald-200'},
          { label: 'Total Centers',  value: data.length,        color: 'bg-slate-100 text-slate-700 border-slate-200'      },
        ].map(p => (
          <div key={p.label} className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold ${p.color}`}>
            <span className="text-lg font-black">{p.value}</span>
            <span>{p.label}</span>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && [...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        ))}
        {!loading && data.map((wc, i) => {
          const meta = STATUS_META[wc.status] ?? STATUS_META.MODERATE;
          const Icon = meta.icon;
          const util = Math.round(wc.utilization);
          return (
            <div key={i} className={`bg-white rounded-2xl border ${meta.border} overflow-hidden hover:shadow-md transition-all`}>
              {/* Top bar */}
              <div className={`px-4 py-3 ${meta.bg} border-b ${meta.border} flex items-center justify-between`}>
                <p className={`font-bold text-sm ${meta.color} truncate`}>{wc.workCenter}</p>
                <span className={`flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                  <Icon className="h-3 w-3" />{meta.label}
                </span>
              </div>

              <div className="px-4 pt-4 pb-5 space-y-4">
                {/* Utilization */}
                <div>
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-xs text-slate-500">Utilization</span>
                    <span className={`text-2xl font-black ${meta.color}`}>{util}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${meta.barColor}`}
                      style={{ width: `${Math.min(100, util)}%` }}
                    />
                  </div>
                  {util > 100 && (
                    <div className="mt-1 text-[10px] text-red-600 font-semibold">⚠ Overloaded by {util - 100}%</div>
                  )}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-sm font-bold text-slate-700">{wc.capacity}</p>
                    <p className="text-[10px] text-slate-400">Capacity</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-sm font-bold text-slate-700">{wc.queueDepth}</p>
                    <p className="text-[10px] text-slate-400">Queue WOs</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-2">
                    <p className="text-sm font-bold text-slate-700">{wc.queueTime}h</p>
                    <p className="text-[10px] text-slate-400">Queue Time</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!loading && data.length === 0 && (
          <div className="col-span-3 flex flex-col items-center py-16 gap-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            <p className="text-slate-500">No bottlenecks detected</p>
          </div>
        )}
      </div>
    </div>
  );
}
