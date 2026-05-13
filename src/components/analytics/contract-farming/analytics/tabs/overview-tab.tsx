import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { AnalyticsKpis, DedupedFarmerRow } from '../use-analytics-data';
import { ChartCard } from '../shared/chart-card';
import {
  CHART_AXIS_TEXT,
  CHART_GRID,
  CHART_PRIMARY,
  CHART_SECONDARY,
} from '../shared/chart-colors';
import { StatCard } from '../shared/stat-card';

function formatFarmerTick(v: unknown): string {
  const s = String(v ?? '');
  return s.length > 13 ? `${s.slice(0, 13)}…` : s;
}

export interface OverviewTabProps {
  kpis: AnalyticsKpis;
  farmerRows: DedupedFarmerRow[];
  gradeKeys: readonly string[];
}

export function OverviewTab({ kpis, farmerRows, gradeKeys }: OverviewTabProps) {
  const quintalData = React.useMemo(
    () =>
      [...farmerRows]
        .sort((a, b) => b.avgQuintalPerAcre - a.avgQuintalPerAcre)
        .map((f) => ({
          name: f.farmer,
          farmerLabel14: f.farmerLabel14,
          avgQuintalPerAcre: f.avgQuintalPerAcre,
        })),
    [farmerRows]
  );

  const inOutData = React.useMemo(
    () =>
      farmerRows.map((f) => ({
        name: f.farmer,
        qty: f.qty,
        totalAfterGrading: f.totalAfterGrading,
      })),
    [farmerRows]
  );

  const nQuintal = quintalData.length;
  const quintalWidth =
    nQuintal > 8 ? Math.max(600, nQuintal * 80) : ('100%' as const);
  const nInOut = inOutData.length;
  const inOutWidth =
    nInOut > 8 ? Math.max(600, nInOut * 80) : ('100%' as const);

  return (
    <div className="space-y-6" key={gradeKeys.join('|')}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Total farmers" value={kpis.totalFarmers} />
        <StatCard label="Total acres" value={kpis.totalAcres.toFixed(1)} />
        <StatCard label="Total seed bags given" value={kpis.totalQty} />
        <StatCard
          label="Avg output %"
          value={kpis.avgOutputPct.toFixed(1)}
          unit="%"
        />
        <StatCard
          label="Total wastage kg"
          value={Math.round(kpis.totalWastageKg).toLocaleString()}
        />
        <StatCard
          label="Total amount payable"
          value={`₹${Math.round(kpis.totalAmount).toLocaleString()}`}
        />
      </div>

      <ChartCard title="Quintal per acre by farmer">
        <div className={nQuintal > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={quintalWidth} height={320}>
            <BarChart
              data={quintalData}
              margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis
                dataKey="farmerLabel14"
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }} />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === 'number' ? value : Number(value);
                  if (!Number.isFinite(n)) return ['', 'Quintal / acre'];
                  return [n.toFixed(2), 'Quintal / acre'];
                }}
                labelFormatter={(_, p) => String(p?.[0]?.payload?.name ?? '')}
              />
              <Legend />
              <Bar
                dataKey="avgQuintalPerAcre"
                name="Quintal / acre"
                fill={CHART_PRIMARY}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Seed in vs graded bags out">
        <div className={nInOut > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={inOutWidth} height={320}>
            <BarChart
              data={inOutData}
              margin={{ top: 8, right: 8, left: 8, bottom: 48 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis
                dataKey="name"
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
                tickFormatter={formatFarmerTick}
              />
              <YAxis tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }} />
              <Tooltip labelFormatter={(v) => String(v)} />
              <Legend />
              <Bar
                dataKey="qty"
                name="Seed given (bags)"
                fill={CHART_PRIMARY}
              />
              <Bar
                dataKey="totalAfterGrading"
                name="Graded output (bags)"
                fill={CHART_SECONDARY}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
