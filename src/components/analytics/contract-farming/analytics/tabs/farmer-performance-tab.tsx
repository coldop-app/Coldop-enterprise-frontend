import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';

import { findBelow40Label, type DedupedFarmerRow } from '../use-analytics-data';
import { ChartCard } from '../shared/chart-card';
import {
  CHART_AXIS_TEXT,
  CHART_DANGER,
  CHART_GRID,
  CHART_NEUTRAL,
  CHART_PRIMARY,
  CHART_WARNING,
  VARIETY_COLORS,
} from '../shared/chart-colors';

function formatFarmerTick(v: unknown): string {
  const s = String(v ?? '');
  return s.length > 13 ? `${s.slice(0, 13)}…` : s;
}

export interface FarmerPerformanceTabProps {
  farmerRows: DedupedFarmerRow[];
  gradeKeys: readonly string[];
}

export function FarmerPerformanceTab({
  farmerRows,
  gradeKeys,
}: FarmerPerformanceTabProps) {
  const belowLabel = findBelow40Label(gradeKeys);

  const composedData = React.useMemo(
    () =>
      farmerRows.map((f) => ({
        name: f.farmer,
        avgOutputPct: f.avgOutputPct,
        below40Pct: belowLabel != null ? (f.gradePcts[belowLabel] ?? 0) : 0,
      })),
    [farmerRows, belowLabel]
  );

  const wastageData = React.useMemo(() => {
    const sorted = [...farmerRows].sort(
      (a, b) => b.totalWastageKg - a.totalWastageKg
    );
    const w = sorted.map((f) => f.totalWastageKg).sort((a, b) => a - b);
    let median = 0;
    if (w.length > 0) {
      const mid = Math.floor(w.length / 2);
      median = w.length % 2 === 1 ? w[mid]! : (w[mid - 1]! + w[mid]!) / 2;
    }
    return { sorted, median };
  }, [farmerRows]);

  const varieties = React.useMemo(() => {
    const set = new Set<string>();
    for (const f of farmerRows) {
      if (f.variety) set.add(f.variety);
    }
    return Array.from(set);
  }, [farmerRows]);

  const nWaste = wastageData.sorted.length;
  const wasteWidth =
    nWaste > 8 ? Math.max(600, nWaste * 80) : ('100%' as const);
  const nComp = composedData.length;
  const compWidth = nComp > 8 ? Math.max(600, nComp * 80) : ('100%' as const);

  return (
    <div className="space-y-6">
      <ChartCard title="Acres vs quintal per acre (dot size = seed qty)">
        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
            <XAxis
              type="number"
              dataKey="acres"
              name="Acres"
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            />
            <YAxis
              type="number"
              dataKey="avgQuintalPerAcre"
              name="Quintal / acre"
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
            />
            <ZAxis type="number" dataKey="qty" range={[80, 400]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload as DedupedFarmerRow;
                if (!p) return null;
                return (
                  <div className="font-custom border-border rounded-md border bg-white px-3 py-2 text-xs shadow-md">
                    <p className="font-semibold text-gray-800">{p.farmer}</p>
                    <p className="text-gray-600">Variety: {p.variety}</p>
                    <p className="text-gray-600">Acres: {p.acres}</p>
                    <p className="text-gray-600">
                      Quintal / acre: {p.avgQuintalPerAcre.toFixed(2)}
                    </p>
                    <p className="text-gray-600">Seed qty: {p.qty}</p>
                  </div>
                );
              }}
            />
            <Legend />
            {varieties.map((v, i) => (
              <Scatter
                key={v}
                name={v}
                data={farmerRows.filter((f) => f.variety === v)}
                fill={VARIETY_COLORS[i % VARIETY_COLORS.length]!}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Wastage kg by farmer">
        <div className={nWaste > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={wasteWidth} height={320}>
            <BarChart
              layout="vertical"
              data={wastageData.sorted}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis
                type="number"
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
              />
              <YAxis
                type="category"
                dataKey="farmer"
                width={100}
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
                tickFormatter={formatFarmerTick}
              />
              <Tooltip
                formatter={(v) => {
                  const n = typeof v === 'number' ? v : Number(v);
                  if (!Number.isFinite(n)) return ['', 'Wastage'];
                  return [`${n.toLocaleString()} kg`, 'Wastage'];
                }}
              />
              <Legend />
              <Bar
                dataKey="totalWastageKg"
                name="Wastage (kg)"
                radius={[0, 4, 4, 0]}
              >
                {wastageData.sorted.map((entry) => (
                  <Cell
                    key={entry.farmerMobile}
                    fill={
                      entry.totalWastageKg > wastageData.median
                        ? CHART_WARNING
                        : CHART_NEUTRAL
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Output % vs below-40 weight %">
        <div className={nComp > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={compWidth} height={320}>
            <ComposedChart
              data={composedData}
              margin={{ top: 8, right: 16, left: 8, bottom: 48 }}
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
              <YAxis
                yAxisId="left"
                domain={[0, 100]}
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
              />
              <Tooltip />
              <Legend />
              <Bar
                yAxisId="left"
                dataKey="avgOutputPct"
                name="Output %"
                fill={CHART_PRIMARY}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="below40Pct"
                name="Below-40 %"
                stroke={CHART_DANGER}
                dot={false}
                strokeWidth={2}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
