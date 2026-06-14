"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Plus, UserCheck, UserX, KeyRound, Shield,
  Building2, DollarSign, Search, X, Pencil, Trash2, AlertTriangle
} from 'lucide-react';

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
  ADMIN:         { label: 'Admin',         color: 'text-purple-700',  bg: 'bg-purple-100',  border: 'border-purple-200',  desc: 'Full system access'              },
  OWNER:         { label: 'Owner',         color: 'text-slate-700',   bg: 'bg-slate-100',   border: 'border-slate-200',   desc: 'Business owner'                  },
  SALES:         { label: 'Sales',         color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-200',    desc: 'Sales orders only'               },
  PURCHASE:      { label: 'Purchase',      color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-200',   desc: 'Purchase orders & approvals'     },
  MANUFACTURING: { label: 'Manufacturing', color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-200',  desc: 'Production & work orders'        },
  INVENTORY:     { label: 'Inventory',     color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-200', desc: 'Inventory management'            },
};

const PERMISSIONS: { feature: string; ADMIN: boolean; SALES: boolean; PURCHASE: boolean; MANUFACTURING: boolean; INVENTORY: boolean }[] = [
  { feature: 'View Dashboard',          ADMIN: true,  SALES: true,  PURCHASE: true,  MANUFACTURING: true,  INVENTORY: true  },
  { feature: 'Create Sales Orders',     ADMIN: true,  SALES: true,  PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'Confirm Sales Orders',    ADMIN: true,  SALES: true,  PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'Create Purchase Orders',  ADMIN: true,  SALES: false, PURCHASE: true,  MANUFACTURING: false, INVENTORY: false },
  { feature: 'Approve Purchase Orders', ADMIN: true,  SALES: false, PURCHASE: true,  MANUFACTURING: false, INVENTORY: false },
  { feature: 'View Manufacturing',      ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: true,  INVENTORY: false },
  { feature: 'Create MOs / WOs',        ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: true,  INVENTORY: false },
  { feature: 'Manage Inventory',        ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: true  },
  { feature: 'User Management',         ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
  { feature: 'View Audit Logs',         ADMIN: true,  SALES: false, PURCHASE: false, MANUFACTURING: false, INVENTORY: false },
];

const EMPTY_FORM = { name: '', email: '', password: '', role: 'SALES' as Role, department: '', approvalLimit: 0 };

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function UserManagementPage() {
  const [users, setUsers]           = useState<User[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [activeTab, setActiveTab]   = useState<'users' | 'permissions'>('users');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_FORM);

  // Edit modal
  const [editUser, setEditUser]     = useState<User | null>(null);
  const [editForm, setEditForm]     = useState({ name: '', role: 'SALES' as Role, department: '', approvalLimit: 0 });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast]           = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const token      = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const currentUser = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(localStorage.getItem('currentUser') || '{}'); } catch { return {}; } })()
    : {};

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setUsers(data.data ?? []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // ── Create ─────────────────────────────────────────────────────────────────
  const createUser = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      showToast('error', 'Name, email and password are required.');
      return;
    }
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create user');
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      showToast('success', `${data.data.name} added successfully.`);
      fetchUsers();
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, role: u.role, department: u.department ?? '', approvalLimit: u.approvalLimit });
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Update failed');

      // Refresh currentUser in localStorage if editing self
      if (editUser.id === currentUser.id) {
        localStorage.setItem('currentUser', JSON.stringify({ ...currentUser, ...editForm }));
      }

      setEditUser(null);
      showToast('success', `${editForm.name} updated.`);
      fetchUsers();
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────
  const toggleActive = async (u: User) => {
    if (u.id === currentUser.id) { showToast('error', 'You cannot disable your own account.'); return; }
    const endpoint = u.isActive ? 'disable' : 'enable';
    await fetch(`${API}/users/${u.id}/${endpoint}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    showToast('success', `${u.name} ${u.isActive ? 'disabled' : 'enabled'}.`);
    fetchUsers();
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res  = await fetch(`${API}/users/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Delete failed');
      setDeleteTarget(null);
      showToast('success', `${deleteTarget.name} deleted.`);
      fetchUsers();
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Reset password ─────────────────────────────────────────────────────────
  const resetPassword = async (u: User) => {
    await fetch(`${API}/users/${u.id}/reset-password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    showToast('success', `Temporary password sent to ${u.email}.`);
  };

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const AVATAR_COLORS = [
    'from-indigo-600 to-purple-600',
    'from-blue-600 to-cyan-500',
    'from-emerald-600 to-teal-500',
    'from-amber-500 to-orange-500',
    'from-rose-500 to-pink-500',
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage team members, roles, and access permissions.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm border ${
          toast.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {toast.type === 'success' ? <UserCheck className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: users.length,                    icon: Users,     color: 'text-indigo-600', bg: 'bg-indigo-50'  },
          { label: 'Active',      value: users.filter(u=>u.isActive).length, icon: UserCheck, color: 'text-emerald-600',bg: 'bg-emerald-50' },
          { label: 'Inactive',    value: users.filter(u=>!u.isActive).length,icon: UserX,     color: 'text-rose-600',  bg: 'bg-rose-50'    },
          { label: 'Roles',       value: new Set(users.map(u=>u.role)).size,  icon: Shield,    color: 'text-blue-600',  bg: 'bg-blue-50'    },
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
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {tab === 'users' ? 'Team Members' : 'Permissions Matrix'}
          </button>
        ))}
      </div>

      {/* Users table */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, email, or role…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-indigo-400" />
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
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((u, idx) => {
                const meta    = ROLE_META[u.role] ?? ROLE_META.SALES;
                const isSelf  = u.id === currentUser.id;
                return (
                  <div key={u.id} className={`flex items-center gap-4 px-6 py-4 hover:bg-slate-50/50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                    {/* Avatar */}
                    <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {initials(u.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                        {isSelf && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-semibold">You</span>}
                        {!u.isActive && <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Inactive</span>}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{u.email}</p>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        {u.department && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Building2 className="h-3 w-3" />{u.department}
                          </span>
                        )}
                        {u.approvalLimit > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <DollarSign className="h-3 w-3" />Limit: ₹{u.approvalLimit.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Role badge */}
                    <span className={`hidden sm:inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${meta.color} ${meta.bg} ${meta.border}`}>
                      {meta.label}
                    </span>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      {/* Edit */}
                      <button onClick={() => openEdit(u)} title="Edit user"
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all">
                        <Pencil className="h-4 w-4" />
                      </button>
                      {/* Reset password */}
                      <button onClick={() => resetPassword(u)} title="Reset password"
                        className="p-2 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-all">
                        <KeyRound className="h-4 w-4" />
                      </button>
                      {/* Toggle active */}
                      <button onClick={() => toggleActive(u)} disabled={isSelf}
                        title={u.isActive ? 'Disable' : 'Enable'}
                        className={`p-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                          u.isActive ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50' : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                        }`}>
                        {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      {/* Delete */}
                      <button onClick={() => setDeleteTarget(u)} disabled={isSelf}
                        title="Delete user"
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <Trash2 className="h-4 w-4" />
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

      {/* Permissions Matrix */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-6 py-4 font-semibold text-slate-700 w-48">Feature</th>
                {(['ADMIN','SALES','PURCHASE','MANUFACTURING','INVENTORY'] as const).map(r => (
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

      {/* ── Create User Modal ───────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Add New User" onClose={() => setShowCreate(false)}>
          <div className="space-y-4">
            {[
              { label: 'Full Name',   key: 'name',       type: 'text',     placeholder: 'John Doe' },
              { label: 'Email',       key: 'email',      type: 'email',    placeholder: 'john@company.com' },
              { label: 'Password',    key: 'password',   type: 'password', placeholder: 'Min 6 characters' },
              { label: 'Department',  key: 'department', type: 'text',     placeholder: 'Sales, Procurement…' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(createForm as Record<string,unknown>)[f.key] as string}
                  onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <select value={createForm.role} onChange={e => setCreateForm(p => ({ ...p, role: e.target.value as Role }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  {(Object.keys(ROLE_META) as Role[]).map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Approval Limit (₹)</label>
                <input type="number" min={0} value={createForm.approvalLimit}
                  onChange={e => setCreateForm(p => ({ ...p, approvalLimit: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
              <strong>{ROLE_META[createForm.role].label}:</strong> {ROLE_META[createForm.role].desc}
            </p>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
            <button onClick={() => setShowCreate(false)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={createUser} disabled={submitting || !createForm.name || !createForm.email || !createForm.password}
              className="flex-1 rounded-xl bg-indigo-700 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50 transition-all">
              {submitting ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit User Modal ─────────────────────────────────────────────────── */}
      {editUser && (
        <Modal title={`Edit — ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Full Name</label>
              <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Department</label>
              <input type="text" value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                placeholder="Sales, Procurement…"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Role</label>
                <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value as Role }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400">
                  {(Object.keys(ROLE_META) as Role[]).map(r => (
                    <option key={r} value={r}>{ROLE_META[r].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Approval Limit (₹)</label>
                <input type="number" min={0} value={editForm.approvalLimit}
                  onChange={e => setEditForm(p => ({ ...p, approvalLimit: Number(e.target.value) }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400" />
              </div>
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2">
              <strong>{ROLE_META[editForm.role].label}:</strong> {ROLE_META[editForm.role].desc}
            </p>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
            <button onClick={() => setEditUser(null)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={saveEdit} disabled={submitting}
              className="flex-1 rounded-xl bg-indigo-700 py-2.5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-50 transition-all">
              {submitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ────────────────────────────────────────────── */}
      {deleteTarget && (
        <Modal title="Delete User" onClose={() => setDeleteTarget(null)}>
          <div className="flex items-start gap-3 py-2">
            <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
              <Trash2 className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Delete <span className="text-red-600">{deleteTarget.name}</span>?</p>
              <p className="text-xs text-slate-500 mt-1">This permanently removes the user and all their associations. This action cannot be undone.</p>
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-slate-100 mt-4">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={confirmDelete} disabled={submitting}
              className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-all">
              {submitting ? 'Deleting…' : 'Yes, Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Reusable modal wrapper
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
