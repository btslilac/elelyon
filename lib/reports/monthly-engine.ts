/**
 * Elelyon LMS — Monthly Reporting Engine
 *
 * Implements SACCO-grade period-based financial snapshots.
 *
 * Core accounting rule:
 *   A loan appears in month [Y, M] if:
 *     start_date <= period_end_date
 *     AND (closed_at IS NULL OR closed_at >= period_start_date)
 *
 * Closing Balance = Opening Balance + New Loans + Penalties - Repayments
 * Closing balance becomes next month's opening balance.
 *
 * Snapshots are IMMUTABLE. Once generated, historical data never changes
 * even if repayments/penalties are edited retroactively.
 */

import { createSupabaseAdminClient } from "../supabase";
import type {
  MonthlyReportRecord,
  MonthlyReportEntry,
  MonthlyReportFull,
  GenerateMonthlyReportInput,
} from "./report.types";

// ─── Period helpers ───────────────────────────────────────────────────────────

export function getPeriodBounds(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
  return { start: start.toISOString(), end: end.toISOString() };
}

export function getPeriodLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-KE", {
    month: "long",
    year: "numeric",
  });
}

export function getPreviousPeriod(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapReportRecord(row: any): MonthlyReportRecord {
  return {
    id: row.id,
    year: row.year,
    month: row.month,
    periodLabel: row.period_label,
    generatedAt: row.generated_at,
    generatedBy: row.generated_by ?? "",
    totalActiveLoans: row.total_active_loans ?? 0,
    totalNewLoans: row.total_new_loans ?? 0,
    totalClosedLoans: row.total_closed_loans ?? 0,
    totalOverdueLoans: row.total_overdue_loans ?? 0,
    totalDefaultedLoans: row.total_defaulted_loans ?? 0,
    openingPortfolioBalance: row.opening_portfolio_balance ?? 0,
    newLoansDisbursed: row.new_loans_disbursed ?? 0,
    totalRepaymentsCollected: row.total_repayments_collected ?? 0,
    totalPenaltiesCharged: row.total_penalties_charged ?? 0,
    closingPortfolioBalance: row.closing_portfolio_balance ?? 0,
    expectedCollections: row.expected_collections ?? 0,
    actualCollections: row.actual_collections ?? 0,
    collectionRate: row.collection_rate ?? 0,
  };
}

function mapReportEntry(row: any): MonthlyReportEntry {
  return {
    id: row.id,
    reportId: row.report_id,
    loanId: row.loan_id,
    clientId: row.client_id,
    clientName: row.client_name ?? "",
    loanType: row.loan_type ?? "—",
    disbursementDate: row.disbursement_date ?? "",
    dueDate: row.due_date ?? "",
    openingBalance: row.opening_balance ?? 0,
    newLoanAmount: row.new_loan_amount ?? 0,
    amountPaidThisMonth: row.amount_paid_this_month ?? 0,
    penaltiesThisMonth: row.penalties_this_month ?? 0,
    closingBalance: row.closing_balance ?? 0,
    loanStatus: row.loan_status ?? "Unknown",
    daysPastDue: row.days_past_due ?? 0,
    installmentAmount: row.installment_amount ?? 0,
  };
}

// ─── Fetch existing reports ───────────────────────────────────────────────────

export async function listMonthlyReports(): Promise<MonthlyReportRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("monthly_reports")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapReportRecord);
}

export async function getMonthlyReport(
  year: number,
  month: number
): Promise<MonthlyReportFull | null> {
  const supabase = createSupabaseAdminClient();

  const { data: report, error: rErr } = await supabase
    .from("monthly_reports")
    .select("*")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (rErr) throw rErr;
  if (!report) return null;

  const { data: entries, error: eErr } = await supabase
    .from("monthly_report_entries")
    .select("*")
    .eq("report_id", report.id)
    .order("closing_balance", { ascending: false });

  if (eErr) throw eErr;

  return {
    ...mapReportRecord(report),
    entries: (entries ?? []).map(mapReportEntry),
  };
}

// ─── Core snapshot engine ─────────────────────────────────────────────────────

