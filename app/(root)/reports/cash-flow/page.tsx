import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getCashFlowReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import CashFlowChart from "@/components/reports/CashFlowChart";
import { ArrowUpCircle, ArrowDownCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";

export default async function CashFlowReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const report = await getCashFlowReportAction(12);

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Cash Flow Report" subtext="12-month disbursement vs collection trend." />
        </div>
        <PdfExportButton reportType="cashflow" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader 
          title="Cash Flow Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {!report ? (
        <p className="text-gray-500">Failed to load report.</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <KpiCard
              label="Total Disbursed (12mo)"
              value={formatAmount(report.totalDisbursed)}
              icon={<ArrowUpCircle className="size-4" />}
              variant="danger"
              subtext="Funds deployed"
            />
            <KpiCard
              label="Total Collected (12mo)"
              value={formatAmount(report.totalCollected)}
              icon={<ArrowDownCircle className="size-4" />}
              variant="success"
              subtext="Cash received"
            />
            <KpiCard
              label="Net Cash Flow"
              value={formatAmount(Math.abs(report.netCashFlow))}
              icon={<TrendingUp className="size-4" />}
              variant={report.netCashFlow >= 0 ? "success" : "danger"}
              subtext={report.netCashFlow >= 0 ? "Net positive" : "Net negative"}
              trend={report.netCashFlow >= 0 ? "up" : "down"}
            />
          </div>

          {/* Chart */}
          <div className="card-premium mb-6">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Monthly Disbursed vs Collected
            </h3>
            <CashFlowChart months={report.months} />
          </div>

          {/* Monthly breakdown table */}
          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
              Monthly Breakdown
            </h3>
            <div className="data-table-wrap">
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Month</th>
                      <th className="data-th text-right">Disbursed</th>
                      <th className="data-th text-right">Collected</th>
                      <th className="data-th text-right">Net Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.months.map((m: any) => (
                      <tr key={`${m.year}-${m.month}`} className="data-table-row">
                        <td className="data-td font-medium text-gray-900">{m.label}</td>
                        <td className="data-td text-right tabular-nums text-indigo-600 font-semibold">
                          {formatAmount(m.disbursed)}
                        </td>
                        <td className="data-td text-right tabular-nums text-green-600 font-semibold">
                          {formatAmount(m.collected)}
                        </td>
                        <td className={`data-td text-right tabular-nums font-bold ${m.netFlow >= 0 ? "text-green-700" : "text-red-600"}`}>
                          {m.netFlow >= 0 ? "+" : ""}{formatAmount(m.netFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200">
                      <td className="data-td font-bold text-gray-700">Total</td>
                      <td className="data-td text-right font-bold tabular-nums text-indigo-700">{formatAmount(report.totalDisbursed)}</td>
                      <td className="data-td text-right font-bold tabular-nums text-green-700">{formatAmount(report.totalCollected)}</td>
                      <td className={`data-td text-right font-bold tabular-nums ${report.netCashFlow >= 0 ? "text-green-700" : "text-red-600"}`}>
                        {report.netCashFlow >= 0 ? "+" : ""}{formatAmount(report.netCashFlow)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
