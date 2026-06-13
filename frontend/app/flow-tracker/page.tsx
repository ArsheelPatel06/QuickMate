"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingCart, Package, Factory, Truck, CheckCircle2,
  XCircle, Clock, AlertTriangle, Search, ChevronRight, ArrowRight
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  lines?: Array<{ quantity: number; product: { name: string; onHandQty: number; reservedQty: number } }>;
}

interface ManufacturingOrder {
  id: string;
  orderNumber: string;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  sourceSalesOrderId: string | null;
  product: { name: string };
  workOrders: Array<{ id: string; operationName: string; status: string; workCenter: { name: string } }>;
}

type FlowStepStatus = 'done' | 'active' | 'pending' | 'skipped' | 'failed';

interface FlowStep {
  id: string;
  label: string;
  description: string;
  status: FlowStepStatus;
  timestamp?: string;
  detail?: string;
  icon: React.ElementType;
}

const STATUS_STYLE: Record<FlowStepStatus, { ring: string; bg: string; icon: string; line: string }> = {
  done:    { ring: 'ring-emerald-500', bg: 'bg-emerald-500',  icon: 'text-white',    line: 'bg-emerald-400' },
  active:  { ring: 'ring-indigo-500',  bg: 'bg-orange-500',   icon: 'text-white',    line: 'bg-amber-300'  },
  pending: { ring: 'ring-slate-200',   bg: 'bg-slate-100',    icon: 'text-slate-400',line: 'bg-slate-200'   },
  skipped: { ring: 'ring-slate-200',   bg: 'bg-slate-100',    icon: 'text-slate-300',line: 'bg-slate-200'   },
  failed:  { ring: 'ring-red-500',     bg: 'bg-red-100',      icon: 'text-red-500',  line: 'bg-red-300'     },
};

function buildFlowSteps(so: SalesOrder, mos: ManufacturingOrder[]): FlowStep[] {
  const soConfirmed = ['CONFIRMED','IN_PROGRESS','COMPLETED','PARTIALLY_DELIVERED','FULLY_DELIVERED'].includes(so.status);
  const soCompleted = ['COMPLETED','FULLY_DELIVERED'].includes(so.status);
  const soMos = mos.filter(m => m.sourceSalesOrderId === so.id);
  const hasMo = soMos.length > 0;
  const moInProgress = soMos.some(m => m.status === 'IN_PROGRESS');
  const moDone = soMos.every(m => m.status === 'DONE') && hasMo;

  return [
    {
      id: 'so',
      label: 'Sales Order',
      description: `${so.customerName} — ${so.orderNumber}`,
      status: soConfirmed ? 'done' : 'active',
      timestamp: so.createdAt,
      detail: `${so.lines?.length ?? 0} line item(s) — ₹${Number(so.totalAmount).toLocaleString()}`,
      icon: ShoppingCart,
    },
    {
      id: 'inventory',
      label: 'Inventory Check',
      description: 'System checks available stock',
      status: soConfirmed ? 'done' : 'pending',
      detail: soConfirmed ? 'Stock check complete' : 'Waiting for confirmation',
      icon: Package,
    },
    {
      id: 'mo',
      label: 'Manufacturing Order',
      description: hasMo ? `${soMos.length} MO(s) created` : 'Not required / pending',
      status: moDone ? 'done' : hasMo ? (moInProgress ? 'active' : 'pending') : (soConfirmed ? 'skipped' : 'pending'),
      detail: hasMo ? soMos.map(m => `${m.orderNumber}: ${m.status}`).join(' · ') : undefined,
      icon: Factory,
    },
    {
      id: 'production',
      label: 'Production',
      description: 'Work orders executed on shop floor',
      status: moDone ? 'done' : moInProgress ? 'active' : 'pending',
      detail: soMos.flatMap(m => m.workOrders).length > 0
        ? `${soMos.flatMap(m => m.workOrders.filter(w => w.status === 'DONE')).length}/${soMos.flatMap(m => m.workOrders).length} work orders done`
        : undefined,
      icon: Factory,
    },
    {
      id: 'stock',
      label: 'Inventory Update',
      description: 'Finished goods added to stock',
      status: moDone ? 'done' : 'pending',
      icon: Package,
    },
    {
      id: 'delivery',
      label: 'Delivery',
      description: soCompleted ? 'Order delivered' : 'Awaiting production',
      status: soCompleted ? 'done' : 'pending',
      timestamp: soCompleted ? so.createdAt : undefined,
      icon: Truck,
    },
  ];
}

