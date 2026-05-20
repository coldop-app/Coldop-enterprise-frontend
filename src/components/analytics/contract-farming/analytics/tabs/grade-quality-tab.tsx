import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { DedupedFarmerRow } from '../use-analytics-data';
import { ChartCard } from '../shared/chart-card';
import {
  CHART_AXIS_TEXT,
  CHART_GRID,
  CHART_NEUTRAL,
  CHART_WARNING,
  GRADE_COLORS,
} from '../shared/chart-colors';

function formatFarmerTick(v: unknown): string {
  const s = String(v ?? '');
  return s.length > 13 ? `${s.slice(0, 13)}…` : s;
}

export interface GradeQualityTabProps {
  farmerRows: DedupedFarmerRow[];
  gradeKeys: readonly string[];
  aggregateGradeDistribution: { label: string; value: number }[];
}

export function GradeQualityTab({
  farmerRows,
  gradeKeys,
  aggregateGradeDistribution,
}: GradeQualityTabProps) {
  const stackedData = React.useMemo(
    () =>
      farmerRows.map((f) => {
        const row: Record<string, string | number> = { name: f.farmer };
        for (const label of gradeKeys) {
          row[label] = f.gradePcts[label] ?? 0;
        }
        return row;
      }),
    [farmerRows, gradeKeys]
  );

  const cutLabel = React.useMemo(
    () => gradeKeys.find((k) => k.trim().toLowerCase() === 'cut') ?? 'Cut',
    [gradeKeys]
  );

  const cutData = React.useMemo(
    () =>
      farmerRows.map((f) => ({
        name: f.farmer,
        cutPct: f.gradePcts[cutLabel] ?? 0,
      })),
    [farmerRows, cutLabel]
  );

  const pieData = React.useMemo(
    () =>
      aggregateGradeDistribution.map((d) => ({
        name: d.label,
        value: d.value,
      })),
    [aggregateGradeDistribution]
  );

  const nStack = stackedData.length;
  const stackWidth =
    nStack > 8 ? Math.max(600, nStack * 80) : ('100%' as const);
  const nCut = cutData.length;
  const cutWidth = nCut > 8 ? Math.max(600, nCut * 80) : ('100%' as const);

  return (
    <div className="space-y-6">
      <ChartCard title="Grade weight % by farmer (stacked)">
        <div className={nStack > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={stackWidth} height={320}>
            <BarChart
              data={stackedData}
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
              <YAxis
                domain={[0, 100]}
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }}
              />
              <Tooltip
                formatter={(v) => {
                  const n = typeof v === 'number' ? v : Number(v);
                  if (!Number.isFinite(n)) return ['', ''];
                  return [`${n.toFixed(1)}%`, ''];
                }}
                labelFormatter={(v) => String(v)}
              />
              <Legend />
              <ReferenceLine
                y={40}
                stroke="#E24B4A"
                strokeDasharray="4 4"
                label="Below-40 threshold"
              />
              {gradeKeys.map((label) => (
                <Bar
                  key={label}
                  dataKey={label}
                  name={label}
                  stackId="g"
                  fill={GRADE_COLORS[label] ?? '#9ca3af'}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Aggregate grade distribution (all farmers)">
        <ResponsiveContainer width="100%" height={320}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={110}
              paddingAngle={1}
            >
              {pieData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={GRADE_COLORS[entry.name] ?? '#9ca3af'}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => {
                const n = typeof v === 'number' ? v : Number(v);
                if (!Number.isFinite(n)) return '';
                return `${n.toFixed(1)}%`;
              }}
            />
            <Legend
              verticalAlign="bottom"
              content={({ payload }) => (
                <ul className="font-custom mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-600">
                  {payload?.map((item) => {
                    const val = pieData.find(
                      (d) => d.name === item.value
                    )?.value;
                    return (
                      <li
                        key={String(item.value)}
                        className="flex items-center gap-1.5"
                      >
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: item.color }}
                          aria-hidden
                        />
                        <span>
                          {item.value}:{' '}
                          {val != null ? `${val.toFixed(1)}%` : '—'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cut bag % by farmer">
        <div className={nCut > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={cutWidth} height={320}>
            <BarChart
              data={cutData}
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
              <Tooltip
                formatter={(v) => {
                  const n = typeof v === 'number' ? v : Number(v);
                  if (!Number.isFinite(n)) return ['', 'Cut %'];
                  return [`${n.toFixed(2)}%`, 'Cut %'];
                }}
              />
              <Legend />
              <ReferenceLine
                y={3}
                stroke={CHART_WARNING}
                strokeDasharray="4 4"
                label="3% threshold"
              />
              <Bar dataKey="cutPct" name="Cut %" radius={[2, 2, 0, 0]}>
                {cutData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={entry.cutPct > 3 ? CHART_WARNING : CHART_NEUTRAL}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
