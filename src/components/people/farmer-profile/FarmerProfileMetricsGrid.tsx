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
}> = [
  { key: 'totalBagsIncoming', label: 'Incoming', Icon: ArrowUpFromLine },
  { key: 'totalBagsUngraded', label: 'Ungraded', Icon: Clock },
  { key: 'totalBagsGraded', label: 'Grading', Icon: Layers },
  { key: 'totalBagsStored', label: 'Storage', Icon: Warehouse },
  { key: 'totalBagsNikasi', label: 'Dispatch', Icon: Truck },
  { key: 'totalBagsOutgoing', label: 'Outgoing', Icon: ArrowDownToLine },
];

export const FarmerProfileMetricsGrid = memo(function FarmerProfileMetricsGrid({
  aggregates,
}: FarmerProfileMetricsGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {METRICS.map(({ key, label, Icon }) => (
        <div key={key} className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 dark:bg-primary/20 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl">
              <Icon className="text-primary h-5 w-5" />
            </div>
            <div>
              <p className="text-muted-foreground font-custom text-xs font-medium tracking-wide uppercase">
                {label}
              </p>
              <p className="font-custom text-xl font-bold tabular-nums">
                {aggregates[key].toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
