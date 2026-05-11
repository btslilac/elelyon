import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ReactNode } from "react";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
  icon?: ReactNode;
  variant?: "default" | "danger" | "success" | "warning";
  className?: string;
}

export default function KpiCard({
  label,
  value,
  subtext,
  trend,
  trendLabel,
  icon,
  variant = "default",
  className,
}: KpiCardProps) {
  const variantStyles = {
    default: { bg: "bg-gray-50", text: "text-gray-700", ring: "ring-gray-200/50" },
    danger:  { bg: "bg-red-50",  text: "text-red-600",  ring: "ring-red-100" },
    success: { bg: "bg-green-50",text: "text-green-600",ring: "ring-green-100" },
    warning: { bg: "bg-amber-50",text: "text-amber-600",ring: "ring-amber-100" },
  }[variant];

  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-green-600" : trend === "down" ? "text-red-500" : "text-gray-400";

  return (
    <div className={cn("card-premium flex flex-col justify-between group overflow-hidden relative", className)}>
      <div className="flex justify-between items-start mb-6">
        <p className="text-12 font-bold text-gray-500 uppercase tracking-widest">{label}</p>
        {icon && (
          <div className={cn("p-2 rounded-lg ring-1 transition-colors", variantStyles.bg, variantStyles.text, variantStyles.ring)}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-32 font-bold text-gray-900 tracking-tight tabular-nums leading-none">
          {value}
        </h2>

        {(subtext || trend) && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {trend && (
              <span className={cn("flex items-center gap-1 text-12 font-semibold", trendColor)}>
                <TrendIcon className="size-3.5" />
                {trendLabel}
              </span>
            )}
            {subtext && (
              <span className="text-12 text-gray-500">{subtext}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
