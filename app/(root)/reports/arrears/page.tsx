import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getArrearsReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import ArrearsChart from "@/components/reports/ArrearsChart";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";

export default async function ArrearsReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const report = await getArrearsReportAction();

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Arrears & Delinquency" subtext="Overdue loans categorized by days past due." />
        </div>
        <PdfExportButton reportType="arrears" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader 
          title="Arrears & Delinquency Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {!report ? (
        <p className="text-gray-500">Failed to load report.</p>
      ) : (
        <>
          {/* Bucket KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "1–30 Days",  data: report.bucket1_30,   variant: "warning" as const },
              { label: "31–60 Days", data: report.bucket31_60,  variant: "warning" as const },
              { label: "61–90 Days", data: report.bucket61_90,  variant: "danger" as const },
              { label: "90+ Days",   data: report.bucket90plus, variant: "danger" as const },
            ].map(({ label, data, variant }) => (
              <KpiCard
                key={label}
                label={label}
                value={formatAmount(data.totalBalance)}
                subtext={`${data.count} loan${data.count !== 1 ? "s" : ""}`}
                icon={<AlertTriangle className="size-4" />}
                variant={variant}
              />
            ))}
          </div>

          {/* Chart */}
          <div className="card-premium mb-6">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Aging Bucket Distribution
            </h3>
            <ArrearsChart summary={report} />
          </div>

          {/* Detail table */}
          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Overdue Loan Ledger ({report.rows.length})
            </h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Client</th>
                      <th className="data-th text-left">Phone</th>
                      <th className="data-th text-left">Type</th>
                      <th className="data-th text-right">Principal</th>
                      <th className="data-th text-right">Balance</th>
                      <th className="data-th text-right">Days Overdue</th>
                      <th className="data-th text-left">Bucket</th>
                      <th className="data-th text-right">Penalties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="data-empty-cell">
                          <div className="data-empty">
                            <p className="text-14 text-gray-500 font-medium">No overdue loans 🎉</p>
                          </div>
                        </td>
                      </tr>
                    ) : report.rows.map((row) => (
                      <tr key={row.loanId} className="data-table-row">
                        <td className="data-td font-medium text-gray-900">{row.clientName}</td>
                        <td className="data-td text-gray-500 text-12">{row.clientPhone}</td>
                        <td className="data-td text-gray-500">{row.loanType}</td>
                        <td className="data-td text-right tabular-nums">{formatAmount(row.principalAmount)}</td>
                        <td className="data-td text-right tabular-nums font-bold text-red-600">{formatAmount(row.balance)}</td>
                        <td className="data-td text-right">
                          <span className={cn(
                            "font-bold tabular-nums",
                            row.daysPastDue > 90 ? "text-red-700" :
                            row.daysPastDue > 60 ? "text-red-500" :
                            row.daysPastDue > 30 ? "text-orange-500" : "text-amber-500"
                          )}>
                            {row.daysPastDue}
                          </span>
                        </td>
                        <td className="data-td">
                          <span className={cn(
                            "text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            row.bucket === "90+" ? "bg-red-100 text-red-700" :
                            row.bucket === "61-90" ? "bg-red-50 text-red-600" :
                            row.bucket === "31-60" ? "bg-orange-50 text-orange-600" :
                            "bg-amber-50 text-amber-600"
                          )}>
                            {row.bucket} days
                          </span>
                        </td>
                        <td className="data-td text-right tabular-nums text-amber-600">{formatAmount(row.penaltyAccrued)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {report.rows.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td colSpan={4} className="data-td font-bold text-gray-700">Total Overdue</td>
                        <td className="data-td text-right font-bold text-red-600 tabular-nums">
                          {formatAmount(report.totalOverdue)}
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
