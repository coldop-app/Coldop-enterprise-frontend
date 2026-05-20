import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { VarietyGroup } from '../use-analytics-data';
import { ChartCard } from '../shared/chart-card';
import {
  CHART_AXIS_TEXT,
  CHART_GRID,
  VARIETY_COLORS,
} from '../shared/chart-colors';

const AXIS_ORDER = [
  'Yield',
  'Output %',
  'Premium %',
  'Low Grade %',
  'Efficiency',
] as const;

function metricsForVariety(
  v: VarietyGroup,
  maxQuintal: number,
  maxWastage: number
): Record<(typeof AXIS_ORDER)[number], number> {
  const maxQ = maxQuintal > 0 ? maxQuintal : 1;
  const maxW = maxWastage > 0 ? maxWastage : 1;
  return {
    Yield: (v.avgQuintalPerAcre / maxQ) * 100,
    'Output %': Math.min(100, v.avgOutputPct),
    'Premium %': Math.min(100, v.avgAbove50Pct),
    'Low Grade %': Math.min(100, Math.max(0, 100 - v.avgBelow40Pct)),
    Efficiency: (1 - v.avgWastageKg / maxW) * 100,
  };
}

export interface VarietyComparisonTabProps {
  varietyGroups: VarietyGroup[];
}

export function VarietyComparisonTab({
  varietyGroups,
}: VarietyComparisonTabProps) {
  const { metricBarData, radarData } = React.useMemo(() => {
    if (varietyGroups.length === 0) {
      return {
        metricBarData: [] as Record<string, string | number>[],
        radarData: [],
      };
    }

    const metricRows: Record<string, string | number>[] = [
      { metric: 'Avg Quintal/Acre' },
      { metric: 'Output %' },
      { metric: 'Wastage Kg (÷10)' },
      { metric: 'Below-40 %' },
      { metric: 'Above-50 %' },
    ];
    for (const vg of varietyGroups) {
      metricRows[0]![vg.variety] = vg.avgQuintalPerAcre;
      metricRows[1]![vg.variety] = vg.avgOutputPct;
      metricRows[2]![vg.variety] = vg.avgWastageKg / 10;
      metricRows[3]![vg.variety] = vg.avgBelow40Pct;
      metricRows[4]![vg.variety] = vg.avgAbove50Pct;
    }

    const maxQuintal = Math.max(
      ...varietyGroups.map((v) => v.avgQuintalPerAcre),
      1e-9
    );
    const maxWastage = Math.max(
      ...varietyGroups.map((v) => v.avgWastageKg),
      1e-9
    );

    const radarRows: Record<string, string | number>[] = AXIS_ORDER.map(
      (axis) => {
        const row: Record<string, string | number> = { metric: axis };
        for (const vg of varietyGroups) {
          const m = metricsForVariety(vg, maxQuintal, maxWastage);
          row[vg.variety] = m[axis];
        }
        return row;
      }
    );

    return { metricBarData: metricRows, radarData: radarRows };
  }, [varietyGroups]);

  const barWidth =
    varietyGroups.length > 3
      ? Math.max(600, varietyGroups.length * 120)
      : ('100%' as const);

  return (
    <div className="space-y-6">
      <ChartCard
        title="Metric comparison across varieties"
        subtitle="(Wastage ÷10 for scale)"
      >
        <div className={varietyGroups.length > 3 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={barWidth} height={320}>
            <BarChart
              data={metricBarData}
              margin={{ top: 8, right: 8, left: 8, bottom: 56 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis
                dataKey="metric"
                tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={72}
              />
              <YAxis tick={{ fill: CHART_AXIS_TEXT, fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {varietyGroups.map((vg, i) => (
                <Bar
                  key={vg.variety}
                  dataKey={vg.variety}
                  fill={VARIETY_COLORS[i % VARIETY_COLORS.length]!}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Variety health at a glance (radar)">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius={120}>
            <PolarGrid stroke={CHART_GRID} />
            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 11 }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: CHART_AXIS_TEXT, fontSize: 10 }}
            />
            <Tooltip />
            <Legend />
            {varietyGroups.map((vg, i) => (
              <Radar
                key={vg.variety}
                name={vg.variety}
                dataKey={vg.variety}
                stroke={VARIETY_COLORS[i % VARIETY_COLORS.length]}
                fill={VARIETY_COLORS[i % VARIETY_COLORS.length]}
                fillOpacity={0.15}
                strokeWidth={2}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
