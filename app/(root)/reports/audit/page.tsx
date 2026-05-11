import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getAuditLogReportAction } from "@/lib/actions/report.actions";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";
import HeaderBox from "@/components/HeaderBox";
import DateRangeFilter from "@/components/reports/DateRangeFilter";
import PdfExportButton from "@/components/reports/PdfExportButton";
import { ClipboardList } from "lucide-react";
import Link from "next/link";
import CompanyHeader from "@/components/reports/CompanyHeader";

const ACTION_STYLES: Record<string, string> = {
  REPAYMENT_CREATED: "bg-green-50 text-green-700",
  REPAYMENT_REVERSED: "bg-red-50 text-red-600",
  PENALTY_ADDED: "bg-orange-50 text-orange-700",
  PENALTY_REVERSED: "bg-blue-50 text-blue-700",
  LOAN_APPROVED: "bg-green-50 text-green-700",
  LOAN_DENIED: "bg-red-50 text-red-600",
  LOAN_UPDATED: "bg-gray-50 text-gray-700",
  STATUS_CHANGED: "bg-purple-50 text-purple-700",
  STATEMENT_GENERATED: "bg-indigo-50 text-indigo-700",
};

export default async function AuditLogReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; page?: string }>;
}) {
  const user = await getLoggedInUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "MANAGER")) redirect("/");

  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1", 10);

  const report = await getAuditLogReportAction({
    dateRange: sp.from || sp.to ? { from: sp.from ?? "", to: sp.to ?? "" } : undefined,
    page,
    pageSize: 50,
  });

  const totalPages = report ? Math.ceil(report.total / report.pageSize) : 0;

  return (
    <section className="home-content animate-fade-in print:p-6">
      <header className="page-header print:hidden">
        <div>
          <Link href="/reports" className="text-12 text-gray-400 hover:text-gray-600 mb-1 inline-block">
            ← Reports
          </Link>
          <HeaderBox title="Audit Log" subtext="Full activity trail — immutable and tamper-evident." />
        </div>
        <PdfExportButton reportType="audit" data={report} />
      </header>

      <div className="hidden print:block">
        <CompanyHeader 
          title="Audit Log Report"
          subtext={`Generated: ${new Date().toLocaleString("en-KE")}`}
        />
      </div>

      <div className="card-premium mb-6 print:hidden">
        <DateRangeFilter label="Filter by Date" />
      </div>

      {!report ? (
        <p className="text-gray-500">Failed to load audit log.</p>
      ) : (
        <div className="card-premium">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-14 font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList className="size-4" />
              Activity Log
              <span className="text-gray-400 font-normal normal-case tracking-normal">({report.total} events)</span>
            </h3>
            <span className="text-12 text-gray-400">Page {page} of {totalPages}</span>
          </div>

          <div className="data-table-wrap">
            <div className="data-table-scroll">
              <table className="data-table">
                <thead>
                  <tr className="data-table-head-row">
                    <th className="data-th text-left">Timestamp</th>
                    <th className="data-th text-left">Action</th>
                    <th className="data-th text-left">Loan</th>
                    <th className="data-th text-left">Performed By</th>
                    <th className="data-th text-left">Description</th>
                    <th className="data-th text-right">Prev Value</th>
                    <th className="data-th text-right">New Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="data-empty-cell">
                        <div className="data-empty">
                          <ClipboardList className="size-8 text-gray-300" />
                          <p className="text-14 text-gray-500 mt-2">No audit events found</p>
                        </div>
                      </td>
                    </tr>
                  ) : report.rows.map((row) => (
                    <tr key={row.id} className="data-table-row">
                      <td className="data-td text-11 text-gray-400 whitespace-nowrap">
                        {new Date(row.timestamp).toLocaleString("en-KE", {
                          dateStyle: "short", timeStyle: "short"
                        })}
                      </td>
                      <td className="data-td">
                        <span className={cn(
                          "text-10 font-bold uppercase tracking-wider px-2 py-0.5 rounded-full whitespace-nowrap",
                          ACTION_STYLES[row.action] ?? "bg-gray-50 text-gray-600"
                        )}>
                          {row.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="data-td">
                        {row.loanId ? (
                          <Link
                            href={`/loans/${row.loanId}`}
                            className="mono-pill hover:bg-primary/10 transition-colors"
                          >
                            {row.loanId.slice(-8).toUpperCase()}
                          </Link>
                        ) : "—"}
                      </td>
                      <td className="data-td text-12 text-gray-600">{row.performedBy}</td>
                      <td className="data-td text-12 text-gray-500 max-w-xs truncate">{row.description}</td>
                      <td className="data-td text-right text-12 text-gray-400 tabular-nums">{row.previousValue ?? "—"}</td>
                      <td className="data-td text-right text-12 text-gray-600 tabular-nums font-medium">{row.newValue ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 print:hidden">
              <span className="text-12 text-gray-400">
                Showing {((page - 1) * 50) + 1}–{Math.min(page * 50, report.total)} of {report.total}
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <Link
                    href={`/reports/audit?page=${page - 1}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`}
                    className="btn-secondary text-12 h-8 px-3"
                  >
                    ← Previous
                  </Link>
                )}
                {page < totalPages && (
                  <Link
                    href={`/reports/audit?page=${page + 1}${sp.from ? `&from=${sp.from}` : ""}${sp.to ? `&to=${sp.to}` : ""}`}
                    className="btn-secondary text-12 h-8 px-3"
                  >
                    Next →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
