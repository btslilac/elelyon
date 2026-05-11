import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ReportCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  badgeVariant?: "default" | "danger" | "warning" | "success";
}

const badgeStyles = {
  default: "badge badge-pending",
  danger:  "badge badge-error",
  warning: "bg-amber-100 text-amber-700 text-10 font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
  success: "badge badge-success",
};

export default function ReportCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
  badgeVariant = "default",
}: ReportCardProps) {
  return (
    <Link
      href={href}
      className="card-premium group flex flex-col gap-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="p-2.5 bg-primary/5 rounded-xl text-primary group-hover:bg-primary/10 transition-colors">
          <Icon className="size-5" />
        </div>
        {badge && (
          <span className={badgeStyles[badgeVariant]}>{badge}</span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-15 font-semibold text-gray-900 tracking-tight">{title}</h3>
        <p className="text-13 text-gray-500 mt-1 leading-relaxed">{description}</p>
      </div>

      <div className="flex items-center gap-1.5 text-primary text-12 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
        <span>Generate Report</span>
        <ArrowRight className="size-3.5" />
      </div>
    </Link>
  );
}
