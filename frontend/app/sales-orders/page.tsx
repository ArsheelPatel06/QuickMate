"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Plus, ShoppingCart, CheckCircle2, Loader2, ArrowRight, Zap, AlertTriangle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  lines?: Array<{ quantity: number; product: { name: string } }>;
}

const STAGES: Array<{ key: string; label: string; color: string; border: string; header: string; dot: string }> = [
  { key: 'DRAFT',       label: 'Draft',        color: 'text-slate-600',   border: 'border-slate-200',  header: 'bg-slate-100',  dot: 'bg-slate-400'    },
  { key: 'CONFIRMED',   label: 'Confirmed',    color: 'text-blue-700',    border: 'border-blue-200',   header: 'bg-blue-50',    dot: 'bg-blue-500'     },
  { key: 'IN_PROGRESS', label: 'In Production',color: 'text-amber-700',   border: 'border-amber-200',  header: 'bg-amber-50',   dot: 'bg-amber-500'    },
  { key: 'COMPLETED',   label: 'Completed',    color: 'text-emerald-700', border: 'border-emerald-200',header: 'bg-emerald-50', dot: 'bg-emerald-500'  },
  { key: 'CANCELLED',   label: 'Cancelled',    color: 'text-red-600',     border: 'border-red-200',    header: 'bg-red-50',     dot: 'bg-red-400'      },
];

type ConfirmResult = {
  orderNumber: string;
  status: string;
  moCreated?: boolean;
  poCreated?: boolean;
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/sales-orders?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setOrders(data.data?.orders ?? data.data ?? []);
    } catch {} finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const confirmOrder = async (order: SalesOrder) => {
    setConfirmingId(order.id);
    try {
      const res = await fetch(`${API}/sales-orders/${order.id}/confirm`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ orderNumber: order.orderNumber, status: 'confirmed', moCreated: true, poCreated: false });
        setTimeout(() => setResult(null), 5000);
        fetchOrders();
      }
    } finally {
      setConfirmingId(null);
    }
  };

  const grouped = STAGES.reduce<Record<string, SalesOrder[]>>((acc, s) => {
    acc[s.key] = orders.filter(o => o.status === s.key);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales Orders</h1>
          <p className="text-sm text-slate-500 mt-1">{orders.length} orders total</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {(['kanban','list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${
                  view === v ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >{v}</button>
            ))}
          </div>
          <Link
            href="/sales-orders/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 shadow-sm"
          >
            <Plus className="h-4 w-4" /> New Order
          </Link>
        </div>
      </div>

      {/* Automation result toast */}
      {result && (
        <div className="rounded-2xl bg-gradient-to-r from-indigo-700 to-amber-600 p-4 text-white shadow-lg shadow-indigo-500/20">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">{result.orderNumber} Confirmed — Automation Triggered</p>
              <div className="mt-2 flex flex-wrap gap-2 text-sm">
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Inventory Check
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> MO Created (if shortage)
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> PO Request (if raw material shortage)
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Team Notified
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Kanban Pipeline */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          {loading ? (
            <div className="flex gap-4 min-w-max">
              {STAGES.map(s => (
                <div key={s.key} className="w-64 space-y-2">
                  <div className={`h-10 rounded-xl ${s.header} animate-pulse`} />
                  {[...Array(2)].map((_, i) => <div key={i} className="h-24 rounded-xl bg-white border border-slate-200 animate-pulse" />)}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex gap-4 min-w-max items-start">
              {STAGES.map(stage => {
                const stageOrders = grouped[stage.key] ?? [];
                return (
                  <div key={stage.key} className="w-64 flex-shrink-0">
                    {/* Stage header */}
                    <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 mb-3 ${stage.header} border ${stage.border}`}>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
                        <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                      </div>
                      <span className={`text-xs font-bold ${stage.color}`}>{stageOrders.length}</span>
                    </div>

                    {/* Cards */}
                    <div className="space-y-2">
                      {stageOrders.map(order => (
                        <div
                          key={order.id}
                          className={`bg-white rounded-xl border ${stage.border} p-3.5 hover:shadow-sm transition-all group`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <Link href={`/sales-orders/${order.id}`} className="text-sm font-bold text-purple-600 hover:underline">
                              {order.orderNumber}
                            </Link>
                            <span className="text-xs font-semibold text-slate-500">
                              ₹{Number(order.totalAmount).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 font-medium mb-1 truncate">{order.customerName}</p>
                          <p className="text-[10px] text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </p>

                          {/* Confirm button for DRAFT orders */}
                          {stage.key === 'DRAFT' && (
                            <button
                              onClick={() => confirmOrder(order)}
                              disabled={confirmingId === order.id}
                              className="mt-2.5 w-full flex items-center justify-center gap-1.5 rounded-lg bg-indigo-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800 disabled:opacity-60 transition-all"
                            >
                              {confirmingId === order.id
                                ? <><Loader2 className="h-3 w-3 animate-spin" /> Confirming…</>
                                : <><CheckCircle2 className="h-3 w-3" /> Confirm Order</>
                              }
                            </button>
                          )}

                          {/* Track link for active orders */}
                          {['CONFIRMED','IN_PROGRESS'].includes(stage.key) && (
                            <Link
                              href={`/flow-tracker?order=${order.orderNumber}`}
                              className="mt-2.5 w-full flex items-center justify-center gap-1 rounded-lg border border-orange-200 bg-orange-50 text-purple-600 px-3 py-1.5 text-xs font-semibold hover:bg-orange-100 transition-all"
                            >
                              <ArrowRight className="h-3 w-3" /> Track Flow
                            </Link>
                          )}
                        </div>
                      ))}

                      {stageOrders.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                          <p className="text-xs text-slate-300">No orders</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {loading && [...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded-full" />
                <div className="h-3 w-40 bg-slate-100 rounded-full flex-1" />
                <div className="h-5 w-20 bg-slate-100 rounded-full" />
              </div>
            ))}
            {!loading && orders.map(order => {
              const stage = STAGES.find(s => s.key === order.status) ?? STAGES[0];
              return (
                <div key={order.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <ShoppingCart className={`h-4 w-4 shrink-0 ${stage.color}`} />
                    <Link href={`/sales-orders/${order.id}`} className="text-sm font-semibold text-purple-600 hover:underline">
                      {order.orderNumber}
                    </Link>
                    <span className="text-sm text-slate-500">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-600">₹{Number(order.totalAmount).toLocaleString()}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${stage.color} ${stage.header} ${stage.border}`}>
                      {stage.label}
                    </span>
                    {order.status === 'DRAFT' && (
                      <button
                        onClick={() => confirmOrder(order)}
                        disabled={confirmingId === order.id}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
                      >
                        {confirmingId === order.id ? 'Confirming…' : 'Confirm →'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {!loading && orders.length === 0 && (
              <p className="text-center text-slate-400 py-12 text-sm">No sales orders yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
