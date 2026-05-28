import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getIncomeStatementAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { Suspense } from "react";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import Link from "next/link";
import { DollarSign, TrendingUp, TrendingDown, MinusCircle } from "lucide-react";

export default async function IncomeStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const sp = await searchParams;
  const report = await getIncomeStatementAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
  });

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Income Statement" subtext="Interest, penalties, and net revenue across the portfolio." />
        </div>
        <PdfExportButton reportType="income" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader
          title="Income Statement"
          subtext={`Period: ${report?.period} | Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      <div className="card-premium mb-6 print:hidden">
        <Suspense fallback={<div className="h-9 w-64 bg-gray-100 rounded-md animate-pulse" />}>
          <DateRangeFilter label="Filter Period" />
        </Suspense>
      </div>

      {!report ? (
        <p className="text-gray-500 text-13">Failed to load report.</p>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="Interest Collected"
              value={formatAmount(report.interestCollected)}
              icon={<TrendingUp className="size-4" />}
              variant="success"
              subtext="From repayments"
            />
            <KpiCard
              label="Penalty Revenue"
              value={formatAmount(report.penaltyRevenue)}
              icon={<DollarSign className="size-4" />}
              variant="warning"
              subtext="Manual penalties"
            />
            <KpiCard
              label="Waivers Written Off"
              value={formatAmount(report.waiverAmount)}
              icon={<MinusCircle className="size-4" />}
              variant="danger"
              subtext="Forgiven amounts"
            />
            <KpiCard
              label="Net Income"
              value={formatAmount(report.netIncome)}
              icon={<TrendingDown className="size-4" />}
              variant={report.netIncome >= 0 ? "success" : "danger"}
              subtext={report.netIncome >= 0 ? "Profitable period" : "Net loss"}
            />
          </div>

          {/* Revenue breakdown bar */}
          <div className="card-premium mb-6">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Revenue Composition
            </h3>
            <div className="space-y-4">
              {report.totalRevenue > 0 && [
                { label: "Interest Income",  value: report.interestCollected, color: "bg-green-500" },
                { label: "Penalty Income",   value: report.penaltyRevenue,   color: "bg-amber-500" },
              ].map(({ label, value, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-13 text-gray-600">{label}</span>
                    <span className="text-13 font-bold text-gray-900">{formatAmount(value)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full`}
                      style={{ width: `${Math.min(100, (value / report.totalRevenue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly income table */}
          {report.months.length > 0 && (
            <div className="card-premium">
              <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
                Monthly Breakdown ({report.months.length} months)
              </h3>
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr className="data-table-head-row">
                        <th className="data-th text-left">Month</th>
                        <th className="data-th text-right">Interest</th>
                        <th className="data-th text-right">Penalties</th>
                        <th className="data-th text-right">Waivers</th>
                        <th className="data-th text-right">Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.months.map((m: any) => (
                        <tr key={`${m.year}-${m.month}`} className="data-table-row">
                          <td className="data-td font-medium text-gray-900">{m.label}</td>
                          <td className="data-td text-right tabular-nums text-green-600 font-semibold">
                            {formatAmount(m.interest)}
                          </td>
                          <td className="data-td text-right tabular-nums text-amber-600 font-semibold">
                            {formatAmount(m.penalties)}
                          </td>
                          <td className="data-td text-right tabular-nums text-red-500">
                            {m.waivers > 0 ? `(${formatAmount(m.waivers)})` : "—"}
                          </td>
                          <td className={`data-td text-right tabular-nums font-bold ${m.net >= 0 ? "text-green-700" : "text-red-600"}`}>
                            {formatAmount(m.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-200">
                        <td className="data-td font-bold text-gray-700">Total</td>
                        <td className="data-td text-right font-bold tabular-nums text-green-700">{formatAmount(report.interestCollected)}</td>
                        <td className="data-td text-right font-bold tabular-nums text-amber-700">{formatAmount(report.penaltyRevenue)}</td>
                        <td className="data-td text-right font-bold tabular-nums text-red-600">
                          {report.waiverAmount > 0 ? `(${formatAmount(report.waiverAmount)})` : "—"}
                        </td>
                        <td className={`data-td text-right font-bold tabular-nums ${report.netIncome >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {formatAmount(report.netIncome)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
