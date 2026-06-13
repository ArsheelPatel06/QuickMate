"use client";

import React, { useEffect, useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  Package, 
  Truck, 
  AlertTriangle, 
  Factory, 
  Settings, 
  RefreshCcw 
} from 'lucide-react';

interface DashboardStats {
  sales: { draft: number; confirmed: number; partiallyDelivered: number; delivered: number; late: number };
  purchasing: { draft: number; confirmed: number; partiallyReceived: number; received: number; late: number };
  manufacturing: { draft: number; confirmed: number; inProgress: number; toClose: number; done: number; late: number };
}

// Shadcn-style Card Component
function Card({ title, items, icon: Icon, colorClass }: { title: string, items: { label: string, value: number | string }[], icon: any, colorClass: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white text-gray-950 shadow-sm transition-all hover:shadow-md overflow-hidden">
      <div className={`flex flex-col space-y-1.5 p-6 border-b border-gray-100 ${colorClass}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold leading-none tracking-tight text-lg text-gray-900">{title}</h3>
          <Icon className="h-5 w-5 opacity-70" />
        </div>
      </div>
      <div className="p-6 pt-4">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-col">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                {item.label}
              </span>
              <span className="text-2xl font-bold text-gray-900">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const defaultStats: DashboardStats = {
  sales: { draft: 0, confirmed: 0, partiallyDelivered: 0, delivered: 0, late: 0 },
  purchasing: { draft: 0, confirmed: 0, partiallyReceived: 0, received: 0, late: 0 },
  manufacturing: { draft: 0, confirmed: 0, inProgress: 0, toClose: 0, done: 0, late: 0 }
};

export default function DashboardPage() {
  const [filter, setFilter] = useState<'ALL' | 'MY'>('ALL');
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      const res = await fetch(`${baseUrl}/dashboard?scope=${filter.toLowerCase()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      } else {
        console.warn('Dashboard stats retrieval unsuccessful:', data.message);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCcw className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Page Header & Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your operations and active documents.</p>
        </div>
        
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filter === 'ALL' 
                ? 'bg-gray-100 text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Operations
          </button>
          <button
            onClick={() => setFilter('MY')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
              filter === 'MY' 
                ? 'bg-gray-100 text-gray-900 shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            My Documents
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Sales Orders Card */}
        <Card 
          title="Sales Orders" 
          icon={Package}
          colorClass="bg-blue-50/50"
          items={[
            { label: 'Draft', value: stats.sales.draft },
            { label: 'Confirmed', value: stats.sales.confirmed },
            { label: 'Partial Delivery', value: stats.sales.partiallyDelivered },
            { label: 'Delivered', value: stats.sales.delivered },
            { label: 'Late', value: stats.sales.late },
          ]}
        />

        {/* Purchase Orders Card */}
        <Card 
          title="Purchase Orders" 
          icon={Truck}
          colorClass="bg-emerald-50/50"
          items={[
            { label: 'Draft', value: stats.purchasing.draft },
            { label: 'Confirmed', value: stats.purchasing.confirmed },
            { label: 'Partial Receipt', value: stats.purchasing.partiallyReceived },
            { label: 'Received', value: stats.purchasing.received },
            { label: 'Late', value: stats.purchasing.late },
          ]}
        />

        {/* Manufacturing Orders Card */}
        <Card 
          title="Manufacturing Orders" 
          icon={Factory}
          colorClass="bg-purple-50/50"
          items={[
            { label: 'Draft', value: stats.manufacturing.draft },
            { label: 'Confirmed', value: stats.manufacturing.confirmed },
            { label: 'In Progress', value: stats.manufacturing.inProgress },
            { label: 'To Close', value: stats.manufacturing.toClose },
            { label: 'Done', value: stats.manufacturing.done },
            { label: 'Late', value: stats.manufacturing.late },
          ]}
        />
        
      </div>
    </div>
  );
}
