"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Package, Factory, Truck, Clock, AlertTriangle, CheckCircle2, DollarSign, Zap } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Product {
  id: string;
  name: string;
  sku: string;
  onHandQty: number;
}

interface BOM {
  id: string;
  name: string;
  productId: string;
  bomLines: Array<{
    quantity: number;
    product: { id: string; name: string; sku: string; onHandQty: number; reservedQty: number; costPrice: string | number };
  }>;
}

interface SimulationResult {
  product: string;
  quantity: number;
  materials: Array<{
    name: string;
    required: number;
    available: number;
    gap: number;
    status: 'OK' | 'SHORTAGE' | 'CRITICAL';
    costNeeded: number;
  }>;
  totalProcurementCost: number;
  estimatedDelay: number;
  feasibility: 'GREEN' | 'AMBER' | 'RED';
  summary: string;
  bottleneckRisk: string;
}

export default function SimulatePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [boms, setBoms] = useState<BOM[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(50);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchProducts = useCallback(async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        fetch(`${API}/products?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/boms?limit=100`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const pData = await pRes.json();
      const bData = await bRes.json();
      const allProducts: Product[] = pData.data?.products ?? pData.data ?? [];
      const allBoms: BOM[] = bData.data?.boms ?? bData.data ?? [];
      // Only show products that have a BOM
      const bomProductIds = new Set(allBoms.map((b: BOM) => b.productId));
      setProducts(allProducts.filter(p => bomProductIds.has(p.id)));
      setBoms(allBoms);
    } catch {}
  }, [token]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const runSimulation = async () => {
    if (!selectedProductId || !quantity) return;

    setRunning(true);
    setResult(null);
    setError('');

    try {
      const bomSummary = boms.find(b => b.productId === selectedProductId);
      const product = products.find(p => p.id === selectedProductId);
      if (!bomSummary || !product) {
        throw new Error('Product or BOM not found.');
      }

      // List endpoint does not include bomLines — fetch full BOM detail
      const res = await fetch(`${API}/boms/${bomSummary.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Failed to load BOM details');

      const bomLines = payload.data?.bomLines ?? [];
      if (bomLines.length === 0) {
        throw new Error('This BOM has no components configured.');
      }

      const bomQty = Number(payload.data?.quantity ?? 1) || 1;
      const multiplier = quantity / bomQty;

      const materials = bomLines.map((line: BOM['bomLines'][number]) => {
        const required  = line.quantity * multiplier;
        const available = Math.max(0, line.product.onHandQty - (line.product.reservedQty ?? 0));
        const gap       = Math.max(0, required - available);
        const costPrice = Number(line.product.costPrice ?? 0);
        const status: 'OK' | 'SHORTAGE' | 'CRITICAL' =
          gap === 0 ? 'OK' : gap > required * 0.5 ? 'CRITICAL' : 'SHORTAGE';
        return {
          name:        line.product.name,
          required:    Math.round(required * 100) / 100,
          available,
          gap:         Math.round(gap * 100) / 100,
          status,
          costNeeded:  gap * costPrice,
        };
      });

      const shortages        = materials.filter(m => m.status !== 'OK');
      const criticalCount    = materials.filter(m => m.status === 'CRITICAL').length;
      const totalCost        = materials.reduce((s, m) => s + m.costNeeded, 0);
      const estimatedDelay   = criticalCount > 0 ? 5 + criticalCount * 2 : shortages.length > 0 ? 3 : 0;
      const feasibility: 'GREEN' | 'AMBER' | 'RED' =
        criticalCount > 0 ? 'RED' : shortages.length > 0 ? 'AMBER' : 'GREEN';

      const summary =
        feasibility === 'GREEN' ? `✅ All materials available. Order for ${quantity} can start immediately.`
        : feasibility === 'AMBER' ? `⚠ ${shortages.length} material(s) short. Estimated delay: ${estimatedDelay} days. Purchase orders required.`
        : `🔴 ${criticalCount} CRITICAL shortage(s). Order for ${quantity} units will be delayed ${estimatedDelay}+ days without urgent procurement.`;

      const bottleneckRisk = criticalCount > 1
        ? 'HIGH — Multiple critical shortages will strain procurement and production simultaneously.'
        : shortages.length > 0
        ? 'MEDIUM — Some procurement needed but manageable.'
        : 'LOW — Production can proceed without bottleneck risk.';

      setResult({ product: product.name, quantity, materials, totalProcurementCost: totalCost, estimatedDelay, feasibility, summary, bottleneckRisk });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
    } finally {
      setRunning(false);
    }
  };

  const FEASIBILITY_STYLE: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    GREEN: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-500' },
    AMBER: { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-800',   badge: 'bg-amber-500'   },
    RED:   { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-800',     badge: 'bg-red-500'     },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center">
            <FlaskConical className="h-4 w-4 text-white" />
          </span>
          Production Simulation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Enter any product and quantity. The simulator analyses BOM requirements, detects material gaps, and estimates procurement cost + delay.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Input panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-800">Simulation Parameters</h2>

            {/* Product selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Select Product</label>
              <select
                value={selectedProductId}
                onChange={e => { setSelectedProductId(e.target.value); setResult(null); }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              >
                <option value="">— Choose a product with BOM —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Order Quantity</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={quantity}
                  onChange={e => { setQuantity(Number(e.target.value)); setResult(null); }}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400"
                />
                <div className="flex gap-1">
                  {[10, 25, 50, 100].map(q => (
                    <button
                      key={q}
                      onClick={() => { setQuantity(q); setResult(null); }}
                      className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                        quantity === q ? 'bg-indigo-700 text-white border-cyan-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                      }`}
                    >{q}</button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={runSimulation}
              disabled={!selectedProductId || running}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-indigo-500/20 transition-all"
            >
              {running ? (
                <><FlaskConical className="h-4 w-4 animate-bounce" /> Running Simulation…</>
              ) : (
                <><Zap className="h-4 w-4" /> Run Simulation</>
              )}
            </button>

            {/* Quick example tip */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <p className="text-xs text-slate-500 font-medium mb-1">Try this scenario:</p>
              <p className="text-xs text-slate-400">Select <strong>Dining Table</strong>, enter quantity <strong>100</strong> — expect critical shortages in wooden tops and legs.</p>
            </div>
          </div>
        </div>

        {/* Results panel */}
        <div className="lg:col-span-3">
          {!result && !running && (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <FlaskConical className="h-8 w-8 text-purple-400" />
              </div>
              <p className="text-slate-500 font-medium">Run a simulation to see results</p>
              <p className="text-slate-400 text-sm text-center max-w-xs">
                The engine will check your BOM, calculate material requirements, and estimate delays and costs.
              </p>
            </div>
          )}

          {running && (
            <div className="bg-white rounded-2xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-4 animate-pulse">
              <FlaskConical className="h-12 w-12 text-purple-400 animate-bounce" />
              <p className="text-slate-600 font-semibold">Analysing BOM requirements…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Feasibility summary */}
              {(() => {
                const style = FEASIBILITY_STYLE[result.feasibility];
                return (
                  <div className={`rounded-2xl border ${style.border} ${style.bg} p-5`}>
                    <div className="flex items-start gap-3">
                      <span className={`h-3 w-3 rounded-full mt-1.5 shrink-0 ${style.badge}`} />
                      <div>
                        <p className={`font-bold text-base ${style.text}`}>{result.summary}</p>
                        <div className="mt-3 grid grid-cols-3 gap-3">
                          <div className={`rounded-xl bg-white/60 border ${style.border} p-3 text-center`}>
                            <DollarSign className={`h-4 w-4 mx-auto mb-1 ${style.text}`} />
                            <p className={`text-lg font-black ${style.text}`}>₹{Math.round(result.totalProcurementCost).toLocaleString()}</p>
                            <p className="text-[10px] text-slate-500">Procurement Cost</p>
                          </div>
                          <div className={`rounded-xl bg-white/60 border ${style.border} p-3 text-center`}>
                            <Clock className={`h-4 w-4 mx-auto mb-1 ${style.text}`} />
                            <p className={`text-lg font-black ${style.text}`}>{result.estimatedDelay === 0 ? '0' : `+${result.estimatedDelay}`}</p>
                            <p className="text-[10px] text-slate-500">Days Delay</p>
                          </div>
                          <div className={`rounded-xl bg-white/60 border ${style.border} p-3 text-center`}>
                            <Factory className={`h-4 w-4 mx-auto mb-1 ${style.text}`} />
                            <p className={`text-lg font-black ${style.text}`}>{result.quantity}</p>
                            <p className="text-[10px] text-slate-500">Units Ordered</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Material breakdown */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800">Material Requirements</h3>
                  <p className="text-xs text-slate-500 mt-0.5">BOM breakdown for {result.quantity} × {result.product}</p>
                </div>
                <div className="divide-y divide-slate-100">
                  {result.materials.map((m, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        m.status === 'OK' ? 'bg-emerald-100' : m.status === 'SHORTAGE' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        {m.status === 'OK'
                          ? <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          : <AlertTriangle className={`h-4 w-4 ${m.status === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700">{m.name}</p>
                        <div className="flex gap-3 text-xs text-slate-400 mt-0.5">
                          <span>Need: <strong className="text-slate-600">{m.required}</strong></span>
                          <span>Have: <strong className="text-slate-600">{m.available}</strong></span>
                          {m.gap > 0 && <span className="text-red-600 font-semibold">Gap: {m.gap}</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {m.gap > 0 && (
                          <p className="text-sm font-bold text-slate-700">₹{Math.round(m.costNeeded).toLocaleString()}</p>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          m.status === 'OK' ? 'bg-emerald-100 text-emerald-700'
                          : m.status === 'SHORTAGE' ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        }`}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottleneck risk */}
              <div className="rounded-2xl bg-white border border-slate-200 px-5 py-4">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-orange-500" /> Bottleneck Risk
                </h3>
                <p className="text-sm text-slate-600">{result.bottleneckRisk}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
