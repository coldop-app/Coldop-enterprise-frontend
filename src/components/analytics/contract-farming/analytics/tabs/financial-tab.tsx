import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  CHART_DANGER,
  CHART_GRID,
  CHART_NEUTRAL,
  CHART_PRIMARY,
  CHART_SECONDARY,
} from '../shared/chart-colors';

function formatFarmerTick(v: unknown): string {
  const s = String(v ?? '');
  return s.length > 13 ? `${s.slice(0, 13)}…` : s;
}

export interface FinancialTabProps {
  farmerRows: DedupedFarmerRow[];
  nullNetAmountRatio: number;
}

type StackRow = {
  name: string;
  amount: number;
  buyBack: number;
  buyBackPending: boolean;
};

function StackTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StackRow }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0]?.payload;
  if (!p) return null;
  return (
    <div className="font-custom border-border rounded-md border bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-gray-800">{p.name}</p>
      <p className="text-gray-600">
        Seed cost: ₹{Math.round(p.amount).toLocaleString()}
      </p>
      <p className="text-gray-600">
        Buy-back: ₹{Math.round(p.buyBack).toLocaleString()}
        {p.buyBackPending ? ' (Pending)' : ''}
      </p>
    </div>
  );
}

export function FinancialTab({
  farmerRows,
  nullNetAmountRatio,
}: FinancialTabProps) {
  const perAcreData = React.useMemo(() => {
    const rows = farmerRows
      .filter((f) => f.acres > 0)
      .map((f) => ({
        name: f.farmer,
        amountPerAcre: f.amount / f.acres,
      }))
      .sort((a, b) => b.amountPerAcre - a.amountPerAcre);
    const mean =
      rows.length > 0
        ? rows.reduce((s, r) => s + r.amountPerAcre, 0) / rows.length
        : 0;
    return { rows, mean };
  }, [farmerRows]);

  const stackData = React.useMemo((): StackRow[] => {
    return farmerRows.map((f) => {
      const pending = f.buyBackAmount === null || f.buyBackAmount === undefined;
      const buyBack = pending ? 0 : Number(f.buyBackAmount);
      return {
        name: f.farmer,
        amount: f.amount,
        buyBack: Number.isFinite(buyBack) ? buyBack : 0,
        buyBackPending: pending,
      };
    });
  }, [farmerRows]);

  const netPerAcreData = React.useMemo(() => {
    return farmerRows
      .filter(
        (f) =>
          f.netAmountPerAcre !== null &&
          f.netAmountPerAcre !== undefined &&
          Number.isFinite(Number(f.netAmountPerAcre))
      )
      .map((f) => ({
        name: f.farmer,
        netAmountPerAcre: Number(f.netAmountPerAcre),
      }))
      .sort((a, b) => b.netAmountPerAcre - a.netAmountPerAcre);
  }, [farmerRows]);

  const nPerAcre = perAcreData.rows.length;
  const perAcreWidth =
    nPerAcre > 8 ? Math.max(600, nPerAcre * 80) : ('100%' as const);
  const nStack = stackData.length;
  const stackWidth =
    nStack > 8 ? Math.max(600, nStack * 80) : ('100%' as const);
  const nNet = netPerAcreData.length;
  const netWidth = nNet > 8 ? Math.max(600, nNet * 80) : ('100%' as const);

  const mean = perAcreData.mean;

  return (
    <div className="space-y-6">
      {nullNetAmountRatio > 0.5 ? (
        <div className="font-custom rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Net amounts not yet calculated — financial view is partial.
        </div>
      ) : null}

      <ChartCard title="Amount paid per acre by farmer">
        <div className={nPerAcre > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={perAcreWidth} height={320}>
            <BarChart
              data={perAcreData.rows}
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
                  if (!Number.isFinite(n)) return ['', 'Per acre'];
                  return [`₹${n.toFixed(2)}`, 'Per acre'];
                }}
              />
              <Legend />
              {mean > 0 ? (
                <ReferenceLine
                  y={mean}
                  stroke={CHART_AXIS_TEXT}
                  strokeDasharray="4 4"
                  label="avg"
                />
              ) : null}
              <Bar
                dataKey="amountPerAcre"
                name="₹ / acre"
                radius={[2, 2, 0, 0]}
              >
                {perAcreData.rows.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      mean > 0 && entry.amountPerAcre > mean * 1.5
                        ? CHART_DANGER
                        : CHART_PRIMARY
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Seed cost vs buy-back (stacked)">
        <div className={nStack > 8 ? 'overflow-x-auto' : ''}>
          <ResponsiveContainer width={stackWidth} height={320}>
            <BarChart
              data={stackData}
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
              <Tooltip content={<StackTooltip />} />
              <Legend />
              <Bar
                dataKey="amount"
                name="Seed cost (₹)"
                stackId="fin"
                fill={CHART_PRIMARY}
              />
              <Bar
                dataKey="buyBack"
                name="Buy-back (₹)"
                stackId="fin"
                radius={[2, 2, 0, 0]}
              >
                {stackData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={
                      entry.buyBackPending ? CHART_NEUTRAL : CHART_SECONDARY
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Net amount per acre (profitability)">
        {netPerAcreData.length === 0 ? (
          <p className="font-custom py-12 text-center text-sm text-gray-500">
            No net amount data available yet
          </p>
        ) : (
          <div className={nNet > 8 ? 'overflow-x-auto' : ''}>
            <ResponsiveContainer width={netWidth} height={320}>
              <BarChart
                data={netPerAcreData}
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
                    if (!Number.isFinite(n)) return ['', 'Net / acre'];
                    return [`₹${n.toFixed(2)}`, 'Net / acre'];
                  }}
                />
                <Legend />
                <Bar
                  dataKey="netAmountPerAcre"
                  name="Net ₹ / acre"
                  radius={[2, 2, 0, 0]}
                >
                  {netPerAcreData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={
                        entry.netAmountPerAcre >= 0
                          ? CHART_SECONDARY
                          : CHART_DANGER
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
