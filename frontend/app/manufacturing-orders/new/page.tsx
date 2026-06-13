"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Factory, ArrowLeft, Loader2, Info } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Product { id: string; name: string; sku: string }
interface BOM     { id: string; name: string; productId: string; quantity: number }

export default function NewManufacturingOrderPage() {
  const router = useRouter();
  const [products, setProducts]       = useState<Product[]>([]);
  const [boms, setBoms]               = useState<BOM[]>([]);
  const [productId, setProductId]     = useState('');
  const [bomId, setBomId]             = useState('');
  const [quantity, setQuantity]       = useState(1);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/products?limit=200`, { headers: h }).then(r => r.json()),
      fetch(`${API}/boms?limit=100`, { headers: h }).then(r => r.json()),
    ]).then(([pd, bd]) => {
      setProducts(pd.data?.products ?? pd.data ?? []);
      setBoms(bd.data?.boms ?? bd.data ?? []);
    });
  }, []);

  const productBoms = boms.filter(b => b.productId === productId);

  const handleProductChange = (pid: string) => {
    setProductId(pid);
    const matchBoms = boms.filter(b => b.productId === pid);
    setBomId(matchBoms.length === 1 ? matchBoms[0].id : '');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!productId) return setError('Select a product.');
    if (quantity < 1) return setError('Quantity must be at least 1.');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/manufacturing-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, bomId: bomId || undefined, plannedQuantity: quantity }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create manufacturing order');
      router.push('/manufacturing/orders');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/manufacturing/orders" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center">
              <Factory className="h-4 w-4 text-white" />
            </span>
            New Manufacturing Order
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Work orders are generated automatically from the BOM</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">

          {/* Product */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Product to Manufacture</label>
            <select required value={productId} onChange={e => handleProductChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20">
              <option value="">— Select product —</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
            </select>
          </div>

          {/* BOM */}
          {productId && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bill of Materials</label>
              {productBoms.length === 0 ? (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-700">No BOM found for this product. <Link href="/manufacturing/boms" className="font-semibold underline">Create a BOM first.</Link></p>
                </div>
              ) : productBoms.length === 1 ? (
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3">
                  <p className="text-sm font-semibold text-indigo-700">{productBoms[0].name}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">Auto-selected (only BOM for this product)</p>
                </div>
              ) : (
                <select required value={bomId} onChange={e => setBomId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  <option value="">— Choose BOM —</option>
                  {productBoms.map(b => <option key={b.id} value={b.id}>{b.name} (qty: {b.quantity})</option>)}
                </select>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Planned Quantity</label>
            <div className="flex gap-2">
              <input type="number" min={1} required value={quantity} onChange={e => setQuantity(Number(e.target.value))}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              <div className="flex gap-1">
                {[10, 25, 50, 100].map(q => (
                  <button key={q} type="button" onClick={() => setQuantity(q)}
                    className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      quantity === q ? 'bg-indigo-700 text-white border-indigo-500' : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-400'
                    }`}>{q}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2">
            <Info className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">Work orders for each BOM operation (Assembly, Paint, Packaging) will be created automatically. You can manage them on the <Link href="/production-floor" className="text-indigo-600 font-semibold">Production Floor</Link>.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/manufacturing/orders"
            className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting || (productId !== '' && productBoms.length === 0)}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-700 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50 transition-all shadow-sm">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create Manufacturing Order'}
          </button>
        </div>
      </form>
    </div>
  );
}
