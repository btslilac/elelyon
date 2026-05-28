import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getLoanOfficerReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import Link from "next/link";
import { Users, BarChart2, TrendingUp } from "lucide-react";

export default async function LoanOfficerReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const report = await getLoanOfficerReportAction();

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Loan Officer Performance" subtext="Origination, collection efficiency, and portfolio quality by staff member." />
        </div>
        <PdfExportButton reportType="officer" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader
          title="Loan Officer Performance Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {!report ? (
        <p className="text-gray-500 text-13">Failed to load report.</p>
      ) : (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard
              label="Total Officers"
              value={report.officers.length}
              icon={<Users className="size-4" />}
              variant="default"
              subtext="With loan originations"
            />
            <KpiCard
              label="Total Loans"
              value={report.totalLoans}
              icon={<BarChart2 className="size-4" />}
              variant="default"
              subtext="All statuses"
            />
            <KpiCard
              label="Total Disbursed"
              value={formatAmount(report.totalDisbursed)}
              icon={<TrendingUp className="size-4" />}
              variant="success"
              subtext="By all officers"
            />
          </div>

          {/* Officer table */}
          {report.officers.length === 0 ? (
            <div className="card-premium">
              <p className="text-gray-500 text-14 text-center py-8">No loan origination data found.</p>
            </div>
          ) : (
            <>
              {/* Performance cards (top officers) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {report.officers.slice(0, 3).map((o: any, i: number) => (
                  <div key={o.officerName} className="card-premium">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-10 font-bold uppercase tracking-widest text-gray-400">
                          #{i + 1} Officer
                        </span>
                        <h4 className="text-15 font-bold text-gray-900 mt-0.5 truncate">{o.officerName}</h4>
                      </div>
                      <span className={cn(
                        "text-12 font-bold px-2 py-0.5 rounded-full",
                        o.collectionRate >= 80 ? "bg-green-100 text-green-700" :
                        o.collectionRate >= 50 ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {o.collectionRate}%
                      </span>
                    </div>
                    <div className="space-y-1.5 text-13">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Originated</span>
                        <span className="font-semibold">{o.totalOriginated}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Disbursed</span>
                        <span className="font-semibold text-indigo-600">{formatAmount(o.totalDisbursed)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Collected</span>
                        <span className="font-semibold text-green-600">{formatAmount(o.totalCollected)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Active / Overdue</span>
                        <span className="font-semibold">{o.activeCount} / <span className="text-red-500">{o.overdueCount}</span></span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            o.collectionRate >= 80 ? "bg-green-500" :
                            o.collectionRate >= 50 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${Math.min(100, o.collectionRate)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Full leaderboard table */}
              <div className="card-premium">
                <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
                  Full Leaderboard ({report.officers.length})
                </h3>
                <div className="data-table-wrap">
                  <div className="data-table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr className="data-table-head-row">
                          <th className="data-th text-left">Rank</th>
                          <th className="data-th text-left">Officer</th>
                          <th className="data-th text-right">Originated</th>
                          <th className="data-th text-right">Disbursed</th>
                          <th className="data-th text-right">Collected</th>
                          <th className="data-th text-right">Active</th>
                          <th className="data-th text-right">Overdue</th>
                          <th className="data-th text-right">Fully Paid</th>
                          <th className="data-th text-right">Written Off</th>
                          <th className="data-th text-right">Collection Rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.officers.map((o: any, i: number) => (
                          <tr key={o.officerName} className="data-table-row">
                            <td className="data-td text-gray-400 font-bold">#{i + 1}</td>
                            <td className="data-td font-medium text-gray-900">{o.officerName}</td>
                            <td className="data-td text-right tabular-nums">{o.totalOriginated}</td>
                            <td className="data-td text-right tabular-nums text-indigo-600 font-semibold">{formatAmount(o.totalDisbursed)}</td>
                            <td className="data-td text-right tabular-nums text-green-600 font-semibold">{formatAmount(o.totalCollected)}</td>
                            <td className="data-td text-right tabular-nums">{o.activeCount}</td>
                            <td className="data-td text-right tabular-nums text-red-500 font-semibold">{o.overdueCount}</td>
                            <td className="data-td text-right tabular-nums text-green-600">{o.fullyPaidCount}</td>
                            <td className="data-td text-right tabular-nums text-gray-400">{o.writtenOffCount + o.lossCount}</td>
                            <td className="data-td text-right">
                              <span className={cn(
                                "font-bold tabular-nums",
                                o.collectionRate >= 80 ? "text-green-600" :
                                o.collectionRate >= 50 ? "text-amber-600" : "text-red-600"
                              )}>
                                {o.collectionRate}%
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
        </>
      )}
    </section>
  );
}