function FlowTrackerContent() {
  const searchParams = useSearchParams();
  const orderParam = searchParams.get('order');

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [mos, setMos] = useState<ManufacturingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [search, setSearch] = useState(orderParam ?? '');
  const [loading, setLoading] = useState(true);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [soRes, moRes] = await Promise.all([
        fetch(`${API}/sales-orders?limit=100`, { headers }),
        fetch(`${API}/manufacturing-orders?limit=100`, { headers }),
      ]);
      const soData = await soRes.json();
      const moData = await moRes.json();
      const allOrders = soData.data?.orders ?? soData.data ?? [];
      const allMos    = moData.data?.orders ?? moData.data ?? [];
      setOrders(allOrders);
      setMos(allMos);

      // Auto-select from URL param
      if (orderParam) {
        const found = allOrders.find((o: SalesOrder) => o.orderNumber === orderParam);
        if (found) setSelectedOrder(found);
      }
    } catch {} finally {
      setLoading(false);
    }
  }, [token, orderParam]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredOrders = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const flowSteps = selectedOrder ? buildFlowSteps(selectedOrder, mos) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Flow Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track every order end-to-end: Customer → Inventory → Manufacturing → Delivery
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order selector */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search orders…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 max-h-[70vh] overflow-y-auto">
            {loading && [...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded-full mb-1.5" />
                <div className="h-2.5 w-32 bg-slate-100 rounded-full" />
              </div>
            ))}
            {!loading && filteredOrders.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              const statusColor: Record<string, string> = {
                DRAFT:       'text-slate-500',
                CONFIRMED:   'text-blue-600',
                IN_PROGRESS: 'text-amber-600',
                COMPLETED:   'text-emerald-600',
                CANCELLED:   'text-red-500',
              };
              return (
                <button
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left flex items-center justify-between px-4 py-3 hover:bg-orange-50 transition-colors ${
                    isSelected ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                  }`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-purple-700' : 'text-slate-700'}`}>
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{order.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-semibold ${statusColor[order.status] ?? 'text-slate-500'}`}>
                      {order.status.replace('_',' ')}
                    </p>
                    <ChevronRight className={`h-3.5 w-3.5 mt-0.5 ml-auto ${isSelected ? 'text-orange-500' : 'text-slate-300'}`} />
                  </div>
                </button>
              );
            })}
            {!loading && filteredOrders.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No orders found</p>
            )}
          </div>
        </div>

        {/* Flow timeline */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-orange-400" />
              </div>
              <p className="text-slate-500 font-medium">Select an order to track its flow</p>
              <p className="text-slate-400 text-sm">Customer → Inventory → Manufacturing → Delivery</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              {/* Order summary bar */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Tracking</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedOrder.orderNumber}</h2>
                    <p className="text-sm text-slate-500">{selectedOrder.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">₹{Number(selectedOrder.totalAmount).toLocaleString()}</p>
                    <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      selectedOrder.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                      selectedOrder.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' :
                      selectedOrder.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{selectedOrder.status.replace('_',' ')}</span>
                  </div>
                </div>
              </div>

              {/* Flow steps */}
              <div className="px-6 py-6">
                <div className="relative">
                  {flowSteps.map((step, idx) => {
                    const style = STATUS_STYLE[step.status];
                    const Icon = step.icon;
                    const isLast = idx === flowSteps.length - 1;

                    return (
                      <div key={step.id} className="flex gap-5 relative pb-0">
                        {/* Line + dot */}
                        <div className="flex flex-col items-center">
                          <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-2 ${style.ring} ${style.bg} shadow-sm shrink-0`}>
                            {step.status === 'done' ? (
                              <CheckCircle2 className="h-5 w-5 text-white" />
                            ) : step.status === 'failed' ? (
                              <XCircle className="h-5 w-5 text-red-500" />
                            ) : step.status === 'active' ? (
                              <Icon className={`h-5 w-5 ${style.icon} animate-pulse`} />
                            ) : (
                              <Icon className={`h-5 w-5 ${style.icon}`} />
                            )}
                          </div>
                          {!isLast && <div className={`w-0.5 flex-1 min-h-[40px] ${style.line}`} />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 pb-8 ${isLast ? 'pb-0' : ''}`}>
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-semibold text-sm ${
                                step.status === 'done' ? 'text-slate-800'
                                : step.status === 'active' ? 'text-purple-700'
                                : 'text-slate-400'
                              }`}>{step.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                              {step.status === 'done' && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Done
                                </span>
                              )}
                              {step.status === 'active' && (
                                <span className="flex items-center gap-1 text-[10px] text-purple-600 font-semibold">
                                  <Clock className="h-3 w-3 animate-spin" /> In Progress
                                </span>
                              )}
                              {step.status === 'pending' && (
                                <span className="text-[10px] text-slate-400">Pending</span>
                              )}
                              {step.timestamp && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(step.timestamp).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>
                          {step.detail && (
                            <p className="mt-1.5 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                              {step.detail}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowTrackerPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-sm">Loading…</div>}>
      <FlowTrackerContent />
    </Suspense>
  );
}
