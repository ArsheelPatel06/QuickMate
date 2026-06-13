"use client";

type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'STABLE' | 'BOTTLENECK' | 'HIGH_LOAD' | 'MODERATE' | 'UNDERUTILIZED';

const STYLES: Record<RiskLevel, string> = {
  CRITICAL:     'bg-red-100 text-red-700 border border-red-200',
  HIGH:         'bg-orange-100 text-orange-700 border border-orange-200',
  MEDIUM:       'bg-yellow-100 text-yellow-700 border border-yellow-200',
  LOW:          'bg-green-100 text-green-700 border border-green-200',
  STABLE:       'bg-green-100 text-green-700 border border-green-200',
  BOTTLENECK:   'bg-red-100 text-red-700 border border-red-200',
  HIGH_LOAD:    'bg-orange-100 text-orange-700 border border-orange-200',
  MODERATE:     'bg-yellow-100 text-yellow-700 border border-yellow-200',
  UNDERUTILIZED:'bg-gray-100 text-gray-600 border border-gray-200',
};

const DOTS: Record<RiskLevel, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-orange-500', MEDIUM: 'bg-yellow-500',
  LOW: 'bg-green-500', STABLE: 'bg-green-500', BOTTLENECK: 'bg-red-500',
  HIGH_LOAD: 'bg-orange-500', MODERATE: 'bg-yellow-500', UNDERUTILIZED: 'bg-gray-400',
};

export function RiskBadge({ level }: { level: string }) {
  const style  = STYLES[level as RiskLevel] ?? 'bg-gray-100 text-gray-600 border border-gray-200';
  const dotCls = DOTS[level as RiskLevel] ?? 'bg-gray-400';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotCls}`} />
      {level.replace('_', ' ')}
    </span>
  );
}