export async function generateMonthlySnapshot(
  input: GenerateMonthlyReportInput
): Promise<MonthlyReportRecord> {
  const { year, month, generatedBy, overwrite = false } = input;
  const supabase = createSupabaseAdminClient();
  const { start: periodStart, end: periodEnd } = getPeriodBounds(year, month);
  const periodLabel = getPeriodLabel(year, month);

  // ── Guard: prevent overwriting unless explicitly allowed ─────────────────
  const { data: existing } = await supabase
    .from("monthly_reports")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (existing && !overwrite) {
    throw new Error(
      `Monthly report for ${periodLabel} already exists. Pass overwrite=true to regenerate.`
    );
  }

  // ── Step 1: Determine which loans belong in this period ──────────────────
  // A loan belongs if: start_date <= periodEnd AND (closed_at IS NULL OR closed_at >= periodStart)
  const { data: loans, error: lErr } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, principal_amount, balance, total_payable, " +
      "start_date, due_date, status, installment_amount, penalty_accrued, closed_at"
    )
    .lte("start_date", periodEnd)
    .not("status", "in", '("Pending","Denied")')
    .or(`closed_at.is.null,closed_at.gte.${periodStart}`);

  if (lErr) throw lErr;
  const periodLoans = loans ?? [];

  // ── Step 2: Fetch repayments and penalties for this period ───────────────
  const loanIds = periodLoans.map((l) => l.id);

  const [repRes, penRes] = loanIds.length > 0
    ? await Promise.all([
      supabase
        .from("repayments")
        .select("loan_id, amount")
        .in("loan_id", loanIds)
        .gte("date", periodStart)
        .lte("date", periodEnd),
      supabase
        .from("penalties")
        .select("loan_id, amount")
        .in("loan_id", loanIds)
        .gte("date_applied", periodStart)
        .lte("date_applied", periodEnd)
        .eq("status", "Active"),
    ])
    : [{ data: [] }, { data: [] }];

  const repByLoan = new Map<string, number>();
  for (const r of repRes.data ?? []) {
    repByLoan.set(r.loan_id, (repByLoan.get(r.loan_id) ?? 0) + r.amount);
  }
  const penByLoan = new Map<string, number>();
  for (const p of penRes.data ?? []) {
    penByLoan.set(p.loan_id, (penByLoan.get(p.loan_id) ?? 0) + p.amount);
  }

  // ── Step 3: Get opening balance from previous month snapshot ─────────────
  const { year: prevYear, month: prevMonth } = getPreviousPeriod(year, month);
  const { data: prevReport } = await supabase
    .from("monthly_reports")
    .select("id, closing_portfolio_balance")
    .eq("year", prevYear)
    .eq("month", prevMonth)
    .maybeSingle();

  const openingPortfolioBalance = prevReport?.closing_portfolio_balance ?? 0;

  // Get per-loan opening balances from previous month's entries
  const openingByLoan = new Map<string, number>();
  if (prevReport) {
    const { data: prevEntries } = await supabase
      .from("monthly_report_entries")
      .select("loan_id, closing_balance")
      .eq("report_id", prevReport.id);
    (prevEntries ?? []).forEach((e) => {
      openingByLoan.set(e.loan_id, e.closing_balance);
    });
  }

  // ── Step 4: Fetch client names ────────────────────────────────────────────
  const clientIds = [...new Set(periodLoans.map((l) => l.client_id))];
  let clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);
    (clients ?? []).forEach((c) => {
      clientMap[c.id] = `${c.first_name} ${c.last_name}`;
    });
  }

  // ── Step 5: Build entry rows and aggregate totals ─────────────────────────
  const periodStartDate = new Date(periodStart);
  const entries: Omit<MonthlyReportEntry, "id" | "reportId">[] = [];

  let totalNewLoans = 0;
  let totalClosedLoans = 0;
  let totalActiveLoans = 0;
  let totalOverdueLoans = 0;
  let totalDefaultedLoans = 0;
  let totalNewDisbursed = 0;
  let totalRepaid = 0;
  let totalPenalties = 0;
  let totalExpected = 0;
  let closingPortfolioBalance = 0;

  for (const loan of periodLoans) {
    const loanStartDate = new Date(loan.start_date);
    const isNewThisPeriod = loanStartDate >= new Date(periodStart);
    const amountPaid = repByLoan.get(loan.id) ?? 0;
    const penaltiesThisMonth = penByLoan.get(loan.id) ?? 0;
    const dueDate = loan.due_date ? new Date(loan.due_date) : null;
    const daysPastDue = dueDate && dueDate < periodStartDate
      ? Math.floor((periodStartDate.getTime() - dueDate.getTime()) / 86_400_000)
      : 0;

    // Opening balance: from previous snapshot, or principal if new
    const openingBalance = openingByLoan.get(loan.id) ??
      (isNewThisPeriod ? 0 : loan.balance + amountPaid - penaltiesThisMonth);

    // Closing: opening + new disbursement + penalties - repayments
    const newLoanAmount = isNewThisPeriod ? loan.principal_amount : 0;
    const closingBalance = Math.max(
      0,
      openingBalance + newLoanAmount + penaltiesThisMonth - amountPaid
    );

    entries.push({
      loanId: loan.id,
      clientId: loan.client_id,
      clientName: clientMap[loan.client_id] ?? "Unknown",
      loanType: loan.loan_type ?? "Loan",
      disbursementDate: loan.start_date ?? "",
      dueDate: loan.due_date ?? "",
      openingBalance,
      newLoanAmount,
      amountPaidThisMonth: amountPaid,
      penaltiesThisMonth,
      closingBalance,
      loanStatus: loan.status,
      daysPastDue,
      installmentAmount: loan.installment_amount ?? 0,
    });

    // Aggregates
    if (isNewThisPeriod) { totalNewLoans++; totalNewDisbursed += loan.principal_amount ?? 0; }
    if (loan.status === "Completed" && loan.closed_at && loan.closed_at >= periodStart) totalClosedLoans++;
    if (loan.status === "Active") totalActiveLoans++;
    if (loan.status === "Overdue") totalOverdueLoans++;
    if (loan.status === "Defaulted") totalDefaultedLoans++;
    totalRepaid += amountPaid;
    totalPenalties += penaltiesThisMonth;
    totalExpected += loan.installment_amount ?? 0;
    closingPortfolioBalance += closingBalance;
  }

  const collectionRate = totalExpected > 0
    ? Math.round((totalRepaid / totalExpected) * 10000) / 100
    : 0;

  // ── Step 6: Persist snapshot ──────────────────────────────────────────────
  if (existing && overwrite) {
    // Delete old entries first
    await supabase.from("monthly_report_entries").delete().eq("report_id", existing.id);
    await supabase.from("monthly_reports").delete().eq("id", existing.id);
  }

  const { data: reportRow, error: insertErr } = await supabase
    .from("monthly_reports")
    .insert({
      year,
      month,
      period_label: periodLabel,
      generated_by: generatedBy,
      total_active_loans: totalActiveLoans,
      total_new_loans: totalNewLoans,
      total_closed_loans: totalClosedLoans,
      total_overdue_loans: totalOverdueLoans,
      total_defaulted_loans: totalDefaultedLoans,
      opening_portfolio_balance: openingPortfolioBalance,
      new_loans_disbursed: totalNewDisbursed,
      total_repayments_collected: totalRepaid,
      total_penalties_charged: totalPenalties,
      closing_portfolio_balance: closingPortfolioBalance,
      expected_collections: totalExpected,
      actual_collections: totalRepaid,
      collection_rate: collectionRate,
    })
    .select()
    .single();

  if (insertErr) throw insertErr;

  // Insert entries with the new report_id
  if (entries.length > 0) {
    const { error: entryErr } = await supabase
      .from("monthly_report_entries")
      .insert(
        entries.map((e) => ({
          report_id: reportRow.id,
          loan_id: e.loanId,
          client_id: e.clientId,
          client_name: e.clientName,
          loan_type: e.loanType,
          disbursement_date: e.disbursementDate || null,
          due_date: e.dueDate || null,
          opening_balance: e.openingBalance,
          new_loan_amount: e.newLoanAmount,
          amount_paid_this_month: e.amountPaidThisMonth,
          penalties_this_month: e.penaltiesThisMonth,
          closing_balance: e.closingBalance,
          loan_status: e.loanStatus,
          days_past_due: e.daysPastDue,
          installment_amount: e.installmentAmount,
        }))
      );
    if (entryErr) throw entryErr;
  }

  return mapReportRecord(reportRow);
}
