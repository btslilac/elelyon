import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getPortfolioSummaryAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import {
  BarChart2, Activity, AlertCircle, CheckCircle2,
  TrendingUp, ShieldAlert, Users, RefreshCw, XCircle, Skull,
} from "lucide-react";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import PortfolioChart from "@/components/reports/PortfolioChart";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";

export default async function PortfolioReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const summary = await getPortfolioSummaryAction();
  if (!summary) return <div className="home-content"><p className="text-gray-500">Failed to load report.</p></div>;

  const kpis = [
    {
      label: "Total Loans",     value: summary.totalLoans,    icon: <BarChart2 className="size-4" />,
      subtext: `${summary.pendingLoans} pending approval`,    variant: "default" as const,
    },
    {
      label: "Active",          value: summary.activeLoans,   icon: <Activity className="size-4" />,
      subtext: "Earning interest",                            variant: "success" as const,
    },
    {
      label: "Overdue",         value: summary.overdueLoans,  icon: <AlertCircle className="size-4" />,
      subtext: "Past due date",                               variant: "danger" as const,
    },
    {
      label: "Fully Paid",      value: summary.fullyPaidLoans, icon: <CheckCircle2 className="size-4" />,
      subtext: "Cleared",                                     variant: "success" as const,
    },
    {
      label: "Written Off",     value: summary.writtenOffLoans, icon: <XCircle className="size-4" />,
      subtext: "Write-offs",                                  variant: "warning" as const,
    },
    {
      label: "Loss / Default",  value: summary.lossLoans,     icon: <Skull className="size-4" />,
      subtext: "Non-recoverable",                             variant: "danger" as const,
    },
    {
      label: "High Risk",       value: summary.highRiskLoans, icon: <ShieldAlert className="size-4" />,
      subtext: "Flagged clients",                             variant: "warning" as const,
    },
    {
      label: "Rollovers",       value: summary.rolloverLoans, icon: <RefreshCw className="size-4" />,
      subtext: "Extended loans",                              variant: "warning" as const,
    },
    {
      label: "Restructured",    value: summary.restructuredLoans, icon: <Users className="size-4" />,
      subtext: "Modified terms",                              variant: "default" as const,
    },
  ];

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Loan Portfolio Report" subtext="Live snapshot of the entire loan book." />
        </div>
        <PdfExportButton reportType="portfolio" data={summary} />
      </header>

      {/* Print header */}
      <div className="hidden print:block">
        <CompanyHeader
          title="Loan Portfolio Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-9 gap-4 mb-8">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Financial summary + chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Chart */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
            Loan Status Distribution
          </h3>
          <PortfolioChart data={summary} />
        </div>

        {/* Financial figures */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
            Financial Summary
          </h3>
          <div className="space-y-4">
            {[
              { label: "Total Disbursed",          value: formatAmount(summary.totalDisbursed) },
              { label: "Total Outstanding",         value: formatAmount(summary.totalOutstanding), highlight: true },
              { label: "Total Interest (book)",     value: formatAmount(summary.totalInterestEarned) },
              { label: "Penalties Outstanding",     value: formatAmount(summary.totalPenaltiesOutstanding) },
              { label: "Collection Rate",           value: `${summary.collectionRate}%` },
            ].map(({ label, value, highlight }) => (
              <div key={label} className="flex justify-between items-center py-2.5 border-b border-gray-50 last:border-0">
                <span className="text-13 text-gray-600">{label}</span>
                <span className={`text-14 font-bold ${highlight ? "text-red-600" : "text-gray-900"} tabular-nums`}>
                  {value}
                </span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-2">
              <span className="text-13 font-bold text-gray-700 uppercase tracking-wider">Collection Rate</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, summary.collectionRate)}%` }}
                  />
                </div>
                <span className="text-13 font-bold text-green-600">{summary.collectionRate}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column bottom row: Status breakdown + PAR indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status breakdown */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
            Status Breakdown
          </h3>
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr className="data-table-head-row">
                  <th className="data-th text-left">Status</th>
                  <th className="data-th text-right">Count</th>
                  <th className="data-th text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { status: "Active",      count: summary.activeLoans,     color: "badge-success" },
                  { status: "Overdue",     count: summary.overdueLoans,    color: "badge-error" },
                  { status: "Fully Paid",  count: summary.fullyPaidLoans,  color: "badge-completed" },
                  { status: "Written Off", count: summary.writtenOffLoans, color: "badge-error" },
                  { status: "Loss",        count: summary.lossLoans,       color: "badge-error" },
                  { status: "Pending",     count: summary.pendingLoans,    color: "badge-pending" },
                  { status: "Denied",      count: summary.deniedLoans,     color: "badge-error" },
                ].map(({ status, count, color }) => (
                  <tr key={status} className="data-table-row">
                    <td className="data-td">
                      <span className={`badge ${color}`}>{status}</span>
                    </td>
                    <td className="data-td text-right font-semibold tabular-nums">{count}</td>
                    <td className="data-td text-right text-gray-500 tabular-nums">
                      {summary.totalLoans > 0
                        ? `${((count / summary.totalLoans) * 100).toFixed(1)}%`
                        : "0%"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lifecycle + PAR indicators */}
        <div className="card-premium">
          <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
            Lifecycle &amp; Portfolio At Risk
          </h3>
          <p className="text-12 text-gray-400 mb-4 uppercase font-semibold tracking-wider">Lifecycle State</p>
          <div className="space-y-2 mb-6">
            {[
              { label: "Standard",     count: summary.standardLoans },
              { label: "Rollover",     count: summary.rolloverLoans },
              { label: "Restructured", count: summary.restructuredLoans },
            ].map(({ label, count }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50">
                <span className="text-13 text-gray-600">{label}</span>
                <span className="text-13 font-bold text-gray-900 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
          <p className="text-12 text-gray-400 mb-4 uppercase font-semibold tracking-wider">PAR (Portfolio at Risk)</p>
          <div className="space-y-3">
            {[
              { label: "PAR30 (DPD ≥ 30)", rate: summary.par30, color: "bg-amber-500" },
              { label: "PAR60 (DPD ≥ 60)", rate: summary.par60, color: "bg-orange-500" },
              { label: "PAR90 (DPD ≥ 90)", rate: summary.par90, color: "bg-red-600" },
            ].map(({ label, rate, color }) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span className="text-12 text-gray-600">{label}</span>
                  <span className="text-12 font-bold text-gray-900">{rate}%</span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${Math.min(100, rate)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
