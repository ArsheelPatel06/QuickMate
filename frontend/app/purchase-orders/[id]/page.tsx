"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileClock, Loader2, Truck, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, PackageCheck } from 'lucide-react';

interface OrderLine {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchaseOrderFormPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  // Form State for creation
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState<OrderLine[]>([]);

  // State for receiving quantities
  const [receiveQtys, setReceiveQtys] = useState<{[lineId: string]: number}>({});

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/v1/purchase-orders/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        // Initialize receive quantities to remaining unreceived quantities
        const initialQtys: {[lineId: string]: number} = {};
        data.data.lines.forEach((line: any) => {
          initialQtys[line.id] = Math.max(0, line.quantity - line.receivedQty);
        });
        setReceiveQtys(initialQtys);
      } else {
        setError(data.message || 'Failed to load Purchase Order');
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
        
        const [prodRes, vendorRes] = await Promise.all([
          fetch(`http://localhost:3000/api/v1/products?limit=1000`, { headers }),
          fetch(`http://localhost:3000/api/v1/vendors?limit=1000`, { headers })
        ]);

        const prodData = await prodRes.json();
        const vendorData = await vendorRes.json();

        if (prodData.success) setProducts(prodData.data.products || []);
        if (vendorData.success) setVendors(vendorData.data.vendors || []);
      } catch (err: any) {
        console.error('Failed to load master data', err);
      }
    };

    if (isNew) {
      fetchMasterData().then(() => setLoading(false));
    } else {
      fetchMasterData().then(() => fetchOrder());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, params.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isNew) return;
    
    setError('');
    setSuccessMsg('');
    
    if (!vendorId) return setError('Vendor is required.');
    if (lines.length === 0) return setError('At least one order line is required.');
    if (lines.some(l => !l.productId || l.quantity <= 0)) return setError('All lines must have a valid product and quantity.');

    setActionLoading(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/v1/purchase-orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          vendorId,
          lines: lines.map(l => ({ 
            productId: l.productId, 
            quantity: parseFloat(l.quantity.toString()),
            unitPrice: parseFloat(l.unitPrice.toString()) 
          }))
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create RFQ');
      }

      router.push(`/purchase-orders/${data.data.id}`);

    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:3000/api/v1/purchase-orders/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSuccessMsg('Purchase Order confirmed successfully');
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
      setActionLoading(false);
    }
  };

  const handleReceive = async () => {
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const receipts = Object.entries(receiveQtys)
        .map(([lineId, qty]) => ({
          lineId,
          receivedQty: parseFloat(qty.toString())
        }))
        .filter(r => r.receivedQty > 0);

      if (receipts.length === 0) {
        throw new Error('Please specify a valid quantity to receive for at least one item.');
      }

      const res = await fetch(`http://localhost:3000/api/v1/purchase-orders/${order.id}/receive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ receipts })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setSuccessMsg('Products received and inventory updated successfully.');
      fetchOrder();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const addLine = () => setLines([...lines, { productId: '', quantity: 1, unitPrice: 0 }]);
  const removeLine = (idx: number) => setLines(lines.filter((_, i) => i !== idx));
  const updateLine = (idx: number, field: keyof OrderLine, value: any) => {
    const newLines = [...lines];
    newLines[idx] = { ...newLines[idx], [field]: value };
    
    // Auto-fill price with cost price when product selected
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) newLines[idx].unitPrice = product.costPrice || 0;
    }
    
    setLines(newLines);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">Draft RFQ</span>;
      case 'CONFIRMED': return <span className="inline-flex items-center rounded-md bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">Purchase Order</span>;
      case 'PARTIALLY_DELIVERED': return <span className="inline-flex items-center rounded-md bg-yellow-100 px-2.5 py-0.5 text-sm font-medium text-yellow-800">Partially Received</span>;
      case 'FULLY_DELIVERED': return <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">Fully Received</span>;
      case 'CANCELLED': return <span className="inline-flex items-center rounded-md bg-red-100 px-2.5 py-0.5 text-sm font-medium text-red-800">Cancelled</span>;
      default: return <span className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-0.5 text-sm font-medium text-gray-800">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const subtotal = isNew 
    ? lines.reduce((acc, l) => acc + (l.quantity * l.unitPrice), 0)
    : order?.totalAmount || 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/purchase-orders"
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Truck className="h-6 w-6 text-blue-600" />
              {isNew ? 'New Request for Quotation (RFQ)' : order?.orderNumber}
            </h1>
          </div>
          {!isNew && order && (
            <div className="ml-2">
              {getStatusBadge(order.status)}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {!isNew && (
            <>
              <button
                type="button"
                onClick={() => router.push(`/audit-logs?entity=PurchaseOrder&entityId=${order?.id}`)}
                className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
              >
                <FileClock className="-ml-0.5 h-4 w-4 text-gray-500" />
                Logs
              </button>

              {order.status === 'DRAFT' && (
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
                >
                  {actionLoading ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="-ml-0.5 h-4 w-4" />}
                  Confirm Order
                </button>
              )}

              {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED') && (
                <button
                  type="button"
                  onClick={handleReceive}
                  disabled={actionLoading}
                  className="inline-flex items-center gap-x-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-colors"
                >
                  {actionLoading ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <PackageCheck className="-ml-0.5 h-4 w-4" />}
                  Receive Products
                </button>
              )}

              {order.status !== 'FULLY_DELIVERED' && order.status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 transition-colors"
                >
                  <XCircle className="-ml-0.5 h-4 w-4" />
                  Cancel
                </button>
              )}
            </>
          )}

          {isNew && (
            <button
              type="button"
              onClick={handleSave}
              disabled={actionLoading}
              className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 transition-colors"
            >
              {actionLoading ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <Save className="-ml-0.5 h-4 w-4" />}
              Save RFQ
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 flex items-start gap-3 border border-red-200">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700 font-medium">{error}</div>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-green-50 p-4 flex items-start gap-3 border border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-green-700 font-medium">{successMsg}</div>
        </div>
      )}

      {/* Main Form */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        
        {/* Header Section */}
        <div className="p-6 sm:p-8 grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2 border-b border-gray-100 bg-gray-50/50">
          
          <div className="sm:col-span-1">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Vendor
            </label>
            <div className="mt-2">
              {isNew ? (
                <select
                  required
                  className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                  value={vendorId}
                  onChange={(e) => setVendorId(e.target.value)}
                >
                  <option value="">Select vendor...</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              ) : (
                <div className="block w-full rounded-lg border border-transparent py-2.5 text-gray-900 sm:text-lg font-semibold">
                  {order?.vendor?.name}
                </div>
              )}
            </div>
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm font-medium leading-6 text-gray-900">
              Purchaser
            </label>
            <div className="mt-2">
              <div className="block w-full rounded-lg border border-transparent py-2.5 text-gray-500 sm:text-sm">
                {isNew ? 'Assigned automatically on save' : order?.user?.name || 'System User'}
              </div>
            </div>
          </div>

        </div>

        {/* Lines Section */}
        <div className="p-6 sm:p-8">
          <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">Order Lines</h3>
          
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white mb-6">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/3">Product</th>
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Ordered Qty</th>
                  {!isNew && <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Received Qty</th>}
                  {!isNew && (order?.status === 'CONFIRMED' || order?.status === 'PARTIALLY_DELIVERED') && (
                    <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 w-32">Receive Now</th>
                  )}
                  <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Cost Price</th>
                  <th scope="col" className="px-6 py-3.5 text-right text-sm font-semibold text-gray-900">Subtotal</th>
                  {isNew && <th scope="col" className="w-12"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isNew ? (
                  lines.map((line, idx) => (
                    <tr key={idx}>
                      <td className="whitespace-nowrap py-2 pl-4 pr-3 sm:pl-6">
                        <select
                          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          value={line.productId}
                          onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                        >
                          <option value="">Select product...</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          className="block w-full text-right rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          className="block w-full text-right rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td className="whitespace-nowrap px-6 py-2 text-right text-sm font-medium text-gray-900">
                        ${(line.quantity * line.unitPrice).toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap pr-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  order?.lines?.map((line: any) => (
                    <tr key={line.id}>
                      <td className="whitespace-nowrap py-3 pl-4 pr-3 sm:pl-6 text-sm font-medium text-gray-900">
                        {line.product?.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 text-right">
                        {line.quantity}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 text-right font-medium">
                        {line.receivedQty}
                      </td>
                      {(order.status === 'CONFIRMED' || order.status === 'PARTIALLY_DELIVERED') && (
                        <td className="whitespace-nowrap px-3 py-2">
                          <input
                            type="number"
                            min="0"
                            max={line.quantity - line.receivedQty}
                            className="block w-full text-right rounded-md border-0 py-1 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-xs"
                            value={receiveQtys[line.id] ?? 0}
                            onChange={(e) => setReceiveQtys({
                              ...receiveQtys,
                              [line.id]: parseFloat(e.target.value) || 0
                            })}
                          />
                        </td>
                      )}
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-500 text-right">
                        ${line.unitPrice ? parseFloat(line.unitPrice.toString()).toFixed(2) : '0.00'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        ${line.lineTotal ? parseFloat(line.lineTotal.toString()).toFixed(2) : '0.00'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isNew && (
            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-500 mb-6"
            >
              <Plus className="h-4 w-4" /> Add a product
            </button>
          )}

          {/* Totals */}
          <div className="flex justify-end pt-6 border-t border-gray-100">
            <div className="w-full max-w-sm">
              <div className="flex justify-between items-center py-2 text-lg font-bold text-gray-900">
                <span>Total Amount:</span>
                <span>${subtotal ? parseFloat(subtotal.toString()).toFixed(2) : '0.00'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
