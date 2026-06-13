"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Factory, Search, Plus, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

interface MO {
  id: string;
  orderNumber: string;
  status: string;
  plannedQuantity: number;
  completedQuantity: number;
  createdAt: string;
  product: { name: string; sku: string };
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const STATUS_OPTIONS = ['ALL', 'DRAFT', 'PLANNED', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

const STATUS_STYLE: Record<string, string> = {
  DRAFT:       'bg-gray-100 text-gray-600',
  PLANNED:     'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  DONE:        'bg-green-100 text-green-700',
  CANCELLED:   'bg-red-100 text-red-600',
};
const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', PLANNED: 'Planned', IN_PROGRESS: 'In Progress', DONE: 'Done', CANCELLED: 'Cancelled',
};

export default function ManufacturingOrdersPage() {
  const [orders,      setOrders]      = useState<MO[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [statusFilter, setFilter]     = useState('ALL');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const statusParam = statusFilter !== 'ALL' ? `&status=${statusFilter}` : '';
      const res = await fetch(
        `${API}/manufacturing-orders?page=${page}&limit=15${statusParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders ?? []);
        setTotalPages(json.data.pagination?.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Factory className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <nav className="text-xs text-gray-400 mb-0.5">
              <Link href="/manufacturing" className="hover:text-purple-600">Manufacturing</Link>
              <span className="mx-1">/</span>
              <span className="text-gray-600">Orders</span>
            </nav>
            <h1 className="text-2xl font-bold text-gray-900">Manufacturing Orders</h1>
          </div>
        </div>
        <Link
          href="/manufacturing-orders/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-700 text-white rounded-lg text-sm font-semibold hover:bg-indigo-800 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create MO
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white rounded-xl border border-gray-200">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-xs font-medium text-gray-500 mr-1">Status:</span>
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-indigo-700 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'All' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-6 w-6 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['MO Number', 'Product', 'SKU', 'Qty', 'Progress', 'Status', 'Created', ''].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">No manufacturing orders found</td></tr>
                ) : orders.map(mo => {
                  const pct = mo.plannedQuantity > 0
                    ? Math.round((mo.completedQuantity / mo.plannedQuantity) * 100) : 0;
                  return (
                    <tr key={mo.id} className="hover:bg-orange-50/20 transition-colors group">
                      <td className="px-5 py-3.5">
                        <Link href={`/manufacturing-orders/${mo.id}`} className="font-bold text-purple-600 hover:text-purple-700 text-sm">
                          {mo.orderNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{mo.product.name}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-400 font-mono">{mo.product.sku}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{mo.plannedQuantity}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-1.5 bg-indigo-700 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[mo.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABEL[mo.status] ?? mo.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {new Date(mo.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/manufacturing-orders/${mo.id}`} className="text-xs text-purple-600 hover:text-purple-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          View →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-40 transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
