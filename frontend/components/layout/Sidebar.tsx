"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  Factory,
  Box,
  Users,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Zap,
  LayoutGrid,
  ClipboardList,
  Cpu,
  GitBranch,
  BarChart2,
  FlaskConical,
  MonitorPlay,
  GitMerge,
  Bell,
  Layers,
} from 'lucide-react';

const SIDEBAR_BG = '#1E1B4B';
const SIDEBAR_BORDER = '#312E81';
const ACTIVE_BG = '#4F46E5';
const HOVER_BG = '#312E81';
const MFG_ACCENT = '#F59E0B';

type Role = 'ADMIN' | 'SALES' | 'PURCHASE' | 'MANUFACTURING' | 'INVENTORY' | 'OWNER';

const topNav: Array<{ name: string; href: string; icon: React.ElementType; badge?: string | null; roles?: Role[] }> = [
  { name: 'Control Tower',       href: '/dashboard',               icon: LayoutDashboard, badge: null   },
  { name: 'Intelligence Center', href: '/operations-intelligence', icon: Zap,             badge: 'LIVE' },
  { name: 'Flow Tracker',        href: '/flow-tracker',            icon: GitMerge,        badge: 'START' },
  { name: 'Sales Orders',        href: '/sales-orders',            icon: ShoppingCart,    badge: null, roles: ['ADMIN', 'SALES', 'OWNER'] },
  { name: 'Purchase Orders',     href: '/purchase-orders',         icon: Truck,           badge: null, roles: ['ADMIN', 'PURCHASE', 'INVENTORY', 'OWNER'] },
];

const mfgNav = [
  { name: 'Overview',         href: '/manufacturing',            icon: LayoutGrid    },
  { name: 'Orders',           href: '/manufacturing/orders',     icon: ClipboardList },
  { name: 'Production Floor', href: '/production-floor',         icon: MonitorPlay   },
  { name: 'Simulation',       href: '/manufacturing/simulate',   icon: FlaskConical  },
];

const resourcesNav = [
  { name: 'Work Centers',       href: '/manufacturing/work-centers', icon: Cpu        },
  { name: 'Bills of Materials', href: '/manufacturing/boms',         icon: GitBranch  },
  { name: 'Capacity Planning',  href: '/manufacturing/capacity',     icon: BarChart2  },
  { name: 'Work Orders',        href: '/manufacturing/work-orders',  icon: Layers     },
];

const bottomNav: Array<{ name: string; href: string; icon: React.ElementType; roles?: Role[] }> = [
  { name: 'Products',        href: '/products',        icon: Box         },
  { name: 'Notifications',   href: '/notifications',   icon: Bell        },
  { name: 'User Management', href: '/user-management', icon: Users,       roles: ['ADMIN', 'OWNER'] },
  { name: 'Audit Logs',      href: '/audit-logs',      icon: ShieldCheck, roles: ['ADMIN', 'OWNER'] },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileSidebar: () => void;
}

