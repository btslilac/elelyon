"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PortfolioChartProps {
  data: {
    activeLoans: number;
    overdueLoans: number;
    completedLoans: number;
    defaultedLoans: number;
    pendingLoans: number;
  };
}

const COLORS = ["#22c55e", "#ef4444", "#6366f1", "#f59e0b", "#94a3b8"];

export default function PortfolioChart({ data }: PortfolioChartProps) {
  const chartData = [
    { name: "Active", value: data.activeLoans },
    { name: "Overdue", value: data.overdueLoans },
    { name: "Completed", value: data.completedLoans },
    { name: "Defaulted", value: data.defaultedLoans },
    { name: "Pending", value: data.pendingLoans },
  ].filter((d) => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-13">
        No loan data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          outerRadius={100}
          innerRadius={55}
          paddingAngle={3}
          dataKey="value"
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => [value, "Loans"]}
          contentStyle={{ borderRadius: "0.75rem", border: "1px solid #e5e7eb", fontSize: 12 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
