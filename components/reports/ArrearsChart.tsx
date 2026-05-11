"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ArrearsSummary } from "@/lib/reports/report.types";

interface ArrearsChartProps {
  summary: ArrearsSummary;
}

const BUCKET_COLORS = ["#f59e0b", "#f97316", "#ef4444", "#7f1d1d"];

export default function ArrearsChart({ summary }: ArrearsChartProps) {
  const data = [
    { bucket: "1–30 Days",  balance: summary.bucket1_30.totalBalance,  count: summary.bucket1_30.count },
    { bucket: "31–60 Days", balance: summary.bucket31_60.totalBalance, count: summary.bucket31_60.count },
    { bucket: "61–90 Days", balance: summary.bucket61_90.totalBalance, count: summary.bucket61_90.count },
    { bucket: "90+ Days",   balance: summary.bucket90plus.totalBalance,count: summary.bucket90plus.count },
  ];

  function shortAmount(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return String(value);
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} barSize={40} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={shortAmount} tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value: number) => [`KES ${value.toLocaleString()}`, "Outstanding Balance"]}
          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Bar dataKey="balance" name="Balance" radius={[6, 6, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={BUCKET_COLORS[index]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
