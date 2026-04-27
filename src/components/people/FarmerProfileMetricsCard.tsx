import { memo } from 'react';
import {
  ArrowUpFromLine,
  ArrowDownToLine,
  Clock,
  Layers,
  Warehouse,
  Truck,
} from 'lucide-react';

export interface FarmerProfileAggregates {
  totalBagsIncoming: number;
  totalBagsUngraded: number;
  totalBagsGraded: number;
  totalBagsStored: number;
  totalBagsNikasi: number;
  totalBagsOutgoing: number;
}

export interface FarmerProfileMetricsGridProps {
  aggregates: FarmerProfileAggregates;
}

const METRICS: Array<{
  key: keyof FarmerProfileAggregates;
  label: string;
  Icon: typeof ArrowUpFromLine;
  color: 'info' | 'warning' | 'default' | 'success';
}> = [
  {
    key: 'totalBagsIncoming',
    label: 'Incoming',
    Icon: ArrowUpFromLine,
    color: 'info',
  },
  {
    key: 'totalBagsUngraded',
    label: 'Ungraded',
    Icon: Clock,
    color: 'warning',
  },
  { key: 'totalBagsGraded', label: 'Grading', Icon: Layers, color: 'default' },
  { key: 'totalBagsStored', label: 'Storage', Icon: Warehouse, color: 'info' },
  {
    key: 'totalBagsNikasi',
    label: 'Dispatch (Preoutgoing)',
    Icon: Truck,
    color: 'default',
  },
  {
    key: 'totalBagsOutgoing',
    label: 'Dispatch (Outgoing)',
    Icon: ArrowDownToLine,
    color: 'success',
  },
];

const iconWrapperClass: Record<string, string> = {
  info: 'bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400',
  warning: 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400',
  success: 'bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400',
  default: 'bg-muted text-muted-foreground',
};

export const FarmerProfileMetricsGrid = memo(function FarmerProfileMetricsGrid({
  aggregates,
}: FarmerProfileMetricsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {METRICS.map(({ key, label, Icon, color }) => (
        <div
          key={key}
          className="border-border/50 bg-card space-y-2.5 rounded-xl border p-4"
        >
          <div className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${iconWrapperClass[color]}`}
            >
              <Icon className="h-3.5 w-3.5" />
            </div>
            <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
              {label}
            </span>
          </div>

          <div>
            <p className="text-foreground text-[22px] leading-none font-medium tabular-nums">
              {aggregates[key].toLocaleString('en-IN')}
            </p>
            <p className="text-muted-foreground/60 mt-1 text-[11px]">bags</p>
          </div>
        </div>
      ))}
    </div>
  );
});
