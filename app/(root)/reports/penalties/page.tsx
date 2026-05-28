import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getPenaltySummaryAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";
import { Suspense } from "react";

export default async function PenaltiesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const sp = await searchParams;
  const report = await getPenaltySummaryAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
  });

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Penalty Report" subtext="Charged, reversed, and outstanding penalties." />
        </div>
        <PdfExportButton reportType="penalties" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader 
          title="Penalty Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      <div className="card-premium mb-6 print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Period" />
        </Suspense>
      </div>

      {!report ? (
        <p className="text-gray-500">Failed to load report.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard
              label="Total Charged"
              value={formatAmount(report.totalCharged)}
              subtext={`${report.chargedCount} active penalties`}
              icon={<ShieldAlert className="size-4" />}
              variant="danger"
            />
            <KpiCard
              label="Total Reversed"
              value={formatAmount(report.totalReversed)}
              subtext={`${report.reversedCount} reversed`}
              icon={<ShieldCheck className="size-4" />}
              variant="success"
            />
            <KpiCard
              label="Outstanding"
              value={formatAmount(report.totalOutstanding)}
              icon={<ShieldX className="size-4" />}
              variant="warning"
              subtext="Unpaid penalties"
            />
          </div>

          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Penalty Ledger ({report.rows.length})
            </h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Date</th>
                      <th className="data-th text-left">Client</th>
                      <th className="data-th text-left">Type</th>
                      <th className="data-th text-right">Amount</th>
                      <th className="data-th text-left">Status</th>
                      <th className="data-th text-left">Applied By</th>
                      <th className="data-th text-left">Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="data-empty-cell">
                          <div className="data-empty"><p className="text-14 text-gray-500">No penalties in this period</p></div>
                        </td>
                      </tr>
                    ) : report.rows.map((row: any) => (
                      <tr key={row.penaltyId} className="data-table-row">
                        <td className="data-td text-12 text-gray-500">
                          {new Date(row.dateApplied).toLocaleDateString("en-KE")}
                        </td>
                        <td className="data-td font-medium text-gray-900">{row.clientName}</td>
                        <td className="data-td text-gray-600 text-12">{row.penaltyType}</td>
                        <td className="data-td text-right tabular-nums font-semibold text-red-600">
                          {formatAmount(row.amount)}
                        </td>
                        <td className="data-td">
                          <span className={cn("badge", {
                            "badge-error": row.status === "Active",
                            "badge-completed": row.status === "Reversed",
                          })}>
                            {row.status}
                          </span>
                        </td>
                        <td className="data-td text-12 text-gray-500">{row.appliedBy}</td>
                        <td className="data-td text-12 text-gray-400">{row.comment || "—"}</td>
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
