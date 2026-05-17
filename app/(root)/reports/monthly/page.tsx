import { getLoggedInUser } from "@/lib/actions/user.actions";
import { listMonthlyReportsAction, generateMonthlySnapshotAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import HeaderBox from "@/components/HeaderBox";
import Link from "next/link";
import { Calendar, Plus, FileBarChart } from "lucide-react";

export default async function MonthlyReportsHubPage() {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const reports = await listMonthlyReportsAction();

  // Month-end generation action
  const handleGenerateSnapshot = async (formData: FormData) => {
    "use server";
    const year = parseInt(formData.get("year") as string, 10);
    const month = parseInt(formData.get("month") as string, 10);
    const overwrite = formData.get("overwrite") === "true";
    await generateMonthlySnapshotAction({ year, month, generatedBy: "", overwrite });
    revalidatePath("/reports/monthly");
    redirect("/reports/monthly");
  };

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  return (
    <section className="home-content animate-fade-in">
      <header className="page-header">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox
            title="Monthly Portfolio Reports"
            subtext="Immutable period-based snapshots. Once generated, historical data never changes."
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generate new snapshot */}
        <div className="lg:col-span-1">
          <div className="card-premium">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary/5 rounded-xl text-primary">
                <Plus className="size-4" />
              </div>
              <h3 className="text-14 font-bold text-gray-900">Generate Snapshot</h3>
            </div>
            <p className="text-12 text-gray-500 mb-4 leading-relaxed">
              Generate an immutable month-end portfolio snapshot. Captures opening/closing balances, 
              repayments, and penalties for all active loans during the selected period.
            </p>
            <form action={handleGenerateSnapshot} className="space-y-3">
              <div>
                <label className="form-label">Year</label>
                <input
                  type="number"
                  name="year"
                  defaultValue={currentYear}
                  min={2020}
                  max={currentYear}
                  className="input-class w-full"
                  required
                />
              </div>
              <div>
                <label className="form-label">Month</label>
                <select name="month" defaultValue={currentMonth} className="input-class w-full" required>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2024, m - 1, 1).toLocaleDateString("en-KE", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" name="overwrite" value="true" id="overwrite" className="rounded" />
                <label htmlFor="overwrite" className="text-12 text-gray-600">
                  Overwrite if exists
                </label>
              </div>
              <button type="submit" className="btn-primary w-full justify-center">
                <Calendar className="size-4" />
                Generate Snapshot
              </button>
            </form>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-11 text-amber-700 leading-relaxed">
                ⚠️ <strong>Accounting rule:</strong> A loan appears in a period if it was active during that month
                (disbursed before period end AND not yet closed at period start). This ensures historical accuracy.
              </p>
            </div>
          </div>
        </div>

        {/* Generated snapshots list */}
        <div className="lg:col-span-2">
          <div className="card-premium">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <FileBarChart className="size-4" />
              Snapshot History
            </h3>

            {(!reports || reports.length === 0) ? (
              <div className="data-empty py-12">
                <Calendar className="size-10 text-gray-200" />
                <p className="text-14 text-gray-500 font-medium mt-3">No snapshots yet</p>
                <p className="text-12 text-gray-400">Generate your first monthly report using the form.</p>
              </div>
            ) : (
              <div className="data-table-wrap">
                <table className="data-table">
                  <thead>
                    <tr className="data-table-head-row">
                      <th className="data-th text-left">Period</th>
                      <th className="data-th text-right">Active</th>
                      <th className="data-th text-right">New Loans</th>
                      <th className="data-th text-right">Closing Balance</th>
                      <th className="data-th text-right">Collection Rate</th>
                      <th className="data-th text-right">Generated</th>
                      <th className="data-th text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r: any) => (
                      <tr key={r.id} className="data-table-row group">
                        <td className="data-td font-semibold text-gray-900">{r.periodLabel}</td>
                        <td className="data-td text-right tabular-nums">{r.totalActiveLoans}</td>
                        <td className="data-td text-right tabular-nums text-green-600">{r.totalNewLoans}</td>
                        <td className="data-td text-right tabular-nums font-semibold">
                          KES {r.closingPortfolioBalance.toLocaleString()}
                        </td>
                        <td className="data-td text-right">
                          <span className={`text-12 font-bold ${
                            r.collectionRate >= 80 ? "text-green-600" :
                            r.collectionRate >= 50 ? "text-amber-600" : "text-red-600"
                          }`}>
                            {r.collectionRate}%
                          </span>
                        </td>
                        <td className="data-td text-right text-11 text-gray-400">
                          {new Date(r.generatedAt).toLocaleDateString("en-KE")}
                        </td>
                        <td className="data-td text-right">
                          <Link
                            href={`/reports/monthly/${r.year}/${r.month}`}
                            className="btn-secondary row-action-btn"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
