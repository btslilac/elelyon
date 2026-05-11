"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CashFlowMonth } from "@/lib/reports/report.types";

interface CashFlowChartProps {
  months: CashFlowMonth[];
}

function shortAmount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}

export default function CashFlowChart({ months }: CashFlowChartProps) {
  if (!months || months.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-13">
        No cash flow data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={months} margin={{ top: 4, right: 16, left: 0, bottom: 4 }} barSize={16} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={shortAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number, name: string) => [
            `KES ${value.toLocaleString()}`,
            name === "disbursed" ? "Disbursed" : "Collected",
          ]}
          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="disbursed" name="Disbursed" fill="#6366f1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
