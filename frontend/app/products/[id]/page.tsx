"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileClock, Edit2, Loader2, Package, AlertCircle } from 'lucide-react';

export default function ProductFormPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // As requested: "Read-only mode after save"
  // If it's an existing product, it starts in read-only mode until "Edit" is clicked.
  const [isReadOnly, setIsReadOnly] = useState(!isNew);

  const [formData, setFormData] = useState({
    name: '',
    sku: '', // SKU is mandatory in DB
    salesPrice: 0,
    costPrice: 0,
    onHandQty: 0,
    procureOnDemand: false,
    procurementType: 'PURCHASE',
  });

  // Dynamic calculated field
  const [reservedQty, setReservedQty] = useState(0);

  useEffect(() => {
    if (!isNew) {
      const fetchProduct = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`http://localhost:3000/api/v1/products/${params.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            const p = data.data;
            setFormData({
              name: p.name,
              sku: p.sku,
              salesPrice: p.salesPrice || 0,
              costPrice: p.costPrice || 0,
              onHandQty: p.onHandQty || 0,
              procureOnDemand: p.procureOnDemand || false,
              procurementType: p.procurementType || 'PURCHASE',
            });
            setReservedQty(p.reservedQty || 0);
          } else {
            setError(data.message || 'Failed to load product');
          }
        } catch (err: any) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [isNew, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    
    setError('');
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const url = isNew 
        ? 'http://localhost:3000/api/v1/products' 
        : `http://localhost:3000/api/v1/products/${params.id}`;
        
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          salesPrice: parseFloat(formData.salesPrice.toString()),
          costPrice: parseFloat(formData.costPrice.toString()),
          onHandQty: parseInt(formData.onHandQty.toString(), 10),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save product');
      }

      // "Read-only mode after save"
      setIsReadOnly(true);

      if (isNew) {
        // Redirect to the newly created product's ID page to enter read-only mode properly
        router.push(`/products/${data.data.id}`);
      }

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogsClick = () => {
    // Navigate to global audit logs filtered by this entity
    router.push(`/audit-logs?entity=Product&entityId=${params.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link 
            href="/products"
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-blue-600" />
              {isNew ? 'New Product' : formData.name}
            </h1>
            {!isNew && (
              <p className="text-gray-500 text-sm mt-0.5">SKU: {formData.sku}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {!isNew && (
            <button
              type="button"
              onClick={handleLogsClick}
              className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
            >
              <FileClock className="-ml-0.5 h-4 w-4 text-gray-500" aria-hidden="true" />
              Logs
            </button>
          )}

          {!isNew && isReadOnly && (
            <button
              type="button"
              onClick={() => setIsReadOnly(false)}
              className="inline-flex items-center gap-x-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Edit2 className="-ml-0.5 h-4 w-4 text-gray-500" aria-hidden="true" />
              Edit
            </button>
          )}

          {(!isReadOnly || isNew) && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 transition-colors"
            >
              {saving ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <Save className="-ml-0.5 h-4 w-4" />}
              Save Product
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

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-6 sm:p-8 space-y-8">
          
          {/* General Information Section */}
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4 border-b border-gray-100 pb-2">
              General Information
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
                  Product Name
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    required
                    disabled={isReadOnly}
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sku" className="block text-sm font-medium leading-6 text-gray-900">
                  Internal Reference (SKU)
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="sku"
                    id="sku"
                    required
                    disabled={isReadOnly || !isNew} // Usually SKU cannot be changed after creation
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
              </div>

              <div className="col-span-1" />
              
              <div>
                <label htmlFor="salesPrice" className="block text-sm font-medium leading-6 text-gray-900">
                  Sales Price ($)
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    step="0.01"
                    name="salesPrice"
                    id="salesPrice"
                    required
                    disabled={isReadOnly}
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="costPrice" className="block text-sm font-medium leading-6 text-gray-900">
                  Cost Price ($)
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    step="0.01"
                    name="costPrice"
                    id="costPrice"
                    required
                    disabled={isReadOnly}
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4 border-b border-gray-100 pb-2">
              Inventory Data
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              
              <div>
                <label htmlFor="onHandQty" className="block text-sm font-medium leading-6 text-gray-900">
                  On Hand Quantity
                </label>
                <div className="mt-2">
                  <input
                    type="number"
                    name="onHandQty"
                    id="onHandQty"
                    required
                    // Best practice: Only editable upon creation. Afterwards, must use Inventory Adjustments module.
                    disabled={isReadOnly || !isNew} 
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.onHandQty}
                    onChange={(e) => setFormData({ ...formData, onHandQty: parseInt(e.target.value, 10) || 0 })}
                  />
                </div>
                {!isNew && (
                  <p className="mt-1.5 text-xs text-gray-500">To modify existing inventory, please use the Adjust Inventory API.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium leading-6 text-gray-900">
                  Free To Use Quantity
                </label>
                <div className="mt-2">
                  <div className="block w-full rounded-lg border border-transparent bg-gray-50 py-2.5 px-3 text-gray-900 sm:text-sm font-semibold">
                    {formData.onHandQty - reservedQty}
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-gray-500">{reservedQty} units currently reserved for orders.</p>
              </div>

            </div>
          </div>

          {/* Supply Chain Section */}
          <div>
            <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4 border-b border-gray-100 pb-2">
              Supply Chain & Procurement
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-6 sm:grid-cols-2">
              
              <div>
                <label htmlFor="procurementType" className="block text-sm font-medium leading-6 text-gray-900">
                  Procurement Route
                </label>
                <div className="mt-2">
                  <select
                    id="procurementType"
                    name="procurementType"
                    disabled={isReadOnly}
                    className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                    value={formData.procurementType}
                    onChange={(e) => setFormData({ ...formData, procurementType: e.target.value })}
                  >
                    <option value="PURCHASE">Buy (Purchase Order)</option>
                    <option value="MANUFACTURE">Make (Manufacturing Order)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center pt-8">
                <div className="flex h-6 items-center">
                  <input
                    id="procureOnDemand"
                    name="procureOnDemand"
                    type="checkbox"
                    disabled={isReadOnly}
                    className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-600 disabled:opacity-50"
                    checked={formData.procureOnDemand}
                    onChange={(e) => setFormData({ ...formData, procureOnDemand: e.target.checked })}
                  />
                </div>
                <div className="ml-3 text-sm leading-6">
                  <label htmlFor="procureOnDemand" className="font-medium text-gray-900">
                    Procure On Demand (MTO)
                  </label>
                  <p className="text-gray-500">Automatically trigger procurement on Sales Order confirmation.</p>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="vendor" className="block text-sm font-medium leading-6 text-gray-900">
                  Default Vendor / BOM Reference
                </label>
                <div className="mt-2">
                  <input
                    type="text"
                    name="vendor"
                    id="vendor"
                    disabled={isReadOnly}
                    placeholder={formData.procurementType === 'PURCHASE' ? "e.g. WoodCorp Inc." : "Managed in BOM Module"}
                    className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 disabled:bg-gray-50 disabled:text-gray-500 transition-shadow"
                  />
                </div>
                <p className="mt-1.5 text-xs text-gray-500">Advanced linking managed in dedicated Purchase/BOM modules.</p>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
