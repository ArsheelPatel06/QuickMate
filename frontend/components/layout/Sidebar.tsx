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
  BrainCircuit,
  Layers,
  FlaskConical,
  MonitorPlay,
  Activity,
  GitMerge,
  Bell,
} from 'lucide-react';

const topNav = [
  { name: 'Control Tower',       href: '/dashboard',               icon: LayoutDashboard, badge: null   },
  { name: 'Intelligence Center', href: '/operations-intelligence', icon: Zap,             badge: 'LIVE' },
  { name: 'Flow Tracker',        href: '/flow-tracker',            icon: GitMerge,        badge: null   },
  { name: 'Sales Orders',        href: '/sales-orders',            icon: ShoppingCart,    badge: null   },
  { name: 'Purchase Orders',     href: '/purchase-orders',         icon: Truck,           badge: null   },
];

const mfgNav = [
  { name: 'Overview',            href: '/manufacturing',                  icon: LayoutGrid    },
  { name: 'Orders',              href: '/manufacturing/orders',           icon: ClipboardList },
  { name: 'Work Orders',         href: '/manufacturing/work-orders',      icon: Layers        },
  { name: 'Production Floor',    href: '/production-floor',               icon: MonitorPlay   },
  { name: 'Work Centers',        href: '/manufacturing/work-centers',     icon: Cpu           },
  { name: 'Bills of Materials',  href: '/manufacturing/boms',             icon: GitBranch     },
  { name: 'Capacity Planning',   href: '/manufacturing/capacity',         icon: BarChart2     },
  { name: 'Bottleneck Analysis', href: '/manufacturing/bottleneck',       icon: Activity      },
  { name: 'Simulation',          href: '/manufacturing/simulate',         icon: FlaskConical  },
  { name: 'Intelligence',        href: '/manufacturing/intelligence',     icon: BrainCircuit  },
];

const bottomNav = [
  { name: 'Products',        href: '/products',        icon: Box         },
  { name: 'Notifications',   href: '/notifications',   icon: Bell        },
  { name: 'User Management', href: '/user-management', icon: Users       },
  { name: 'Audit Logs',      href: '/audit-logs',      icon: ShieldCheck },
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

export function Sidebar({ isOpen, isCollapsed, toggleCollapse, closeMobileSidebar }: SidebarProps) {
  const pathname = usePathname();
  const [mfgOpen, setMfgOpen] = useState(pathname?.startsWith('/manufacturing') ?? true);
  const [userInitials, setUserInitials] = useState('Q');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        const init = (u.name as string).split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
        setUserInitials(init);
      }
    } catch {}
  }, []);
  const isMfgActive = pathname?.startsWith('/manufacturing') || pathname === '/production-floor';

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
          className={cx(
            'group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
            isActive
              ? 'bg-indigo-700 text-white shadow-md shadow-indigo-900/50'
              : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
          )}
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
                    : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                )}>{item.badge}</span>
              )}
            </>
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

      {/* Sidebar — #1E1B4B = indigo-950 */}
      <div className={cx(
        isOpen ? 'translate-x-0' : '-translate-x-full',
        isCollapsed ? 'lg:w-[72px]' : 'lg:w-64',
        'fixed inset-y-0 left-0 z-50 flex flex-col bg-indigo-950 border-r border-indigo-900 transition-all duration-300 ease-in-out lg:translate-x-0'
      )}>

        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-4 border-b border-indigo-900">
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center shadow-md shadow-purple-500/30">
                <span className="text-white font-black text-sm">Q</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none tracking-tight">QuickMate</p>
                <p className="text-indigo-400 text-[10px] mt-0.5">ERP Platform</p>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="mx-auto w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-700 to-purple-500 flex items-center justify-center">
              <span className="text-white font-black text-sm">Q</span>
            </div>
          )}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-900 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-4 gap-y-1">

          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">Operations</p>
          )}
          <ul role="list" className="space-y-0.5">
            {topNav.map(renderItem)}
          </ul>

          <div className="my-2 border-t border-indigo-900" />

          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">Manufacturing</p>
          )}
          <div>
            {/* Manufacturing group header */}
            <button
              onClick={() => !isCollapsed && setMfgOpen(o => !o)}
              title={isCollapsed ? 'Manufacturing' : undefined}
              className={cx(
                'w-full flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                isMfgActive
                  ? 'bg-indigo-900 text-orange-400 border border-orange-500/20'
                  : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
              )}
            >
              <Factory className={cx('h-[18px] w-[18px] shrink-0', isMfgActive ? 'text-orange-400' : 'text-indigo-400')} />
              {!isCollapsed && (
                <>
                  <span className="flex-1 text-left">Manufacturing</span>
                  <ChevronDown className={cx(
                    'h-3.5 w-3.5 text-indigo-500 transition-transform duration-200',
                    mfgOpen ? 'rotate-180' : ''
                  )} />
                </>
              )}
            </button>

            {!isCollapsed && mfgOpen && (
              <ul role="list" className="mt-1 space-y-0.5 pl-3 ml-3 border-l border-orange-500/20">
                {mfgNav.map(item => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={handleLink}
                        className={cx(
                          'group flex items-center gap-x-3 rounded-xl px-2.5 py-2 text-[13px] transition-all duration-200',
                          isActive
                            ? 'bg-orange-500/15 text-orange-300 font-semibold'
                            : 'text-indigo-300 hover:text-white hover:bg-indigo-900'
                        )}
                      >
                        <item.icon className={cx(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-orange-400' : 'text-indigo-500 group-hover:text-indigo-300'
                        )} />
                        <span>{item.name}</span>
                        {item.name === 'Simulation' && !isActive && (
                          <span className="ml-auto rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold px-1.5 py-0.5">NEW</span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {isCollapsed && (
              <div className="mt-1 space-y-0.5">
                {mfgNav.map(item => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      title={item.name}
                      className={cx(
                        'flex items-center justify-center rounded-xl p-2.5 transition-all',
                        isActive ? 'bg-orange-500/15 text-orange-400' : 'text-indigo-500 hover:text-white hover:bg-indigo-900'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <div className="my-2 border-t border-indigo-900" />

          {!isCollapsed && (
            <p className="px-3 text-[10px] font-semibold text-indigo-500 uppercase tracking-widest mb-1">System</p>
          )}
          <ul role="list" className="space-y-0.5">
            {bottomNav.map(item => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={handleLink}
                    title={isCollapsed ? item.name : undefined}
                    className={cx(
                      'group flex items-center gap-x-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-indigo-700 text-white'
                        : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                    )}
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
