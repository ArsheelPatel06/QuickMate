"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Layers, CheckCircle2, Play, Pause, Clock, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface WorkOrder {
  id: string;
  operationName: string;
  status: string;
  plannedDuration: number;
  actualDuration: number | null;
  workCenter: { name: string };
  manufacturingOrder: {
    id: string;
    orderNumber: string;
    product: { name: string };
    status: string;
  };
}

const WO_STATUS: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDING:     { label: 'Pending',     color: 'text-slate-600',   bg: 'bg-slate-100',   icon: Clock       },
  READY:       { label: 'Ready',       color: 'text-blue-700',    bg: 'bg-blue-100',    icon: Play        },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700',   bg: 'bg-amber-100',   icon: Pause       },
  PAUSED:      { label: 'Paused',      color: 'text-purple-700',  bg: 'bg-orange-100',  icon: Pause       },
  DONE:        { label: 'Done',        color: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle2 },
};

const STATUS_FILTERS = ['ALL', 'PENDING', 'READY', 'IN_PROGRESS', 'PAUSED', 'DONE'];

export default function WorkOrdersPage() {
  const [allWos, setAllWos] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/manufacturing-orders?limit=200`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const mos = data.data?.orders ?? data.data ?? [];
      const wos: WorkOrder[] = mos.flatMap((mo: { id: string; orderNumber: string; status: string; product: { name: string }; workOrders: WorkOrder[] }) =>
        (mo.workOrders ?? []).map((wo: WorkOrder) => ({
          ...wo,
          manufacturingOrder: { id: mo.id, orderNumber: mo.orderNumber, product: mo.product, status: mo.status },
        }))
      );
      setAllWos(wos);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchWorkOrders(); }, [fetchWorkOrders]);

  const filtered = statusFilter === 'ALL' ? allWos : allWos.filter(w => w.status === statusFilter);

  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, s) => {
    acc[s] = s === 'ALL' ? allWos.length : allWos.filter(w => w.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">{allWos.length} total work orders across all MOs</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {['PENDING','READY','IN_PROGRESS','PAUSED','DONE'].map(s => {
          const meta = WO_STATUS[s];
          const Icon = meta.icon;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                statusFilter === s ? 'ring-2 ring-indigo-500 border-orange-200' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className={`h-8 w-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                <Icon className={`h-4 w-4 ${meta.color}`} />
              </div>
              <div>
                <p className="text-lg font-black text-slate-800">{counts[s]}</p>
                <p className="text-[10px] text-slate-500">{meta.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              statusFilter === s
                ? 'bg-indigo-700 text-white border-indigo-700'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
            }`}
          >
            {s === 'ALL' ? 'All' : WO_STATUS[s]?.label ?? s} ({counts[s]})
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Operation</th>
              <th className="text-left px-4 py-3.5 font-semibold text-slate-600">Work Center</th>
              <th className="text-left px-4 py-3.5 font-semibold text-slate-600">MO</th>
              <th className="text-left px-4 py-3.5 font-semibold text-slate-600">Product</th>
              <th className="text-center px-4 py-3.5 font-semibold text-slate-600">Planned (min)</th>
              <th className="text-center px-4 py-3.5 font-semibold text-slate-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && [...Array(8)].map((_, i) => (
              <tr key={i}>
                {[...Array(6)].map((_, j) => (
                  <td key={j} className="px-5 py-3">
                    <div className="h-3 bg-slate-100 rounded-full animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {!loading && filtered.map(wo => {
              const meta = WO_STATUS[wo.status] ?? WO_STATUS.PENDING;
              const Icon = meta.icon;
              return (
                <tr key={wo.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-800">{wo.operationName}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-600">{wo.workCenter?.name ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Link href={`/manufacturing/orders/${wo.manufacturingOrder.id}`} className="text-purple-600 font-semibold hover:underline">
                      {wo.manufacturingOrder.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">{wo.manufacturingOrder.product?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-center text-slate-500">{wo.plannedDuration}</td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.color} ${meta.bg}`}>
                      <Icon className="h-3 w-3" />{meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-slate-400 py-12 text-sm">No work orders found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
