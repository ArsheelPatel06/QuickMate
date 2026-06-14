"use client";

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShoppingCart, Package, Factory, Truck, CheckCircle2,
  XCircle, Clock, Search, ChevronRight, ArrowRight,
  Play, Send, RefreshCw, AlertTriangle, Zap, Scale, ShoppingBag
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface SalesOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string | number;
  createdAt: string;
  lines?: Array<{
    quantity: number;
    productId: string;
    product: { id: string; name: string; onHandQty: number; reservedQty: number };
  }>;
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

interface FlowLineAnalysis {
  lineId: string;
  productName: string;
  orderedQty: number;
  availableQty: number;
  shortage: number;
  vendorCost: number;
  manufacturingCost: number;
  recommendation: 'IN_STOCK' | 'MANUFACTURE' | 'PURCHASE';
  reason: string;
  hasBom: boolean;
}

interface FlowAnalysis {
  lines: FlowLineAnalysis[];
  linkedManufacturingOrders: Array<{ orderNumber: string; status: string; productName: string }>;
  linkedPurchaseOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    lines?: Array<{ id: string; quantity: number; receivedQty: number; remainingQty: number }>;
  }>;
  summary: {
    allInStock: boolean;
    hasShortage: boolean;
    hasMo: boolean;
    moDone: boolean;
    moInProgress: boolean;
    hasPo?: boolean;
    poDraft?: boolean;
    poAwaitingReceipt?: boolean;
    poReceived?: boolean;
    readyForDelivery: boolean;
    nextAction: string;
    workOrdersProgress: string | null;
  };
}

type FlowStepStatus = 'done' | 'active' | 'pending' | 'skipped' | 'failed';

const STATUS_STYLE: Record<FlowStepStatus, { ring: string; bg: string; icon: string; line: string }> = {
  done:    { ring: 'ring-emerald-500', bg: 'bg-emerald-500',  icon: 'text-white',     line: 'bg-emerald-300' },
  active:  { ring: 'ring-indigo-500',  bg: 'bg-indigo-500',   icon: 'text-white',     line: 'bg-indigo-200'  },
  pending: { ring: 'ring-slate-200',   bg: 'bg-slate-100',    icon: 'text-slate-400', line: 'bg-slate-200'   },
  skipped: { ring: 'ring-slate-200',   bg: 'bg-slate-100',    icon: 'text-slate-300', line: 'bg-slate-200'   },
  failed:  { ring: 'ring-red-500',     bg: 'bg-red-100',      icon: 'text-red-500',   line: 'bg-red-200'     },
};

const SO_STATUS_COLOR: Record<string, string> = {
  DRAFT:               'bg-slate-100 text-slate-600',
  CONFIRMED:           'bg-blue-100 text-blue-700',
  IN_PROGRESS:         'bg-amber-100 text-amber-700',
  COMPLETED:           'bg-emerald-100 text-emerald-700',
  PARTIALLY_DELIVERED: 'bg-purple-100 text-purple-700',
  FULLY_DELIVERED:     'bg-emerald-100 text-emerald-700',
  CANCELLED:           'bg-red-100 text-red-600',
};

