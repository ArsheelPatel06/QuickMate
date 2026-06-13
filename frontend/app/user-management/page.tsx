"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, UserCheck, UserX, KeyRound, Shield, Building2, DollarSign, Search, X } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type Role = 'ADMIN' | 'OWNER' | 'SALES' | 'PURCHASE' | 'MANUFACTURING' | 'INVENTORY';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  approvalLimit: number;
  isActive: boolean;
  createdAt: string;
}

const ROLE_META: Record<Role, { label: string; color: string; bg: string; border: string; desc: string }> = {
  ADMIN:         { label: 'Admin',         color: 'text-purple-700', bg: 'bg-orange-100',  border: 'border-orange-200', desc: 'Full system access' },
  OWNER:         { label: 'Owner',         color: 'text-slate-700',  bg: 'bg-slate-100',   border: 'border-slate-200',  desc: 'Business owner' },
  SALES:         { label: 'Sales',         color: 'text-blue-700',   bg: 'bg-blue-100',    border: 'border-blue-200',   desc: 'Sales orders only' },
  PURCHASE:      { label: 'Purchase',      color: 'text-amber-700',  bg: 'bg-amber-100',   border: 'border-amber-200',  desc: 'Purchase orders & approvals' },
  MANUFACTURING: { label: 'Manufacturing', color: 'text-purple-700', bg: 'bg-orange-100',  border: 'border-orange-200', desc: 'Production & work orders' },
  INVENTORY:     { label: 'Inventory',     color: 'text-emerald-700',bg: 'bg-emerald-100', border: 'border-emerald-200',desc: 'Inventory management' },
};

const PERMISSIONS: { feature: string; ADMIN: boolean; SALES: boolean; PURCHASE: boolean; MANUFACTURING: boolean; INVENTORY: boolean }[] = [
  { feature: 'View Dashboard',        ADMIN: true,  SALES: true,  PURCHASE: true,  MANUFACTURING: true,  INVENTORY: true  },
  { feature: 'Create Sales Orders',   ADMIN: true,  SALES: true,  PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'Confirm Sales Orders',  ADMIN: true,  SALES: true,  PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'Create Purchase Orders',ADMIN: true,  SALES: false, PURCHASE: true,  MANUFACTURING: false, INVENTORY: false },
  { feature: 'Approve Purchase Orders',ADMIN: true, SALES: false, PURCHASE: true,  MANUFACTURING: false, INVENTORY: false },
  { feature: 'View Manufacturing',    ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: true,  INVENTORY: false },
  { feature: 'Create MOs / WOs',      ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: true,  INVENTORY: false },
  { feature: 'Manage Inventory',      ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: true  },
  { feature: 'User Management',       ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'View Audit Logs',       ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'SALES' as Role, department: '', approvalLimit: 0 };

export default function UserManagementPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.data ?? []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const createUser = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      setShowModal(false);
      setForm(EMPTY_FORM);
      setSuccessMsg(`User ${data.data.name} created successfully.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (user: User) => {
    const endpoint = user.isActive ? 'disable' : 'enable';
    await fetch(`${API}/users/${user.id}/${endpoint}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchUsers();
  };

  const resetPassword = async (userId: string) => {
    if (!confirm('Send a temporary password to this user?')) return;
    await fetch(`${API}/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setSuccessMsg('Temporary password sent via email.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount   = users.filter(u => u.isActive).length;
  const inactiveCount = users.filter(u => !u.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage roles, permissions, and access control.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Toast */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-700 text-sm">
          <UserCheck className="h-4 w-4 shrink-0" />{successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',   value: users.length,   icon: Users,     color: 'text-purple-600', bg: 'bg-orange-50' },
          { label: 'Active',        value: activeCount,    icon: UserCheck, color: 'text-emerald-600',bg: 'bg-emerald-50'},
          { label: 'Inactive',      value: inactiveCount,  icon: UserX,     color: 'text-rose-600',   bg: 'bg-rose-50'  },
          { label: 'Roles',         value: Object.keys(ROLE_META).length, icon: Shield, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(['users', 'permissions'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab === 'users' ? 'Team Members' : 'Permissions Matrix'}
          </button>
        ))}
      </div>

      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* Search bar */}
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search users by name, email, or role…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>
          </div>

          {loading ? (
            <div className="divide-y divide-slate-100">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-slate-200 rounded-full" />
                    <div className="h-3 w-48 bg-slate-100 rounded-full" />
                  </div>
                  <div className="h-6 w-20 bg-slate-100 rounded-full" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map(user => {
                const meta = ROLE_META[user.role] ?? ROLE_META.SALES;
                return (
                  <div key={user.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors ${!user.isActive ? 'opacity-50' : ''}`}>
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{user.name}</p>
                        {!user.isActive && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full border border-slate-200">Inactive</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{user.email}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {user.department && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Building2 className="h-3 w-3" />{user.department}
                          </span>
                        )}
                        {user.approvalLimit > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-500">
                            <DollarSign className="h-3 w-3" />Approval: ₹{user.approvalLimit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
                      {meta.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => resetPassword(user.id)}
                        title="Reset Password"
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all"
                      >
                        <KeyRound className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => toggleActive(user)}
                        title={user.isActive ? 'Disable User' : 'Enable User'}
                        className={`p-2 rounded-lg transition-all ${
                          user.isActive
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 py-12 text-sm">No users found.</p>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 font-semibold text-slate-700 w-48">Feature</th>
                {(['ADMIN','SALES','PURCHASE','MANUFACTURING','INVENTORY'] as Role[]).map(r => (
                  <th key={r} className="px-4 py-4">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold border ${ROLE_META[r].color} ${ROLE_META[r].bg} ${ROLE_META[r].border}`}>
                      {ROLE_META[r].label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {PERMISSIONS.map(p => (
                <tr key={p.feature} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-medium text-slate-700">{p.feature}</td>
                  {(['ADMIN','SALES','PURCHASE','MANUFACTURING','INVENTORY'] as const).map(r => (
                    <td key={r} className="px-4 py-3 text-center">
                      {p[r]
                        ? <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs font-bold">✓</span>
                        : <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-300 text-xs">—</span>
                      }
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Add New User</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3">{error}</div>
              )}

              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Doe' },
                { label: 'Email',     key: 'email', type: 'email', placeholder: 'john@company.com' },
                { label: 'Password',  key: 'password', type: 'password', placeholder: 'Min 6 characters' },
                { label: 'Department',key: 'department', type: 'text', placeholder: 'Procurement, Sales…' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as Record<string, unknown>)[f.key] as string}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(prev => ({ ...prev, role: e.target.value as Role }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  >
                    {(Object.keys(ROLE_META) as Role[]).map(r => (
                      <option key={r} value={r}>{ROLE_META[r].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Approval Limit (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.approvalLimit}
                    onChange={e => setForm(prev => ({ ...prev, approvalLimit: Number(e.target.value) }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>

              {/* Role description */}
              <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
                <strong>{ROLE_META[form.role].label}:</strong> {ROLE_META[form.role].desc}
              </p>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                disabled={submitting || !form.name || !form.email || !form.password}
                className="flex-1 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
