"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type MonthTotal = {
  label: string;
  total: number;
  isCurrent: boolean;
};

export type CategorySeries = {
  id: string;
  name: string;
  color: string;
};

// Quando `series` é passado, `data` deve ter uma chave por categoria
// (o id dela) com o valor daquele mês, além de `label`/`isCurrent`.
export type MonthSeriesRow = {
  label: string;
  isCurrent: boolean;
  [categoryId: string]: number | string | boolean;
};

type Props =
  | { data: MonthTotal[]; series?: undefined }
  | { data: MonthSeriesRow[]; series: CategorySeries[] };

export function MonthsBarChart({ data, series }: Props) {
  if (series && series.length > 0) {
    return (
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--chart-grid)"
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name]}
              cursor={{ fill: "var(--chart-cursor)" }}
              contentStyle={{
                backgroundColor: "var(--chart-tooltip-bg)",
                color: "var(--chart-tooltip-text)",
                border: "none",
                borderRadius: 8,
                fontSize: 13,
              }}
              labelStyle={{ color: "var(--chart-tooltip-text)" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12 }}
              formatter={(value: string) => (
                <span style={{ color: "var(--chart-axis)" }}>{value}</span>
              )}
            />
            {series.map((s) => (
              <Bar key={s.id} dataKey={s.id} name={s.name} fill={s.color} radius={[6, 6, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  const singleSeriesData = data as MonthTotal[];

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={singleSeriesData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="var(--chart-grid)"
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: "var(--chart-axis)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--chart-axis)" }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip
            formatter={(value: number) => [
              `R$ ${value.toFixed(2)}`,
              "Total",
            ]}
            cursor={{ fill: "var(--chart-cursor)" }}
            contentStyle={{
              backgroundColor: "var(--chart-tooltip-bg)",
              color: "var(--chart-tooltip-text)",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
            }}
            labelStyle={{ color: "var(--chart-tooltip-text)" }}
          />
          <Bar dataKey="total" radius={[6, 6, 0, 0]}>
            {singleSeriesData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.isCurrent
                    ? "var(--chart-bar)"
                    : "var(--chart-bar-muted)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
