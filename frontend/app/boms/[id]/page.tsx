"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save, FileClock, Loader2, Settings, Plus, Trash2, AlertCircle } from 'lucide-react';

interface ComponentLine {
  productId: string;
  quantity: number;
}

interface OperationLine {
  operationName: string;
  durationMinutes: number;
  sequence: number;
  workCenterId: string;
}

export default function BomFormPage() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState<'COMPONENTS' | 'OPERATIONS'>('COMPONENTS');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    productId: '',
    quantity: 1,
  });

  const [components, setComponents] = useState<ComponentLine[]>([]);
  const [operations, setOperations] = useState<OperationLine[]>([]);

  // Dropdown Master Data
  const [products, setProducts] = useState<{id: string, name: string, sku: string}[]>([]);
  const [workCenters, setWorkCenters] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = { Authorization: `Bearer ${token}` };

        // Parallel fetch for master data (assuming small dataset for products to populate dropdown)
        const [prodRes, wcRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/products?limit=1000`, { headers }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/work-centers`, { headers })
        ]);

        const prodData = await prodRes.json();
        const wcData = await wcRes.json();

        if (prodData.success) setProducts(prodData.data.products || []);
        if (wcData.success) setWorkCenters(wcData.data || []);

        // Fetch existing BOM if editing
        if (!isNew) {
          const bomRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/boms/${params.id}`, { headers });
          const bomData = await bomRes.json();
          
          if (bomData.success) {
            const b = bomData.data;
            setFormData({
              name: b.name,
              productId: b.productId,
              quantity: b.quantity,
            });
            
            // Map components
            setComponents(b.bomLines.map((l: any) => ({
              productId: l.productId,
              quantity: l.quantity
            })));

            // Map operations
            setOperations(b.bomOperations.map((o: any) => ({
              operationName: o.operationName,
              durationMinutes: o.duration,
              sequence: o.sequence,
              workCenterId: o.workCenterId
            })));
          } else {
            setError(bomData.message || 'Failed to load BOM');
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch initial data');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isNew, params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validations
    if (!formData.productId) return setError('Finished Product is required.');
    if (components.length === 0) return setError('At least one component is required.');
    if (components.some(c => !c.productId || c.quantity <= 0)) return setError('All components must have a valid product and quantity.');
    if (operations.some(o => !o.workCenterId || o.durationMinutes <= 0)) return setError('All operations must have a valid work center and duration.');

    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const url = isNew 
        ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/boms` 
        : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/boms/${params.id}`;
        
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity.toString(), 10),
          components: components.map(c => ({ ...c, quantity: parseFloat(c.quantity.toString()) })),
          operations: operations.map((o, index) => ({ 
            ...o, 
            durationMinutes: parseFloat(o.durationMinutes.toString()),
            sequence: index + 1 // Auto-calculate sequence based on array order
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save BOM');
      }

      router.push('/boms');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogsClick = () => {
    router.push(`/audit-logs?entity=BOM&entityId=${params.id}`);
  };

  // Line Handlers
  const addComponent = () => {
    setComponents([...components, { productId: '', quantity: 1 }]);
  };
  const removeComponent = (index: number) => {
    setComponents(components.filter((_, i) => i !== index));
  };
  const updateComponent = (index: number, field: keyof ComponentLine, value: any) => {
    const newComps = [...components];
    newComps[index] = { ...newComps[index], [field]: value };
    setComponents(newComps);
  };

  const addOperation = () => {
    setOperations([...operations, { operationName: `Operation ${operations.length + 1}`, durationMinutes: 60, sequence: operations.length + 1, workCenterId: '' }]);
  };
  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };
  const updateOperation = (index: number, field: keyof OperationLine, value: any) => {
    const newOps = [...operations];
    newOps[index] = { ...newOps[index], [field]: value };
    setOperations(newOps);
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
            href="/boms"
            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <Settings className="h-6 w-6 text-blue-600" />
              {isNew ? 'New Bill of Materials' : formData.name}
            </h1>
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

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="inline-flex items-center gap-x-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-70 transition-colors"
          >
            {saving ? <Loader2 className="-ml-0.5 h-4 w-4 animate-spin" /> : <Save className="-ml-0.5 h-4 w-4" />}
            Save BOM
          </button>
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
          
          <div className="sm:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium leading-6 text-gray-900">
              Reference / BOM Name
            </label>
            <div className="mt-2">
              <input
                type="text"
                name="name"
                id="name"
                required
                className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                placeholder="e.g. Standard Wooden Table BOM"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label htmlFor="productId" className="block text-sm font-medium leading-6 text-gray-900">
              Finished Product
            </label>
            <div className="mt-2">
              <select
                id="productId"
                name="productId"
                required
                className="block w-full rounded-lg border-0 py-2.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              >
                <option value="">Select a Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="quantity" className="block text-sm font-medium leading-6 text-gray-900">
              Quantity Produced
            </label>
            <div className="mt-2">
              <input
                type="number"
                name="quantity"
                id="quantity"
                min="1"
                required
                className="block w-full rounded-lg border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6 transition-shadow"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
          </div>

        </div>

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
              Operations
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6 sm:p-8 bg-gray-50 min-h-[300px]">
          
          {/* COMPONENTS TAB */}
          {activeTab === 'COMPONENTS' && (
            <div className="space-y-4">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-2/3">Product</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/4">Quantity</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {components.map((comp, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap py-2 pl-4 pr-3 sm:pl-6">
                          <select
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            value={comp.productId}
                            onChange={(e) => updateComponent(idx, 'productId', e.target.value)}
                          >
                            <option value="">Select component...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <input
                            type="number"
                            min="0.1"
                            step="0.1"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            value={comp.quantity}
                            onChange={(e) => updateComponent(idx, 'quantity', parseFloat(e.target.value) || 0)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeComponent(idx)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addComponent}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                <Plus className="h-4 w-4" /> Add a line
              </button>
            </div>
          )}

          {/* OPERATIONS TAB */}
          {activeTab === 'OPERATIONS' && (
            <div className="space-y-4">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg bg-white">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/3">Operation Name</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/3">Work Center</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/4">Duration (min)</th>
                      <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {operations.map((op, idx) => (
                      <tr key={idx}>
                        <td className="whitespace-nowrap py-2 pl-4 pr-3 sm:pl-6">
                          <input
                            type="text"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            placeholder="e.g. Assembly"
                            value={op.operationName}
                            onChange={(e) => updateOperation(idx, 'operationName', e.target.value)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <select
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            value={op.workCenterId}
                            onChange={(e) => updateOperation(idx, 'workCenterId', e.target.value)}
                          >
                            <option value="">Select Work Center...</option>
                            {workCenters.map(wc => (
                              <option key={wc.id} value={wc.id}>{wc.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <input
                            type="number"
                            min="1"
                            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
                            value={op.durationMinutes}
                            onChange={(e) => updateOperation(idx, 'durationMinutes', parseInt(e.target.value, 10) || 0)}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeOperation(idx)}
                            className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                onClick={addOperation}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-500"
              >
                <Plus className="h-4 w-4" /> Add an operation
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
