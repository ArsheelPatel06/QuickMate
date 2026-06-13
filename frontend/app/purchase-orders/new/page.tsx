"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Truck, Plus, Trash2, ArrowLeft, Loader2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface Vendor  { id: string; name: string }
interface Product { id: string; name: string; sku: string; costPrice: string | number }
interface Line    { productId: string; quantity: number; unitPrice: number }

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [vendors, setVendors]       = useState<Vendor[]>([]);
  const [products, setProducts]     = useState<Product[]>([]);
  const [vendorId, setVendorId]     = useState('');
  const [lines, setLines]           = useState<Line[]>([{ productId: '', quantity: 1, unitPrice: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/vendors?limit=100`, { headers: h }).then(r => r.json()),
      fetch(`${API}/products?limit=200`, { headers: h }).then(r => r.json()),
    ]).then(([vd, pd]) => {
      setVendors(vd.data?.vendors ?? vd.data ?? []);
      setProducts(pd.data?.products ?? pd.data ?? []);
    });
  }, []);

  const updateLine = (i: number, field: keyof Line, val: string | number) => {
    setLines(prev => {
      const next = [...prev];
      if (field === 'productId') {
        const p = products.find(p => p.id === val);
        next[i] = { ...next[i], productId: val as string, unitPrice: p ? Number(p.costPrice) : 0 };
      } else {
        next[i] = { ...next[i], [field]: Number(val) };
      }
      return next;
    });
  };

  const addLine    = () => setLines(p => [...p, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!vendorId) return setError('Please select a vendor.');
    if (lines.some(l => !l.productId)) return setError('Select a product for every line.');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendorId, lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create purchase order');
      router.push('/purchase-orders');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/purchase-orders" className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-indigo-700 flex items-center justify-center">
              <Truck className="h-4 w-4 text-white" />
            </span>
            New Request for Quotation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Creates a Draft RFQ — approve to convert to a Purchase Order</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3.5">
            <p className="text-sm text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Vendor */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-4">Vendor</h2>
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Select Vendor</label>
            <select required value={vendorId} onChange={e => setVendorId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20">
              <option value="">— Choose vendor —</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            {vendors.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">No vendors found. Add vendors first.</p>
            )}
          </div>
        </div>

        {/* Lines */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800">Purchase Lines</h2>
            <button type="button" onClick={addLine}
              className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors">
              <Plus className="h-3.5 w-3.5" /> Add Line
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {lines.map((line, i) => (
              <div key={i} className="px-5 py-4 grid grid-cols-12 gap-3 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1.5">Product</label>}
                  <select required value={line.productId} onChange={e => updateLine(i, 'productId', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                    <option value="">Select product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1.5">Qty</label>}
                  <input type="number" min={1} required value={line.quantity}
                    onChange={e => updateLine(i, 'quantity', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div className="col-span-3">
                  {i === 0 && <label className="block text-xs font-semibold text-slate-500 mb-1.5">Unit Price (₹)</label>}
                  <input type="number" min={0} step="0.01" required value={line.unitPrice}
                    onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
                </div>
                <div className="col-span-2 flex justify-end">
                  {lines.length > 1 && (
                    <button type="button" onClick={() => removeLine(i)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-50 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
            <p className="text-sm font-bold text-slate-700">Total: ₹{total.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/purchase-orders"
            className="flex-1 flex items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
            Cancel
          </Link>
          <button type="submit" disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-indigo-700 py-3 text-sm font-bold text-white hover:bg-indigo-800 disabled:opacity-50 transition-all shadow-sm">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : 'Create RFQ (Draft)'}
          </button>
        </div>
      </form>
    </div>
  );
}
