"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Cpu, RefreshCcw, ArrowRight } from 'lucide-react';
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

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

function utilizationStyle(pct: number) {
  if (pct > 100) return {
    gradient: 'from-red-500 to-red-600',
    ring:     'ring-red-200',
    bg:       'bg-red-50',
    text:     'text-red-700',
    bar:      'bg-red-500',
    pill:     'bg-red-100 text-red-700',
    border:   'border-red-200',
  };
  if (pct > 70) return {
    gradient: 'from-orange-400 to-orange-500',
    ring:     'ring-orange-200',
    bg:       'bg-orange-50',
    text:     'text-purple-700',
    bar:      'bg-orange-500',
    pill:     'bg-orange-100 text-purple-700',
    border:   'border-orange-200',
  };
  if (pct > 40) return {
    gradient: 'from-yellow-400 to-yellow-500',
    ring:     'ring-yellow-200',
    bg:       'bg-yellow-50',
    text:     'text-yellow-700',
    bar:      'bg-yellow-500',
    pill:     'bg-yellow-100 text-yellow-700',
    border:   'border-yellow-200',
  };
  return {
    gradient: 'from-green-400 to-green-500',
    ring:     'ring-green-200',
    bg:       'bg-green-50',
    text:     'text-green-700',
    bar:      'bg-green-500',
    pill:     'bg-green-100 text-green-700',
    border:   'border-green-200',
  };
}

export default function WorkCentersPage() {
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading,     setLoading]     = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/intelligence/bottleneck`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setWorkCenters(json.data.workCenters ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const bottlenecks  = workCenters.filter(wc => wc.status === 'BOTTLENECK').length;
  const highLoad     = workCenters.filter(wc => wc.status === 'HIGH_LOAD').length;
  const underloaded  = workCenters.filter(wc => wc.status === 'UNDERUTILIZED').length;

  if (loading) {
    return (
      <div className="space-y-6 pb-10 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[0,1,2,3].map(i => <div key={i} className="h-52 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Cpu className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <nav className="text-xs text-gray-400 mb-0.5">
              <Link href="/manufacturing" className="hover:text-purple-600">Manufacturing</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-600">Work Centers</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Work Centers</h1>
          </div>
        </div>
        <button onClick={load} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
          <RefreshCcw className="h-4 w-4" />
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        {bottlenecks > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-700">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {bottlenecks} Bottleneck{bottlenecks > 1 ? 's' : ''}
          </span>
        )}
        {highLoad > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 border border-orange-200 px-3 py-1.5 text-sm font-semibold text-purple-700">
            <span className="h-2 w-2 rounded-full bg-indigo-700" />
            {highLoad} High Load
          </span>
        )}
        {underloaded > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 border border-green-200 px-3 py-1.5 text-sm font-semibold text-green-700">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {underloaded} Underutilised
          </span>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {workCenters.map(wc => {
          const s = utilizationStyle(wc.utilization);
          const overflow = wc.queuedMinutes - wc.availableMinutes;
          const overflowH = overflow > 0 ? (overflow / 60).toFixed(1) : null;

          return (
            <div key={wc.workCenter} className={`rounded-xl border-2 ${s.border} bg-white shadow-sm overflow-hidden flex flex-col`}>

              {/* Card header — colour band */}
              <div className={`bg-gradient-to-r ${s.gradient} px-5 py-4`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-white font-bold text-base">{wc.workCenter}</p>
                    <p className="text-white/70 text-xs mt-0.5">Capacity: {wc.capacity} × 8h/day</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black ${s.pill}`}>
                    {wc.utilization}%
                  </span>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4 space-y-4 flex-1">
                {/* Utilization bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500">Utilization</span>
                    <RiskBadge level={wc.status} />
                  </div>
                  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-3 rounded-full transition-all duration-700 ${s.bar}`}
                      style={{ width: `${Math.min(wc.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xl font-black text-gray-800">{wc.queueDepth}</p>
                    <p className="text-xs text-gray-500 mt-0.5">WOs Queued</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <p className="text-xl font-black text-gray-800">{Math.round(wc.queuedMinutes / 60)}h</p>
                    <p className="text-xs text-gray-500 mt-0.5">Queue Time</p>
                  </div>
                </div>

                {/* Overflow warning */}
                {overflowH && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                    <p className="text-xs text-red-700 font-semibold">
                      ⚠ {overflowH}h overflow beyond daily capacity
                    </p>
                  </div>
                )}

                {/* Underutilised suggestion */}
                {wc.status === 'UNDERUTILIZED' && (
                  <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
                    <p className="text-xs text-green-700 font-semibold">
                      ✓ Available to absorb work orders from other centers
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
                <Link
                  href="/manufacturing/capacity"
                  className="text-xs text-purple-600 hover:text-purple-700 font-semibold flex items-center gap-1"
                >
                  View Capacity Plan <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}

        {workCenters.length === 0 && (
          <div className="col-span-3 flex flex-col items-center justify-center py-16 text-gray-400">
            <Cpu className="h-10 w-10 mb-3 opacity-30" />
            <p className="text-sm">No work center data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
