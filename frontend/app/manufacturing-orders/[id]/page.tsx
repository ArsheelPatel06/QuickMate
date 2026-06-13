"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileClock, Loader2, Factory, PlayCircle, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function ManufacturingOrderFormPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'COMPONENTS' | 'OPERATIONS'>('COMPONENTS');

  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<{id: string, name: string}[]>([]);
  const [boms, setBoms] = useState<{id: string, name: string}[]>([]);

  // Create Form State
  const [formData, setFormData] = useState({
    productId: '',
    plannedQuantity: 1,
    bomId: ''
  });

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/v1/manufacturing-orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
      } else {
        setError(data.message || 'Failed to load Manufacturing Order');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        const [prodRes, bomsRes] = await Promise.all([
          fetch(`http://localhost:3000/api/v1/products?limit=1000`, { headers }),
          fetch(`http://localhost:3000/api/v1/boms?limit=1000`, { headers })
        ]);

        const prodData = await prodRes.json();
        const bomsData = await bomsRes.json();

        if (prodData.success) setProducts(prodData.data.products || []);
        if (bomsData.success) setBoms(bomsData.data.boms || []);
      } catch (err: any) {
        console.error('Failed to load master data', err);
      }
    };

    if (isNew) {
      fetchMasterData().then(() => setLoading(false));
    } else {
      fetchOrder();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, params.id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/v1/manufacturing-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          productId: formData.productId,
          bomId: formData.bomId || undefined,
          plannedQuantity: formData.plannedQuantity,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create MO');
      }

      router.push(`/manufacturing-orders/${data.data.id}`);

    } catch (err: any) {
      setError(err.message);
      setSaving(false);
    }
  };

  // Process a Work Order -> The true "Produce" action
  const handleCompleteWorkOrder = async (workOrderId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/v1/manufacturing-orders/${order.id}/work-orders/${workOrderId}/complete`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ actualDuration: 60 }) // Defaulting actual duration for UI simplicity
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      // Refresh the MO data directly
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">Draft</span>;
      case 'PLANNED': return <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">Planned</span>;
      case 'IN_PROGRESS': return <span className="inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800">In Progress</span>;
      case 'DONE': return <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">Done</span>;
      case 'CANCELLED': return <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">Cancelled</span>;
      default: return <span>{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/manufacturing-orders"
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Factory className="h-6 w-6 text-blue-600" />
              {isNew ? 'New Manufacturing Order' : order?.orderNumber}
            </h1>
          </div>
          {!isNew && order && (
            <div className="ml-2">
              {getStatusBadge(order.status)}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/audit-logs?entity=ManufacturingOrder&entityId=${order?.id}`)}
                className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FileClock className="-ml-0.5 h-4 w-4 text-gray-500" aria-hidden="true" />
                Logs
              </button>
              
              {/* Fake global action buttons mapped to wireframe, functionality driven by Operations Tab */}
              {order?.status !== 'DONE' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="-ml-0.5 h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
              )}
            </>
          )}

          {isNew && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 transition-colors"
            >
              {saving ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <Save className="-ml-0.5 h-4 w-4" />}
              Save & Confirm
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        
        {/* Top Header Section */}
        <div className="p-6 sm:p-8 grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
          
          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Product
            </label>
            <div className="mt-2">
              {isNew ? (
                <select
                  className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                >
                  <option value="">Select a Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              ) : (
                <div className="block w-full rounded-lg border border-transparent bg-gray-50 py-2.5 px-3 text-gray-900 sm:text-sm font-medium">
                  {order?.product?.name}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Quantity to Produce
            </label>
            <div className="mt-2">
              {isNew ? (
                <input
                  type="number"
                  min="1"
                  className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                  value={formData.plannedQuantity}
                  onChange={(e) => setFormData({ ...formData, plannedQuantity: parseInt(e.target.value, 10) || 1 })}
                />
              ) : (
                <div className="block w-full rounded-lg border border-transparent bg-gray-50 py-2.5 px-3 text-gray-900 sm:text-sm font-medium">
                  {order?.completedQuantity || 0} / {order?.plannedQuantity}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Bill of Materials (BOM)
            </label>
            <div className="mt-2">
              {isNew ? (
                <select
                  className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                  value={formData.bomId}
                  onChange={(e) => setFormData({ ...formData, bomId: e.target.value })}
                >
                  <option value="">Auto-detect from Product</option>
                  {boms.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              ) : (
                <div className="block w-full rounded-lg border border-transparent bg-gray-50 py-2.5 px-3 text-gray-500 sm:text-sm">
                  Loaded dynamically from schema
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Responsible Assignee
            </label>
            <div className="mt-2">
              <div className="block w-full rounded-lg border border-transparent bg-gray-50 py-2.5 px-3 text-gray-500 sm:text-sm">
                System Administrator
              </div>
            </div>
          </div>

        </div>

        {!isNew && order && (
          <>
            {/* Tabs */}
            <div className="px-6 sm:px-8 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab('COMPONENTS')}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'COMPONENTS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Components
                </button>
                <button
                  onClick={() => setActiveTab('OPERATIONS')}
                  className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                    activeTab === 'OPERATIONS'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  Work Orders
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6 sm:p-8 bg-gray-50 min-h-[300px]">
              
              {/* COMPONENTS TAB */}
              {activeTab === 'COMPONENTS' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Component Product</th>
                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Expected Qty</th>
                        <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">Consumed Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.bom?.bomLines?.map((line: any) => {
                        const ratio = order.plannedQuantity / order.bom.quantity;
                        const reqQty = line.quantity * ratio;
                        const consumed = order.status === 'DONE' ? reqQty : 0;
                        return (
                          <tr key={line.id}>
                            <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 font-medium text-gray-900">
                              {line.product?.name}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-gray-500">
                              {reqQty}
                            </td>
                            <td className="whitespace-nowrap px-6 py-3 text-right text-gray-900 font-semibold">
                              {consumed}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* OPERATIONS TAB */}
              {activeTab === 'OPERATIONS' && (
                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Operation</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Work Center</th>
                        <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">Status</th>
                        <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {order.workOrders?.sort((a:any, b:any) => a.sequence - b.sequence).map((wo: any) => (
                        <tr key={wo.id}>
                          <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 text-gray-900 font-medium">
                            {wo.operationName} <span className="text-xs text-gray-400 font-normal ml-2">({wo.plannedDuration} min)</span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-gray-500">
                            {wo.workCenter?.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-center">
                            {wo.status === 'DONE' 
                              ? <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">Done</span>
                              : <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10">Pending</span>
                            }
                          </td>
                          <td className="whitespace-nowrap px-6 py-3 text-right">
                            {wo.status !== 'DONE' && (
                              <button
                                onClick={() => handleCompleteWorkOrder(wo.id)}
                                className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 ring-1 ring-inset ring-blue-600/20 transition-colors"
                              >
                                <PlayCircle className="h-3.5 w-3.5" />
                                Produce
                              </button>
                            )}
                            {wo.status === 'DONE' && (
                              <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </>
        )}
      </div>
    </div>
  );
}
