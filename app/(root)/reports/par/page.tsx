import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getPARReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { formatAmount } from "@/lib/utils";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import KpiCard from "@/components/reports/KpiCard";
import PdfExportButton from "@/components/reports/PdfExportButton";
import CompanyHeader from "@/components/reports/CompanyHeader";
import Link from "next/link";
import { AlertTriangle, ShieldCheck, XCircle, Skull } from "lucide-react";

const RISK_COLORS: Record<string, string> = {
  "Performing":   "bg-green-100 text-green-700",
  "1–30 DPD":     "bg-amber-100 text-amber-700",
  "31–60 DPD":    "bg-orange-100 text-orange-700",
  "61–90 DPD":    "bg-red-100 text-red-600",
  "90+ DPD":      "bg-red-200 text-red-800",
  "Written Off":  "bg-gray-200 text-gray-700",
  "Loss":         "bg-black/10 text-gray-900",
};

export default async function PARReportPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const report = await getPARReportAction();

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox
            title="Portfolio At Risk (PAR)"
            subtext="Industry-standard measure of loan book health. PAR30 should stay below 5% for a healthy MFI."
          />
        </div>
        <PdfExportButton reportType="par" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader
          title="Portfolio At Risk Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      {!report ? (
        <p className="text-gray-500 text-13">Failed to load report.</p>
      ) : (
        <>
          {/* PAR KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <KpiCard
              label="PAR1 (DPD ≥ 1)"
              value={`${report.par1Rate}%`}
              icon={<AlertTriangle className="size-4" />}
              variant={report.par1Rate < 10 ? "warning" : "danger"}
              subtext={formatAmount(report.par1Balance)}
            />
            <KpiCard
              label="PAR30 (DPD ≥ 30)"
              value={`${report.par30Rate}%`}
              icon={<AlertTriangle className="size-4" />}
              variant={report.par30Rate < 5 ? "success" : report.par30Rate < 15 ? "warning" : "danger"}
              subtext={report.par30Rate < 5 ? "✓ Healthy (< 5%)" : "⚠ Above threshold"}
            />
            <KpiCard
              label="Written Off"
              value={formatAmount(report.writtenOffBalance)}
              icon={<XCircle className="size-4" />}
              variant="warning"
              subtext="Provisioned balance"
            />
            <KpiCard
              label="Total Active Portfolio"
              value={formatAmount(report.totalPortfolioBalance)}
              icon={<ShieldCheck className="size-4" />}
              variant="default"
              subtext="Active + Overdue"
            />
          </div>

          {/* PAR ladder visual */}
          <div className="card-premium mb-6">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-6">
              PAR Ladder
            </h3>
            <div className="space-y-4">
              {[
                { label: "PAR1  — DPD ≥ 1 day",   rate: report.par1Rate,  balance: report.par1Balance,  color: "bg-amber-400" },
                { label: "PAR30 — DPD ≥ 30 days",  rate: report.par30Rate, balance: report.par30Balance, color: "bg-orange-500" },
                { label: "PAR60 — DPD ≥ 60 days",  rate: report.par60Rate, balance: report.par60Balance, color: "bg-red-500" },
                { label: "PAR90 — DPD ≥ 90 days",  rate: report.par90Rate, balance: report.par90Balance, color: "bg-red-700" },
              ].map(({ label, rate, balance, color }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-13 text-gray-700 font-medium">{label}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-12 text-gray-500 tabular-nums">{formatAmount(balance)}</span>
                      <span className="text-13 font-bold text-gray-900 tabular-nums w-14 text-right">{rate}%</span>
                    </div>
                  </div>
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(100, rate * 4)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {report.par30Rate < 5 && (
              <p className="mt-4 text-12 text-green-600 font-semibold">
                ✓ PAR30 is within the healthy threshold (&lt; 5%). Portfolio is performing well.
              </p>
            )}
            {report.par30Rate >= 15 && (
              <p className="mt-4 text-12 text-red-600 font-semibold">
                ⚠ PAR30 exceeds 15%. Immediate collection action required.
              </p>
            )}
          </div>

          {/* Detail table */}
          {report.rows.length > 0 && (
            <div className="card-premium">
              <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4">
                At-Risk Loan Ledger ({report.rows.length})
              </h3>
              <div className="data-table-wrap">
                <div className="data-table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr className="data-table-head-row">
                        <th className="data-th text-left">Client</th>
                        <th className="data-th text-left">Phone</th>
                        <th className="data-th text-left">Type</th>
                        <th className="data-th text-left">Lifecycle</th>
                        <th className="data-th text-right">Principal</th>
                        <th className="data-th text-right">Balance</th>
                        <th className="data-th text-right">DPD</th>
                        <th className="data-th text-left">Risk Bucket</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.rows.map((row: any) => (
                        <tr key={row.loanId} className="data-table-row">
                          <td className="data-td font-medium text-gray-900">{row.clientName}</td>
                          <td className="data-td text-12 text-gray-500">{row.clientPhone}</td>
                          <td className="data-td text-gray-500">{row.loanType}</td>
                          <td className="data-td text-12 text-gray-500">{row.lifecycleState}</td>
                          <td className="data-td text-right tabular-nums">{formatAmount(row.principalAmount)}</td>
                          <td className="data-td text-right tabular-nums font-bold text-red-600">{formatAmount(row.balance)}</td>
                          <td className="data-td text-right">
                            <span className={cn(
                              "font-bold tabular-nums",
                              row.daysPastDue >= 90 ? "text-red-700" :
                              row.daysPastDue >= 60 ? "text-red-500" :
                              row.daysPastDue >= 30 ? "text-orange-500" :
                              row.daysPastDue >= 1  ? "text-amber-500" : "text-green-600"
                            )}>
                              {row.daysPastDue}
                            </span>
                          </td>
                          <td className="data-td">
                            <span className={cn(
                              "text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                              RISK_COLORS[row.riskBucket] ?? "bg-gray-100 text-gray-600"
                            )}>
                              {row.riskBucket}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
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
