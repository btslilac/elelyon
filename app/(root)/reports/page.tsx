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
  Activity,
  Users,
  PieChart,
} from "lucide-react";
import ReportCard from "@/components/reports/ReportCard";
import HeaderBox from "@/components/HeaderBox";

export default async function ReportsPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) {
    redirect("/");
  }

  const liveReports = [
    {
      title: "Loan Portfolio",
      description: "Total disbursed, outstanding balances, loan status breakdown, lifecycle states (Standard / Rollover / Restructured), and PAR indicators.",
      href: "/reports/portfolio",
      icon: BarChart2,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Collections Report",
      description: "Expected vs actual repayment collections filtered by date range. Track collection efficiency across all active loans.",
      href: "/reports/collections",
      icon: TrendingUp,
      badge: "Live",
      badgeVariant: "success" as const,
    },
    {
      title: "Arrears & Delinquency",
      description: "Overdue loans categorized by aging buckets: 1–30, 31–60, 61–90, and 90+ days past due. With client contact details.",
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
      title: "Penalty & Waiver Log",
      description: "All manual penalties and waivers charged or reversed, filterable by date. Tracks total outstanding penalty exposure.",
      href: "/reports/penalties",
      icon: ShieldAlert,
    },
    {
      title: "Audit Log",
      description: "Full activity trail — repayments, approvals, reversals, penalties. Paginated and filterable by date.",
      href: "/reports/audit",
      icon: ClipboardList,
    },
  ];

  const analyticsReports = [
    {
      title: "Income Statement",
      description: "Interest collected, penalty revenue, and waivers. Shows net income per month — the MFI's profitability view.",
      href: "/reports/income",
      icon: Activity,
      badge: "New",
      badgeVariant: "success" as const,
    },
    {
      title: "Portfolio At Risk (PAR)",
      description: "Industry-standard MFI health metric. PAR30/60/90 rates, risk ladder, and full at-risk loan ledger. PAR30 should stay below 5%.",
      href: "/reports/par",
      icon: PieChart,
      badge: "New",
      badgeVariant: "success" as const,
    },
    {
      title: "Loan Officer Performance",
      description: "Origination counts, disbursements, collection rates, and overdue exposure — ranked by officer. Identify top performers and gaps.",
      href: "/reports/officer",
      icon: Users,
      badge: "New",
      badgeVariant: "success" as const,
    },
  ];

  const periodReports = [
    {
      title: "Monthly Portfolio Snapshot",
      description: "Immutable period-end snapshots. Opening/closing balances, new loans, collections — frozen at month-end and never modified.",
      href: "/reports/monthly",
      icon: Calendar,
      badge: "Snapshot",
      badgeVariant: "warning" as const,
    },
    {
      title: "Loan Statement",
      description: "Client-facing loan statement with full repayment history and running balance. Accessible directly from any loan.",
      href: "/loans",
      icon: FileText,
    },
  ];

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <HeaderBox
          title="Reports"
          subtext="Financial reports, portfolio analytics, and period snapshots."
        />
      </header>

      {/* Live Business Reports */}
      <div className="mb-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Live Business Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {liveReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Analytics & Risk */}
      <div className="mb-8">
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Analytics &amp; Risk
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {analyticsReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>

      {/* Period-Based & Client */}
      <div>
        <h2 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Period-Based &amp; Client Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {periodReports.map((report) => (
            <ReportCard key={report.href} {...report} />
          ))}
        </div>
      </div>
    </section>
  );
}