function FlowTrackerContent() {
  const searchParams  = useSearchParams();
  const orderParam    = searchParams.get('order');

  const [orders, setOrders]               = useState<SalesOrder[]>([]);
  const [mos, setMos]                     = useState<ManufacturingOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [flowAnalysis, setFlowAnalysis]   = useState<FlowAnalysis | null>(null);
  const [search, setSearch]               = useState(orderParam ?? '');
  const [loading, setLoading]             = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast]                 = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [soRes, moRes] = await Promise.all([
        fetch(`${API}/sales-orders?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/manufacturing-orders?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const soData = await soRes.json();
      const moData = await moRes.json();
      const allOrders = soData.data?.orders ?? soData.data ?? [];
      const allMos    = moData.data?.orders ?? moData.data ?? [];
      setOrders(allOrders);
      setMos(allMos);
    } catch {
      showToast('error', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [token, orderParam]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData(); }, [fetchData]);

  const loadFlowAnalysis = useCallback(async (orderId: string) => {
    try {
      const res = await fetch(`${API}/sales-orders/${orderId}/flow`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setFlowAnalysis(data.data);
    } catch {
      setFlowAnalysis(null);
    }
  }, [token]);

  const selectOrder = useCallback(async (order: SalesOrder) => {
    setSelectedOrder(order);
    setFlowAnalysis(null);
    try {
      const res = await fetch(`${API}/sales-orders/${order.id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok && data.data) {
        setSelectedOrder(data.data);
        await loadFlowAnalysis(order.id);
      }
    } catch {
      await loadFlowAnalysis(order.id);
    }
  }, [token, loadFlowAnalysis]);

  useEffect(() => {
    if (orderParam && orders.length) {
      const found = orders.find(o => o.orderNumber === orderParam);
      if (found) selectOrder(found);
    }
  }, [orderParam, orders, selectOrder]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const confirmOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading('confirm');
    try {
      const res  = await fetch(`${API}/sales-orders/${selectedOrder.id}/confirm`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast('success', `${selectedOrder.orderNumber} confirmed. Stock checked — routing by cost.`);
      await fetchData();
      if (selectedOrder) await loadFlowAnalysis(selectedOrder.id);
      setSelectedOrder(prev => prev ? { ...prev, status: 'CONFIRMED' } : null);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const fulfillShortage = async (method: 'AUTO' | 'MANUFACTURE' | 'PURCHASE' = 'AUTO') => {
    if (!selectedOrder) return;
    setActionLoading(method === 'AUTO' ? 'fulfill' : method === 'MANUFACTURE' ? 'create_mo' : 'create_po');
    try {
      const res  = await fetch(`${API}/sales-orders/${selectedOrder.id}/fulfill`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ method }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Fulfillment failed');
      const created = data.data?.results?.filter((r: { error?: string; skipped?: boolean }) => !r.error && !r.skipped) ?? [];
      if (created.length === 0) {
        showToast('error', data.data?.results?.[0]?.error ?? 'Nothing created — check BOM or existing orders');
      } else {
        showToast('success', created.map((r: { type: string; orderNumber: string }) => `${r.type} ${r.orderNumber}`).join(', ') + ' created');
      }
      await fetchData();
      await loadFlowAnalysis(selectedOrder.id);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const deliverOrder = async () => {
    if (!selectedOrder) return;
    setActionLoading('deliver');
    try {
      const res  = await fetch(`${API}/sales-orders/${selectedOrder.id}/deliver`, { method: 'POST', headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      showToast('success', `${selectedOrder.orderNumber} marked as delivered!`);
      await fetchData();
      await loadFlowAnalysis(selectedOrder.id);
      setSelectedOrder(prev => prev ? { ...prev, status: 'FULLY_DELIVERED' } : null);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmPurchaseOrder = async (poId: string) => {
    setActionLoading('confirm_po');
    try {
      const res = await fetch(`${API}/purchase-orders/${poId}/confirm`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to confirm PO');
      showToast('success', 'Purchase order confirmed — ready to receive goods');
      if (selectedOrder) await loadFlowAnalysis(selectedOrder.id);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const receivePurchaseOrder = async (poId: string) => {
    const po = flowAnalysis?.linkedPurchaseOrders.find(p => p.id === poId);
    if (!po?.lines?.length) {
      showToast('error', 'No PO lines to receive');
      return;
    }
    setActionLoading('receive_po');
    try {
      const receipts = po.lines
        .filter(l => l.remainingQty > 0)
        .map(l => ({ lineId: l.id, receivedQty: l.remainingQty }));
      if (receipts.length === 0) throw new Error('Nothing left to receive');

      const res = await fetch(`${API}/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ receipts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Receive failed');
      showToast('success', 'Goods received — inventory updated');
      await fetchData();
      if (selectedOrder) await loadFlowAnalysis(selectedOrder.id);
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Flow logic (driven by backend flow analysis) ───────────────────────────

  const summary = flowAnalysis?.summary;
  const soMos   = selectedOrder ? mos.filter(m => m.sourceSalesOrderId === selectedOrder.id) : [];
  const hasMo   = summary?.hasMo ?? soMos.length > 0;
  const moInProg = summary?.moInProgress ?? soMos.some(m => ['IN_PROGRESS', 'CONFIRMED', 'DRAFT', 'PLANNED'].includes(m.status));
  const moDone  = summary?.moDone ?? (soMos.length > 0 && soMos.every(m => m.status === 'DONE'));
  const soConf  = selectedOrder ? ['CONFIRMED','IN_PROGRESS','COMPLETED','PARTIALLY_DELIVERED','FULLY_DELIVERED'].includes(selectedOrder.status) : false;
  const soDone  = selectedOrder ? ['COMPLETED','FULLY_DELIVERED'].includes(selectedOrder.status) : false;
  const readyForDelivery = summary?.readyForDelivery ?? false;
  const needsFulfillment = summary?.hasShortage && !hasMo && (flowAnalysis?.linkedPurchaseOrders?.length ?? 0) === 0;
  const primaryRec = flowAnalysis?.lines.find(l => l.shortage > 0)?.recommendation;
  const linkedPos = flowAnalysis?.linkedPurchaseOrders ?? [];
  const hasPo = summary?.hasPo ?? linkedPos.length > 0;
  const poDraft = summary?.poDraft ?? linkedPos.some(p => p.status === 'DRAFT');
  const poAwaitingReceipt = summary?.poAwaitingReceipt ?? linkedPos.some(p => ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(p.status));
  const poReceived = summary?.poReceived ?? (hasPo && linkedPos.every(p => p.status === 'FULLY_DELIVERED'));
  const draftPo = linkedPos.find(p => p.status === 'DRAFT');
  const receivablePo = linkedPos.find(p => ['CONFIRMED', 'PARTIALLY_DELIVERED'].includes(p.status));

  const lineCount = flowAnalysis?.lines.length ?? selectedOrder?.lines?.length ?? 0;
  const costDetail = flowAnalysis?.lines.map(l =>
    l.shortage === 0
      ? `✓ ${l.productName}: ${l.availableQty} in stock (need ${l.orderedQty})`
      : `${l.productName}: need ${l.shortage} more · Vendor ₹${l.vendorCost.toLocaleString()} vs Make ₹${(l.manufacturingCost ?? 0).toLocaleString()} → ${l.recommendation}`
  ).join('\n');

  const steps = selectedOrder ? [
    {
      id: 'so',
      label: 'Sales Order',
      icon: ShoppingCart,
      status: (soConf ? 'done' : 'active') as FlowStepStatus,
      description: `${selectedOrder.customerName} — ${selectedOrder.orderNumber}`,
      detail: `${lineCount} line item(s) — ₹${Number(selectedOrder.totalAmount).toLocaleString()}`,
      timestamp: selectedOrder.createdAt,
      action: selectedOrder.status === 'DRAFT' ? {
        label: 'Confirm Order',
        icon: Play,
        color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        id: 'confirm',
        onClick: confirmOrder,
        hint: 'Checks stock + compares make vs buy costs',
      } : null,
    },
    {
      id: 'inventory',
      label: 'Inventory & Cost Check',
      icon: Scale,
      status: (soConf ? 'done' : 'pending') as FlowStepStatus,
      description: soConf ? 'Stock checked · manufacturing vs vendor cost compared' : 'Waiting for confirmation',
      detail: soConf ? (costDetail || 'Analyzing…') : undefined,
      action: null,
    },
    {
      id: 'fulfill',
      label: primaryRec === 'PURCHASE' || hasPo ? 'Procurement' : 'Manufacturing Order',
      icon: primaryRec === 'PURCHASE' || hasPo ? ShoppingBag : Factory,
      status: (poReceived || moDone ? 'done' : hasPo ? (poAwaitingReceipt ? 'active' : poDraft ? 'active' : 'pending') : hasMo ? (moInProg ? 'active' : 'pending') : soConf && needsFulfillment ? 'active' : soConf && summary?.allInStock ? 'skipped' : 'pending') as FlowStepStatus,
      description: hasMo
        ? `${soMos.length} MO(s): ${soMos.map(m => m.orderNumber).join(', ')}`
        : hasPo
        ? `PO: ${linkedPos.map(p => `${p.orderNumber} (${p.status.replace(/_/g, ' ')})`).join(', ')}`
        : summary?.allInStock
        ? 'Not needed — stock available'
        : needsFulfillment
        ? `Recommended: ${primaryRec === 'MANUFACTURE' ? 'Make in-house' : 'Buy from vendor'}`
        : 'Waiting for confirmation',
      detail: hasMo
        ? soMos.map(m => `${m.orderNumber} · ${m.status}`).join('\n')
        : hasPo
        ? linkedPos.map(p => `${p.orderNumber}: ${p.status.replace(/_/g, ' ')}`).join('\n')
        : flowAnalysis?.lines.find(l => l.shortage > 0)?.reason,
      action: soConf && needsFulfillment ? {
        label: primaryRec === 'PURCHASE' ? 'Create Purchase Order (Vendor Cheaper)' : 'Create Manufacturing Order (Make Cheaper)',
        icon: primaryRec === 'PURCHASE' ? ShoppingBag : Factory,
        color: primaryRec === 'PURCHASE' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white',
        id: primaryRec === 'PURCHASE' ? 'create_po' : 'create_mo',
        onClick: () => fulfillShortage('AUTO'),
        hint: flowAnalysis?.lines.find(l => l.shortage > 0)?.reason ?? 'Auto-routes by lowest cost',
      } : poDraft && draftPo ? {
        label: `Confirm ${draftPo.orderNumber}`,
        icon: CheckCircle2,
        color: 'bg-blue-600 hover:bg-blue-700 text-white',
        id: 'confirm_po',
        onClick: () => confirmPurchaseOrder(draftPo.id),
        hint: 'PO must be confirmed before goods can be received',
      } : poAwaitingReceipt && receivablePo ? {
        label: `Receive ${receivablePo.orderNumber}`,
        icon: Package,
        color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        id: 'receive_po',
        onClick: () => receivePurchaseOrder(receivablePo.id),
        hint: 'Updates inventory and unlocks delivery',
      } : hasMo && !moDone ? {
        label: 'Go to Production Floor →',
        icon: Zap,
        color: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
        id: 'production_link',
        onClick: () => { window.location.href = '/production-floor'; },
        hint: summary?.workOrdersProgress ? `${summary.workOrdersProgress} work orders done` : null,
      } : null,
    },
    {
      id: 'production',
      label: 'Production',
      icon: Factory,
      status: (hasPo && !hasMo ? 'skipped' : moDone ? 'done' : moInProg ? 'active' : hasMo ? 'pending' : 'skipped') as FlowStepStatus,
      description: hasMo ? 'Work orders on shop floor' : hasPo ? 'Skipped — procured from vendor' : 'Skipped — no manufacturing needed',
      detail: summary?.workOrdersProgress
        ? `${summary.workOrdersProgress} work orders completed`
        : undefined,
      action: moInProg && !moDone ? {
        label: 'Complete Work Orders →',
        icon: Zap,
        color: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200',
        id: 'view_floor',
        onClick: () => { window.location.href = '/production-floor'; },
        hint: null,
      } : null,
    },
    {
      id: 'stock',
      label: 'Inventory Update',
      icon: Package,
      status: (moDone || poReceived || summary?.allInStock ? 'done' : 'pending') as FlowStepStatus,
      description: moDone ? 'Finished goods added to stock' : poReceived ? 'Purchased goods received into stock' : summary?.allInStock ? 'Stock reserved from inventory' : poAwaitingReceipt ? 'Awaiting PO receipt' : 'Awaiting production',
      detail: moDone ? 'Stock ledger updated from production' : poReceived ? 'Stock ledger updated from purchase receipt' : summary?.allInStock ? 'Ready from existing stock' : undefined,
      action: null,
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: Truck,
      status: (soDone ? 'done' : readyForDelivery ? 'active' : 'pending') as FlowStepStatus,
      description: soDone ? 'Order delivered ✓' : readyForDelivery ? 'Ready to dispatch' : poAwaitingReceipt ? 'Blocked — receive PO goods first' : 'Blocked — complete production first',
      timestamp: soDone ? selectedOrder.createdAt : undefined,
      action: soConf && !soDone && readyForDelivery ? {
        label: 'Mark as Delivered',
        icon: Truck,
        color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
        id: 'deliver',
        onClick: deliverOrder,
        hint: 'Closes order and updates stock',
      } : null,
    },
  ] : [];

  const filteredOrders = orders.filter(o =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Flow Tracker</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track and advance every order: Customer → Inventory → Manufacturing → Delivery
        </p>
      </div>

      {/* End-to-end flow guide */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Order lifecycle — start here &amp; move forward</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { step: '1', label: 'Create SO', desc: 'Sales Orders → New' },
            { step: '2', label: 'Confirm', desc: 'Button on selected order' },
            { step: '3', label: 'Inventory', desc: 'Automatic on confirm' },
            { step: '4', label: 'Fulfill', desc: 'Create MO or PO if shortage' },
            { step: '5', label: 'Produce / Receive', desc: 'Production Floor or PO receipt' },
            { step: '6', label: 'Deliver', desc: 'Mark Delivered' },
          ].map((s, i, arr) => (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 px-3 py-2">
                <span className="h-6 w-6 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                <div>
                  <p className="font-semibold text-slate-800">{s.label}</p>
                  <p className="text-[10px] text-slate-400">{s.desc}</p>
                </div>
              </div>
              {i < arr.length - 1 && <span className="text-slate-300 hidden sm:inline">→</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Order list ─────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2 justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search orders…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <button onClick={fetchData} title="Refresh"
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-[72vh] overflow-y-auto">
            {loading && [...Array(6)].map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse">
                <div className="h-3 w-24 bg-slate-200 rounded-full mb-1.5" />
                <div className="h-2.5 w-32 bg-slate-100 rounded-full" />
              </div>
            ))}
            {!loading && filteredOrders.map(order => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <button key={order.id} onClick={() => selectOrder(order)}
                  className={`w-full text-left flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-indigo-50 border-l-2 border-indigo-600' : ''
                  }`}>
                  <div>
                    <p className={`text-sm font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-700'}`}>
                      {order.orderNumber}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{order.customerName}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SO_STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-500'}`}>
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <ChevronRight className={`h-3.5 w-3.5 ${isSelected ? 'text-indigo-400' : 'text-slate-300'}`} />
                  </div>
                </button>
              );
            })}
            {!loading && filteredOrders.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-8">No orders found</p>
            )}
          </div>
        </div>

        {/* ── Flow timeline ───────────────────────────────────────────────────── */}
        <div className="lg:col-span-2">
          {!selectedOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <ArrowRight className="h-8 w-8 text-indigo-400" />
              </div>
              <p className="text-slate-600 font-semibold">Select an order to track</p>
              <p className="text-slate-400 text-sm">Customer → Inventory → Manufacturing → Delivery</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">

              {/* Order header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/60 to-purple-50/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Tracking</p>
                    <h2 className="text-xl font-bold text-slate-900 mt-0.5">{selectedOrder.orderNumber}</h2>
                    <p className="text-sm text-slate-500">{selectedOrder.customerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-slate-800">₹{Number(selectedOrder.totalAmount).toLocaleString()}</p>
                    <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-full ${SO_STATUS_COLOR[selectedOrder.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {selectedOrder.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Flow steps */}
              <div className="px-6 py-6">
                <div className="relative">
                  {steps.map((step, idx) => {
                    const style  = STATUS_STYLE[step.status];
                    const Icon   = step.icon;
                    const isLast = idx === steps.length - 1;

                    return (
                      <div key={step.id} className="flex gap-5 relative">
                        {/* Dot + connector line */}
                        <div className="flex flex-col items-center">
                          <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ring-2 ${style.ring} ${style.bg} shadow-sm shrink-0`}>
                            {step.status === 'done'   ? <CheckCircle2 className="h-5 w-5 text-white" /> :
                             step.status === 'failed'  ? <XCircle className="h-5 w-5 text-red-500" /> :
                             step.status === 'active'  ? <Icon className={`h-5 w-5 ${style.icon} animate-pulse`} /> :
                                                         <Icon className={`h-5 w-5 ${style.icon}`} />}
                          </div>
                          {!isLast && <div className={`w-0.5 flex-1 min-h-[32px] ${style.line}`} />}
                        </div>

                        {/* Content */}
                        <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-7'}`}>
                          <div className="flex items-start justify-between gap-2 mt-1.5">
                            <div className="min-w-0">
                              <p className={`font-semibold text-sm ${
                                step.status === 'done'   ? 'text-slate-800' :
                                step.status === 'active' ? 'text-indigo-700' :
                                                           'text-slate-400'
                              }`}>{step.label}</p>
                              <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                            </div>
                            {/* Status badge */}
                            <div className="text-right shrink-0">
                              {step.status === 'done' && (
                                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold">
                                  <CheckCircle2 className="h-3 w-3" /> Done
                                </span>
                              )}
                              {step.status === 'active' && (
                                <span className="flex items-center gap-1 text-[10px] text-indigo-600 font-semibold animate-pulse">
                                  <Clock className="h-3 w-3" /> Active
                                </span>
                              )}
                              {step.status === 'pending' && (
                                <span className="text-[10px] text-slate-400">Pending</span>
                              )}
                              {step.timestamp && (
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {new Date(step.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Detail pill */}
                          {'detail' in step && step.detail && (
                            <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100 whitespace-pre-line">
                              {step.detail}
                            </p>
                          )}

                          {/* Action button */}
                          {step.action && (
                            <div className="mt-3 flex flex-col gap-1">
                              <button
                                onClick={step.action.onClick}
                                disabled={actionLoading === step.action.id}
                                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${step.action.color}`}
                              >
                                {actionLoading === step.action.id
                                  ? <RefreshCw className="h-4 w-4 animate-spin" />
                                  : <step.action.icon className="h-4 w-4" />}
                                {actionLoading === step.action.id ? 'Processing…' : step.action.label}
                              </button>
                              {step.action.hint && (
                                <p className="text-[11px] text-slate-400 pl-1">{step.action.hint}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer: next action summary */}
              {selectedOrder && !soDone && summary && (
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5 text-indigo-400" />
                    Next: {summary.nextAction}
                  </p>
                </div>
              )}
              {soDone && (
                <div className="px-6 py-4 border-t border-slate-100 bg-emerald-50">
                  <p className="text-xs text-emerald-700 flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Order complete — fully delivered to {selectedOrder.customerName}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FlowTrackerPage() {
  return (
    <Suspense fallback={<div className="text-slate-500 text-sm p-8">Loading…</div>}>
      <FlowTrackerContent />
    </Suspense>
  );
}
