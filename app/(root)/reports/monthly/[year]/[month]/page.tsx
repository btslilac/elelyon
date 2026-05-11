import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getMonthlyReportAction } from "@/lib/actions/report.actions";
import { redirect, notFound } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import PdfExportButton from "@/components/reports/PdfExportButton";
import KpiCard from "@/components/reports/KpiCard";
import {
  Activity, AlertCircle, TrendingUp, DollarSign, ArrowUpCircle, BarChart2
} from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";

export default async function MonthlyReportDetailPage({
  params,
}: {
  params: Promise<{ year: string; month: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const { year: yearStr, month: monthStr } = await params;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) notFound();

  const report = await getMonthlyReportAction(year, month);
  if (!report) notFound();

  return (
    <section className="home-content animate-fade-in print:p-6">
      {/* Screen header */}
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports/monthly" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Monthly Reports
          </Link>
          <HeaderBox
            title={report.periodLabel}
            subtext={`Snapshot generated ${new Date(report.generatedAt).toLocaleString("en-KE")} by ${report.generatedBy || "System"}`}
          />
        </div>
        <div className="flex gap-2">
          <PdfExportButton reportType="monthly" data={report} label="Download PDF" />
        </div>
      </header>

      {/* Print header */}
      <div className="hidden print:block">
        <CompanyHeader 
          title={`Monthly Portfolio Report — ${report.periodLabel}`}
          subtext={`Generated: ${new Date(report.generatedAt).toLocaleString("en-KE")}`}
          rightContent={
            <p className="text-12 text-gray-500">By: {report.generatedBy || "System"}</p>
          }
        />
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KpiCard label="Active Loans"    value={report.totalActiveLoans}   icon={<Activity className="size-4" />}    variant="success" />
        <KpiCard label="New Loans"       value={report.totalNewLoans}       icon={<TrendingUp className="size-4" />}  variant="default" />
        <KpiCard label="Closed"          value={report.totalClosedLoans}    icon={<BarChart2 className="size-4" />}   variant="success" />
        <KpiCard label="Overdue"         value={report.totalOverdueLoans}   icon={<AlertCircle className="size-4" />} variant="danger" />
        <KpiCard label="Defaulted"       value={report.totalDefaultedLoans} icon={<AlertCircle className="size-4" />} variant="danger" />
        <KpiCard
          label="Collection Rate"
          value={`${report.collectionRate}%`}
          icon={<DollarSign className="size-4" />}
          variant={report.collectionRate >= 80 ? "success" : report.collectionRate >= 50 ? "warning" : "danger"}
        />
      </div>

      {/* Period Accounting Summary */}
      <div className="card-premium mb-6">
        <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Period Accounting Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          {/* Left: Flow */}
          <div className="pr-0 md:pr-6 space-y-3 pb-4 md:pb-0">
            <h4 className="text-12 font-bold text-gray-400 uppercase tracking-wider">Cash Movement</h4>
            {[
              { label: "Opening Portfolio Balance",  value: report.openingPortfolioBalance, color: "text-gray-700" },
              { label: "+ New Loans Disbursed",       value: report.newLoansDisbursed,       color: "text-indigo-600" },
              { label: "+ Penalties Charged",         value: report.totalPenaltiesCharged,   color: "text-orange-600" },
              { label: "− Repayments Collected",      value: report.totalRepaymentsCollected,color: "text-green-600" },
              { label: "= Closing Portfolio Balance", value: report.closingPortfolioBalance,  color: "text-gray-900", bold: true },
            ].map(({ label, value, color, bold }) => (
              <div key={label} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0 last:pt-2">
                <span className={cn("text-13", bold ? "font-bold text-gray-700" : "text-gray-600")}>{label}</span>
                <span className={cn("text-13 tabular-nums", color, bold ? "font-bold text-base" : "font-semibold")}>
                  {formatAmount(value)}
                </span>
              </div>
            ))}
          </div>
          {/* Right: Collection */}
          <div className="pl-0 md:pl-6 space-y-3 pt-4 md:pt-0">
            <h4 className="text-12 font-bold text-gray-400 uppercase tracking-wider">Collection Performance</h4>
            <div className="flex justify-between py-1.5"><span className="text-13 text-gray-600">Expected Collections</span><span className="text-13 font-semibold tabular-nums">{formatAmount(report.expectedCollections)}</span></div>
            <div className="flex justify-between py-1.5 border-b border-gray-50"><span className="text-13 text-gray-600">Actual Collections</span><span className="text-13 font-semibold tabular-nums text-green-600">{formatAmount(report.actualCollections)}</span></div>
            <div className="pt-2">
              <div className="flex justify-between mb-1.5">
                <span className="text-13 font-bold text-gray-700">Collection Rate</span>
                <span className={cn("text-13 font-bold", report.collectionRate >= 80 ? "text-green-600" : report.collectionRate >= 50 ? "text-amber-600" : "text-red-600")}>
                  {report.collectionRate}%
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full", report.collectionRate >= 80 ? "bg-green-500" : report.collectionRate >= 50 ? "bg-amber-500" : "bg-red-500")}
                  style={{ width: `${Math.min(100, report.collectionRate)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loan Ledger */}
      <div className="card-premium">
        <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
          Monthly Loan Ledger ({report.entries?.length ?? 0} loans)
        </h3>
        <div className="data-table-wrap">
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr className="data-table-head-row">
                  <th className="data-th text-left">Client</th>
                  <th className="data-th text-left">Type</th>
                  <th className="data-th text-left">Disbursed</th>
                  <th className="data-th text-right">Opening Bal.</th>
                  <th className="data-th text-right">New Loan</th>
                  <th className="data-th text-right">Paid</th>
                  <th className="data-th text-right">Penalties</th>
                  <th className="data-th text-right">Closing Bal.</th>
                  <th className="data-th text-left">Status</th>
                  <th className="data-th text-right">DPD</th>
                </tr>
              </thead>
              <tbody>
                {(!report.entries || report.entries.length === 0) ? (
                  <tr>
                    <td colSpan={10} className="data-empty-cell">
                      <div className="data-empty"><p className="text-gray-500">No loans in this period</p></div>
                    </td>
                  </tr>
                ) : report.entries.map((entry: any) => (
                  <tr key={entry.id} className="data-table-row">
                    <td className="data-td font-medium text-gray-900">{entry.clientName}</td>
                    <td className="data-td text-gray-500 text-12">{entry.loanType}</td>
                    <td className="data-td text-12 text-gray-400">
                      {entry.disbursementDate ? new Date(entry.disbursementDate).toLocaleDateString("en-KE") : "—"}
                    </td>
                    <td className="data-td text-right tabular-nums text-gray-600">{formatAmount(entry.openingBalance)}</td>
                    <td className="data-td text-right tabular-nums text-indigo-600 font-semibold">
                      {entry.newLoanAmount > 0 ? formatAmount(entry.newLoanAmount) : "—"}
                    </td>
                    <td className="data-td text-right tabular-nums text-green-600 font-semibold">
                      {entry.amountPaidThisMonth > 0 ? formatAmount(entry.amountPaidThisMonth) : "—"}
                    </td>
                    <td className="data-td text-right tabular-nums text-orange-500">
                      {entry.penaltiesThisMonth > 0 ? formatAmount(entry.penaltiesThisMonth) : "—"}
                    </td>
                    <td className="data-td text-right tabular-nums font-bold text-gray-900">{formatAmount(entry.closingBalance)}</td>
                    <td className="data-td">
                      <span className={cn("badge", {
                        "badge-success": entry.loanStatus === "Active",
                        "badge-error": entry.loanStatus === "Overdue" || entry.loanStatus === "Defaulted",
                        "badge-completed": entry.loanStatus === "Completed",
                        "badge-pending": entry.loanStatus === "Pending",
                      })}>
                        {entry.loanStatus}
                      </span>
                    </td>
                    <td className="data-td text-right">
                      {entry.daysPastDue > 0 ? (
                        <span className={cn("text-12 font-bold tabular-nums",
                          entry.daysPastDue > 90 ? "text-red-700" :
                          entry.daysPastDue > 60 ? "text-red-500" :
                          entry.daysPastDue > 30 ? "text-orange-500" : "text-amber-500"
                        )}>
                          {entry.daysPastDue}
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {report.entries && report.entries.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={3} className="data-td font-bold text-gray-700 text-12 uppercase tracking-wider">Period Totals</td>
                    <td className="data-td text-right font-bold tabular-nums">{formatAmount(report.openingPortfolioBalance)}</td>
                    <td className="data-td text-right font-bold tabular-nums text-indigo-600">{formatAmount(report.newLoansDisbursed)}</td>
                    <td className="data-td text-right font-bold tabular-nums text-green-600">{formatAmount(report.totalRepaymentsCollected)}</td>
                    <td className="data-td text-right font-bold tabular-nums text-orange-500">{formatAmount(report.totalPenaltiesCharged)}</td>
                    <td className="data-td text-right font-bold tabular-nums text-lg">{formatAmount(report.closingPortfolioBalance)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      {/* Print footer */}
      <div className="hidden print:block mt-8 pt-4 border-t text-xs text-gray-400">
        <p>This is a certified immutable financial snapshot. El Elyon Capital &amp; Credit Solutions. {report.periodLabel}.</p>
      </div>
    </section>
  );
}
