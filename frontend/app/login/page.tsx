"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { isConfigured, firebaseLogin } from '@/lib/firebase';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const FEATURES = [
  'Order → Manufacturing → Delivery automation',
  'Real-time bottleneck & inventory intelligence',
  'Role-based approvals with full audit trail',
];

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData]   = useState({ email: '', password: '' });
  const [error, setError]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPass, setShowPass]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isConfigured) {
        // ── Firebase Auth path ───────────────────────────────────────────────
        const { idToken, user } = await firebaseLogin(formData.email, formData.password);
        localStorage.setItem('token', idToken);
        localStorage.setItem('currentUser', JSON.stringify(user));
      } else {
        // ── Legacy JWT fallback (used when Firebase is not yet set up) ───────
        const res = await fetch(`${API}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Login failed. Please check your credentials.');
        const token = data.data?.token || data.token;
        const user  = data.data?.user  || data.user;
        if (!token) throw new Error('Authentication succeeded but no token was returned.');
        localStorage.setItem('token', token);
        if (user) localStorage.setItem('currentUser', JSON.stringify(user));
      }
      router.push('/operations-intelligence');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      // Make Firebase error messages user-friendly
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        setError('Invalid email or password.');
      } else if (msg.includes('auth/too-many-requests')) {
        setError('Too many failed attempts. Try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-purple-500/20">
            <span className="text-white font-black text-2xl">Q</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">QuickMate</h1>
          <p className="text-slate-400 mt-3 text-lg">Manufacturing ERP Platform</p>
          <div className="mt-10 space-y-3 text-left">
            {FEATURES.map(f => (
              <div key={f} className="flex items-start gap-3">
                <span className="h-5 w-5 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-purple-400 text-[10px] font-bold">✓</span>
                </span>
                <p className="text-slate-400 text-sm">{f}</p>
              </div>
            ))}
          </div>
          {isConfigured && (
            <div className="mt-8 flex items-center gap-2 justify-center">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <p className="text-emerald-400 text-xs font-medium">Secured with Firebase Authentication</p>
            </div>
          )}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-xl">Q</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="text-slate-500 mt-1 text-sm">
            Sign in to your QuickMate account ·{' '}
            <Link href="/signup" className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              Create account
            </Link>
          </p>

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl bg-red-50 p-3.5 border border-red-200 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="email" required autoComplete="email"
                  placeholder="admin@shivfurniture.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'} required autoComplete="current-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="block w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-slate-900 text-sm placeholder:text-slate-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 transition-all"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit" disabled={isLoading}
              className="w-full flex items-center justify-center rounded-xl bg-indigo-700 px-4 py-3.5 text-sm font-bold text-white hover:bg-indigo-800 focus:outline-none focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/20"
            >
              {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-slate-400">
            QuickMate ERP · Manufacturing Suite
          </p>
        </div>
      </div>
    </div>
  );
}
