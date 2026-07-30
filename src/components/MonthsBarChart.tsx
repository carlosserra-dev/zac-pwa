"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

export function MonthsBarChart({ data }: { data: MonthTotal[] }) {
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
            {data.map((entry, index) => (
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
