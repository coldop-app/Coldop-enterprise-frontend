import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string;
}

export function StatCard({
  label,
  value,
  unit,
  trend,
  trendLabel,
}: StatCardProps) {
  const TrendIcon =
    trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : Minus;
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600'
      : trend === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <div className="font-custom border-border rounded-xl border bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[#333]">
        {value}
        {unit ? (
          <span className="text-base font-semibold text-gray-600">{unit}</span>
        ) : null}
      </p>
      {trend && trendLabel ? (
        <p
          className={cn(
            'mt-1 flex items-center gap-1 text-xs font-medium',
            trendColor
          )}
        >
          <TrendIcon className="size-3.5 shrink-0" aria-hidden />
          {trendLabel}
        </p>
      ) : null}
    </div>
  );
}
