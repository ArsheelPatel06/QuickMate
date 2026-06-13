"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MonitorPlay, Play, Pause, CheckCircle2, Clock, Factory, Layers, RefreshCcw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface WorkOrder {
  id: string;
  operationName: string;
  status: string;
  plannedDuration: number;
  actualDuration: number | null;
  startDate: string | null;
  workCenter: { name: string };
  manufacturingOrder: {
    id: string;
    orderNumber: string;
    product: { name: string };
  };
}

const WO_STATUS_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:     { label: 'Pending',     color: 'text-slate-600',   bg: 'bg-slate-100',   border: 'border-slate-200'   },
  READY:       { label: 'Ready',       color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200'    },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200'   },
  PAUSED:      { label: 'Paused',      color: 'text-purple-700',  bg: 'bg-orange-100',  border: 'border-orange-200'  },
  DONE:        { label: 'Done',        color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200' },
};

export default function ProductionFloorPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'TODAY' | 'ALL' | 'ACTIVE'>('TODAY');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/manufacturing-orders?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const mos = data.data?.orders ?? data.data ?? [];
      const wos: WorkOrder[] = mos
        .filter((mo: { status: string }) => !['DONE', 'CANCELLED'].includes(mo.status))
        .flatMap((mo: { id: string; orderNumber: string; product: { name: string }; workOrders: WorkOrder[] }) =>
          (mo.workOrders ?? []).map((wo: WorkOrder) => ({
            ...wo,
            manufacturingOrder: { id: mo.id, orderNumber: mo.orderNumber, product: mo.product },
          }))
        );
      setWorkOrders(wos);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const updateWorkOrderStatus = async (woId: string, moId: string, newStatus: string) => {
    setUpdatingId(woId);
    try {
      const body: Record<string, unknown> = {};
      if (newStatus === 'DONE') body.actualDuration = workOrders.find(w => w.id === woId)?.plannedDuration;
      await fetch(`${API}/manufacturing-orders/${moId}/work-orders/${woId}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      fetchWorkOrders();
    } catch {} finally {
      setUpdatingId(null);
    }
  };

  const filtered = workOrders.filter(wo => {
    if (filter === 'ACTIVE') return ['IN_PROGRESS', 'READY'].includes(wo.status);
    if (filter === 'TODAY')  return ['PENDING', 'READY', 'IN_PROGRESS', 'PAUSED'].includes(wo.status);
    return true;
  });

  const inProgressCount = workOrders.filter(w => w.status === 'IN_PROGRESS').length;
  const readyCount      = workOrders.filter(w => w.status === 'READY').length;
  const pendingCount    = workOrders.filter(w => w.status === 'PENDING').length;
  const doneCount       = workOrders.filter(w => w.status === 'DONE').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center">
              <MonitorPlay className="h-4 w-4 text-white" />
            </span>
            Production Floor
          </h1>
          <p className="text-sm text-slate-500 mt-1">Today's work orders — Start, Pause, or Complete tasks.</p>
        </div>
        <button
          onClick={fetchWorkOrders}
          className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'In Progress', value: inProgressCount, color: 'text-amber-600',  bg: 'bg-amber-50',   icon: Play         },
          { label: 'Ready',       value: readyCount,      color: 'text-blue-600',   bg: 'bg-blue-50',    icon: Layers       },
          { label: 'Pending',     value: pendingCount,    color: 'text-slate-600',  bg: 'bg-slate-50',   icon: Clock        },
          { label: 'Done Today',  value: doneCount,       color: 'text-emerald-600',bg: 'bg-emerald-50', icon: CheckCircle2 },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['TODAY','ACTIVE','ALL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >{f === 'TODAY' ? "Today's Tasks" : f === 'ACTIVE' ? 'Active Only' : 'All Orders'}</button>
        ))}
      </div>

      {/* Work order cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-3">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          <p className="text-slate-500 font-medium">No work orders in this view.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(wo => {
            const meta = WO_STATUS_META[wo.status] ?? WO_STATUS_META.PENDING;
            const isUpdating = updatingId === wo.id;
            return (
              <div key={wo.id} className={`bg-white rounded-2xl border ${meta.border} overflow-hidden hover:shadow-md transition-all`}>
                {/* Status bar */}
                <div className={`px-4 py-2.5 ${meta.bg} border-b ${meta.border} flex items-center justify-between`}>
                  <span className={`text-xs font-bold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                  <span className="text-xs text-slate-400">{wo.workCenter?.name}</span>
                </div>

                <div className="px-4 pt-4 pb-5 space-y-3">
                  {/* Operation name */}
                  <div>
                    <p className="font-bold text-slate-900 text-base">{wo.operationName}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{wo.manufacturingOrder.product?.name}</p>
                  </div>

                  {/* MO link */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Factory className="h-3.5 w-3.5" />
                    <span>{wo.manufacturingOrder.orderNumber}</span>
                  </div>

                  {/* Duration */}
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Planned: {wo.plannedDuration} min</span>
                    {wo.actualDuration && <span className="text-emerald-600 font-semibold">Actual: {wo.actualDuration} min</span>}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    {wo.status === 'PENDING' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateWorkOrderStatus(wo.id, wo.manufacturingOrder.id, 'READY')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-700 text-white text-xs font-bold py-2.5 hover:bg-indigo-800 disabled:opacity-50 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> Start Prep
                      </button>
                    )}
                    {wo.status === 'READY' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateWorkOrderStatus(wo.id, wo.manufacturingOrder.id, 'IN_PROGRESS')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold py-2.5 hover:bg-amber-600 disabled:opacity-50 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> {isUpdating ? 'Starting…' : 'Start Work'}
                      </button>
                    )}
                    {wo.status === 'IN_PROGRESS' && (
                      <>
                        <button
                          disabled={isUpdating}
                          onClick={() => updateWorkOrderStatus(wo.id, wo.manufacturingOrder.id, 'PAUSED')}
                          className="flex items-center justify-center gap-1 rounded-xl border border-orange-200 bg-orange-50 text-purple-700 text-xs font-bold py-2.5 px-3 hover:bg-orange-100 disabled:opacity-50 transition-all"
                        >
                          <Pause className="h-3.5 w-3.5" /> Pause
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() => updateWorkOrderStatus(wo.id, wo.manufacturingOrder.id, 'DONE')}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold py-2.5 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> {isUpdating ? 'Completing…' : 'Complete'}
                        </button>
                      </>
                    )}
                    {wo.status === 'PAUSED' && (
                      <button
                        disabled={isUpdating}
                        onClick={() => updateWorkOrderStatus(wo.id, wo.manufacturingOrder.id, 'IN_PROGRESS')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold py-2.5 hover:bg-amber-600 disabled:opacity-50 transition-all"
                      >
                        <Play className="h-3.5 w-3.5" /> Resume
                      </button>
                    )}
                    {wo.status === 'DONE' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold py-2.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
