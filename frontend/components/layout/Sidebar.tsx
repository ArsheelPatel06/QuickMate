"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  Factory, 
  Settings, 
  Box, 
  Users, 
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Sales Orders', href: '/sales-orders', icon: ShoppingCart },
  { name: 'Purchase Orders', href: '/purchase-orders', icon: Truck },
  { name: 'Manufacturing Orders', href: '/manufacturing-orders', icon: Factory },
  { name: 'Bills of Materials', href: '/boms', icon: Settings },
  { name: 'Products', href: '/products', icon: Box },
  { name: 'Audit Logs', href: '/audit-logs', icon: ShieldCheck },
  { name: 'User Management', href: '/user-management', icon: Users },
];

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  toggleCollapse: () => void;
  closeMobileSidebar: () => void;
}

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export function Sidebar({ isOpen, isCollapsed, toggleCollapse, closeMobileSidebar }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/80 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={closeMobileSidebar}
        />
      )}

      {/* Sidebar Container */}
      <div className={classNames(
        isOpen ? "translate-x-0" : "-translate-x-full",
        isCollapsed ? "lg:w-20" : "lg:w-72",
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none"
      )}>
        
        {/* Sidebar Header / Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-100">
          {!isCollapsed && (
            <span className="text-xl font-bold tracking-tight text-blue-600">
              Mini ERP
            </span>
          )}
          {isCollapsed && (
            <span className="text-xl font-black tracking-tight text-blue-600 mx-auto">
              ME
            </span>
          )}
          
          <button 
            onClick={toggleCollapse} 
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-4 py-6">
          <ul role="list" className="flex flex-1 flex-col gap-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={classNames(
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50',
                      'group flex items-center gap-x-3 rounded-lg p-2.5 text-sm leading-6 font-medium transition-all duration-200'
                    )}
                    onClick={() => {
                      if (window.innerWidth < 1024) closeMobileSidebar();
                    }}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon
                      className={classNames(
                        isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-blue-600',
                        'h-5 w-5 shrink-0 transition-colors'
                      )}
                      aria-hidden="true"
                    />
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
