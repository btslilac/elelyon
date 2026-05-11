import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import {
  BarChart2,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  ShieldAlert,
  ClipboardList,
  Calendar,
  FileText,
} from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import HeaderBox from "@/components/HeaderBox";
import Link from "next/link";

export default async function ReportsPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const adminReports = [
    {
      title: "Loan Portfolio",
      description: "Total disbursed, outstanding balances, active/overdue/defaulted loan counts, and collection rate.",
      href: "/reports/portfolio",
      icon: BarChart2,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Collections Report",
      description: "Expected vs actual repayment collections filtered by date range. Track collection efficiency.",
      href: "/reports/collections",
      icon: TrendingUp,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Arrears & Delinquency",
      description: "Overdue loans categorized by aging buckets: 1–30, 31–60, 61–90, and 90+ days past due.",
      href: "/reports/arrears",
      icon: AlertTriangle,
      badge: "Live",
      badgeVariant: "danger" as const,
    },
    {
      title: "Cash Flow",
      description: "Monthly disbursements vs collections, net cash position, and 12-month trend analysis.",
      href: "/reports/cash-flow",
      icon: DollarSign,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Penalty Report",
      description: "Penalties charged, reversed, and outstanding with full detail by loan and date.",
      href: "/reports/penalties",
      icon: ShieldAlert,
    },
    {
      title: "Audit Log",
      description: "Full activity trail — repayments, approvals, reversals, penalties. Paginated and searchable.",
      href: "/reports/audit",
      icon: ClipboardList,
    },
  ];

  const monthlyReports = [
    {
      title: "Monthly Portfolio Report",
      description: "Period-based immutable snapshots. Opening/closing balances, new loans, collections — exactly as recorded at month-end.",
      href: "/reports/monthly",
      icon: Calendar,
      badge: "Snapshot",
      badgeVariant: "warning" as const,
    },
    {
      title: "Loan Statement",
      description: "Client-facing loan statement with full repayment history and running balance. Accessible from any loan.",
      href: "/loans",
      icon: FileText,
    },
  ];

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          title="Reports"
          subtext="Financial reports, portfolio analytics, and month-end snapshots."
        />
      </header>

      {/* Admin / Business Reports */}
      <div className="mb-2">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Business Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {adminReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Monthly + Client */}
      <div className="mt-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Period-Based &amp; Client Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {monthlyReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Coming soon notice */}
      {/* <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <span className="text-lg flex-shrink-0">🔮</span>
        <div>
          <p className="text-13 font-semibold text-amber-800">Coming Soon</p>
          <p className="text-12 text-amber-700 mt-0.5">
            Branch-level reports, loan officer performance, scheduled email delivery, and Excel/CSV export are planned for the next release.{" "}
            <Link href="/reports/audit" className="underline">View audit log</Link> in the meantime.
          </p>
        </div>
      </div> */}
    </section>
  );
}
