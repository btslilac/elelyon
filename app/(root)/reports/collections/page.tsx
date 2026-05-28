import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getCollectionReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import { TrendingUp, TrendingDown, Percent } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";
import { Suspense } from "react";

export default async function CollectionsReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const sp = await searchParams;
  const report = await getCollectionReportAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
  });

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Collections Report" subtext="Expected vs actual repayments collected." />
        </div>
        <PdfExportButton reportType="collections" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader 
          title="Collections Report"
          subtext={`Period: ${report?.period} | Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {/* Filter bar */}
      <div className="card-premium mb-6 print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Period" />
        </Suspense>
      </div>

      {!report ? (
        <p className="text-gray-500 text-13">Failed to load report.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard
              label="Expected Collections"
              value={formatAmount(report.totalExpected)}
              icon={<TrendingUp className="size-4" />}
              variant="default"
            />
            <KpiCard
              label="Actual Collections"
              value={formatAmount(report.totalCollected)}
              icon={<TrendingDown className="size-4" />}
              variant="success"
            />
            <KpiCard
              label="Collection Rate"
              value={`${report.collectionRate}%`}
              icon={<Percent className="size-4" />}
              variant={report.collectionRate >= 80 ? "success" : report.collectionRate >= 50 ? "warning" : "danger"}
              subtext={report.collectionRate >= 80 ? "On target" : "Needs attention"}
            />
          </div>

          {/* Collection efficiency bar */}
          <div className="card-premium mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-13 font-semibold text-gray-700">Collection Efficiency</span>
              <span className="text-13 font-bold text-green-600">{report.collectionRate}%</span>
            </div>
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  report.collectionRate >= 80 ? "bg-green-500" :
                  report.collectionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${Math.min(100, report.collectionRate)}%` }}
              />
            </div>
            <p className="text-12 text-gray-400 mt-2">
              KES {report.totalCollected.toLocaleString()} collected of KES {report.totalExpected.toLocaleString()} expected
            </p>
          </div>

          {/* Detail table */}
          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Loan Collection Detail ({report.rows.length})
            </h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Client</th>
                      <th className="data-th text-left">Loan Type</th>
                      <th className="data-th text-right">Principal</th>
                      <th className="data-th text-right">Installment</th>
                      <th className="data-th text-right">Collected</th>
                      <th className="data-th text-right">Balance</th>
                      <th className="data-th text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="data-empty-cell">
                          <div className="data-empty"><p className="text-14 text-gray-500">No loans found</p></div>
                        </td>
                      </tr>
                    ) : report.rows.map((row: any) => (
                      <tr key={row.loanId} className="data-table-row">
                        <td className="data-td font-medium text-gray-900">{row.clientName}</td>
                        <td className="data-td text-gray-500">{row.loanType}</td>
                        <td className="data-td text-right tabular-nums">{formatAmount(row.principalAmount)}</td>
                        <td className="data-td text-right tabular-nums text-gray-500">{formatAmount(row.installmentAmount)}</td>
                        <td className="data-td text-right tabular-nums text-green-600 font-semibold">{formatAmount(row.totalRepaid)}</td>
                        <td className="data-td text-right tabular-nums font-semibold text-red-600">{formatAmount(row.balance)}</td>
                        <td className="data-td">
                          <span className={cn("badge", {
                              "badge-success":   row.status === "Active",
                              "badge-error":     row.status === "Overdue" || row.status === "Written Off" || row.status === "Loss",
                              "badge-completed": row.status === "Fully Paid",
                              "badge-pending":   row.status === "Pending",
                            })}>
                              {row.status}
                            </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