function cx(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

function canAccess(roles: Role[] | undefined, userRole: Role | null) {
  if (!roles || roles.length === 0) return true;
  if (!userRole) return true;
  if (userRole === 'ADMIN' || userRole === 'OWNER') return true;
  return roles.includes(userRole);
}

export function Sidebar({ isOpen, isCollapsed, toggleCollapse, closeMobileSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<Role | null>(null);
  const [mfgOpen, setMfgOpen] = useState(
    pathname?.startsWith('/manufacturing') || pathname === '/production-floor' || false
  );
  const [resourcesOpen, setResourcesOpen] = useState(
    resourcesNav.some(r => pathname === r.href || pathname?.startsWith(r.href + '/')) || false
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.role) setUserRole(u.role as Role);
      }
    } catch {}
  }, []);

  const showMfg = canAccess(['ADMIN', 'MANUFACTURING', 'OWNER'], userRole);
  const visibleTopNav = topNav.filter(item => canAccess(item.roles, userRole));
  const visibleBottomNav = bottomNav.filter(item => canAccess(item.roles, userRole));

  const isMfgActive =
    pathname?.startsWith('/manufacturing') || pathname === '/production-floor';
  const isResourcesActive = resourcesNav.some(
    r => pathname === r.href || pathname?.startsWith(r.href + '/')
  );

  const handleLink = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) closeMobileSidebar();
  };

  const renderItem = (item: { name: string; href: string; icon: React.ElementType; badge?: string | null }) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    return (
      <li key={item.name}>
        <Link
          href={item.href}
          onClick={handleLink}
          title={isCollapsed ? item.name : undefined}
          style={isActive ? { backgroundColor: ACTIVE_BG } : undefined}
          className={cx(
            'group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            isActive ? 'text-white shadow-md' : 'text-indigo-200'
          )}
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = HOVER_BG; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <item.icon className={cx(
            'h-[18px] w-[18px] shrink-0 transition-colors',
            isActive ? 'text-white' : 'text-indigo-400 group-hover:text-white'
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate">{item.name}</span>
              {item.badge && (
                <span className={cx(
                  'rounded-full text-[10px] font-bold px-1.5 py-0.5',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'border border-indigo-400/30 text-indigo-300'
                )}>{item.badge}</span>
              )}
            </>
          )}
        </Link>
      </li>
    );
  };

  const renderSubItem = (
    item: { name: string; href: string; icon: React.ElementType },
    accent?: boolean
  ) => {
    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
    return (
      <li key={item.name}>
        <Link
          href={item.href}
          onClick={handleLink}
          className={cx(
            'group flex items-center gap-x-3 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-200',
            isActive && accent
              ? 'font-semibold'
              : isActive
              ? 'text-white font-semibold'
              : 'text-indigo-300 hover:text-white'
          )}
          style={
            isActive && accent
              ? { backgroundColor: `${MFG_ACCENT}26`, color: MFG_ACCENT }
              : isActive
              ? { backgroundColor: ACTIVE_BG }
              : undefined
          }
          onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = HOVER_BG; }}
          onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
        >
          <item.icon
            className="h-4 w-4 shrink-0"
            style={isActive && accent ? { color: MFG_ACCENT } : undefined}
          />
          <span>{item.name}</span>
          {item.name === 'Simulation' && !isActive && accent && (
            <span
              className="ml-auto rounded-full text-[10px] font-bold px-1.5 py-0.5"
              style={{ backgroundColor: `${MFG_ACCENT}33`, color: MFG_ACCENT }}
            >DEMO</span>
          )}
        </Link>
      </li>
    );
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden backdrop-blur-sm"
          onClick={closeMobileSidebar}
        />
      )}

      <div
        style={{ backgroundColor: SIDEBAR_BG, borderColor: SIDEBAR_BORDER }}
        className={cx(
          isOpen ? 'translate-x-0' : '-translate-x-full',
          isCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out lg:translate-x-0'
        )}
      >
        <div
          className="flex h-16 shrink-0 items-center justify-between px-4 border-b"
          style={{ borderColor: SIDEBAR_BORDER }}
        >
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md"
                style={{ background: `linear-gradient(135deg, ${ACTIVE_BG}, #7C3AED)` }}
              >
                <span className="text-white font-black text-sm">Q</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none tracking-tight">QuickMate</p>
                <p className="text-indigo-400 text-[10px] mt-0.5">ERP Platform</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div
              className="mx-auto w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${ACTIVE_BG}, #7C3AED)` }}
            >
              <span className="text-white font-black text-sm">Q</span>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-indigo-400 hover:text-white transition-colors"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = HOVER_BG; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 gap-y-1">
          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">Operations</p>
          )}
          <ul role="list" className="space-y-0.5">
            {visibleTopNav.map(renderItem)}
          </ul>

          {showMfg && (
            <>
          <div className="my-2 border-t" style={{ borderColor: SIDEBAR_BORDER }} />

          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: `${MFG_ACCENT}99` }}>
              Manufacturing
            </p>
          )}
          <div>
            <button
              onClick={() => !isCollapsed && setMfgOpen(o => !o)}
              title={isCollapsed ? 'Manufacturing' : undefined}
              className="w-full flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200"
              style={
                isMfgActive
                  ? { backgroundColor: HOVER_BG, color: MFG_ACCENT, border: `1px solid ${MFG_ACCENT}33` }
                  : { color: '#C7D2FE' }
              }
              onMouseEnter={(e) => { if (!isMfgActive) e.currentTarget.style.backgroundColor = HOVER_BG; }}
              onMouseLeave={(e) => { if (!isMfgActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Factory className="h-[18px] w-[18px] shrink-0" style={isMfgActive ? { color: MFG_ACCENT } : undefined} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Manufacturing</span>
                  <ChevronDown className={cx(
                    'h-3.5 w-3.5 transition-transform duration-200',
                    mfgOpen ? 'rotate-180' : ''
                  )} style={{ color: '#6366F1' }} />
                </>
              )}
            </button>

            {!isCollapsed && mfgOpen && (
              <ul role="list" className="mt-1 space-y-0.5 pl-3 ml-3 border-l" style={{ borderColor: `${MFG_ACCENT}33` }}>
                {mfgNav.map(item => renderSubItem(item, true))}

                <li>
                  <button
                    onClick={() => setResourcesOpen(o => !o)}
                    className="w-full flex items-center gap-x-3 rounded-xl px-2.5 py-2 text-[13px] text-indigo-300 hover:text-white transition-all"
                    style={isResourcesActive ? { color: MFG_ACCENT } : undefined}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = HOVER_BG; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <Layers className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">Resources</span>
                    <ChevronDown className={cx('h-3 w-3 transition-transform', resourcesOpen ? 'rotate-180' : '')} />
                  </button>
                  {resourcesOpen && (
                    <ul className="mt-0.5 ml-4 space-y-0.5 border-l pl-2" style={{ borderColor: `${MFG_ACCENT}22` }}>
                      {resourcesNav.map(item => renderSubItem(item))}
                    </ul>
                  )}
                </li>
              </ul>
            )}

            {isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {[...mfgNav, ...resourcesNav].map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className="flex items-center justify-center rounded-xl p-2.5 transition-all"
                      style={isActive ? { backgroundColor: `${MFG_ACCENT}26`, color: MFG_ACCENT } : { color: '#6366F1' }}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="my-2 border-t" style={{ borderColor: SIDEBAR_BORDER }} />
            </>
          )}

          {!showMfg && <div className="my-2 border-t" style={{ borderColor: SIDEBAR_BORDER }} />}

          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">System</p>
          )}
          <ul role="list" className="space-y-0.5">
            {visibleBottomNav.map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleLink}
                    title={isCollapsed ? item.name : undefined}
                    style={isActive ? { backgroundColor: ACTIVE_BG } : undefined}
                    className={cx(
                      'group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive ? 'text-white' : 'text-indigo-200'
                    )}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = HOVER_BG; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <item.icon className={cx(
                      'h-[18px] w-[18px] shrink-0',
                      isActive ? 'text-white' : 'text-indigo-400 group-hover:text-white'
                    )} />
                    {!isCollapsed && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
