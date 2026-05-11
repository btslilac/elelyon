/**
 * Elelyon LMS — Report Query Layer
 *
 * All aggregated Supabase queries for the reporting module.
 * Uses the admin client (service-role). No UI logic here.
 * Period-based filtering follows SACCO accounting rules:
 *   A loan appears in a period if:
 *     start_date <= period_end AND (closed_at IS NULL OR closed_at >= period_start)
 */

import { createSupabaseAdminClient } from "../supabase";
import type {
  PortfolioSummary,
  CollectionSummary,
  CollectionReportRow,
  ArrearsSummary,
  ArrearsRow,
  ArrearsBucket,
  CashFlowReport,
  CashFlowMonth,
  PenaltySummary,
  PenaltyReportRow,
  AuditLogReport,
  LoanStatementData,
  ReportFilters,
} from "./report.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodBounds(dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date("2000-01-01");
  const to = dateTo ? new Date(dateTo) : new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
}

function daysBetween(a: Date, b: Date) {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

function arrearsBucket(days: number): ArrearsBucket {
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

// ─── Portfolio Summary ────────────────────────────────────────────────────────

export async function getPortfolioSummary(): Promise<PortfolioSummary> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "status, principal_amount, total_payable, balance, total_interest, penalty_accrued, is_high_risk"
    );

  if (error) throw error;

  const summary: PortfolioSummary = {
    totalLoans: 0,
    pendingLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    completedLoans: 0,
    defaultedLoans: 0,
    deniedLoans: 0,
    highRiskLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalInterestEarned: 0,
    totalPenaltiesCharged: 0,
    collectionRate: 0,
  };

  let totalPayable = 0;
  let totalRepaid = 0;

  for (const loan of loans ?? []) {
    summary.totalLoans++;
    if (loan.is_high_risk) summary.highRiskLoans++;

    switch (loan.status) {
      case "Pending": summary.pendingLoans++; break;
      case "Active": summary.activeLoans++; break;
      case "Overdue": summary.overdueLoans++; break;
      case "Completed": summary.completedLoans++; break;
      case "Defaulted": summary.defaultedLoans++; break;
      case "Denied": summary.deniedLoans++; break;
    }

    if (loan.status !== "Pending" && loan.status !== "Denied") {
      summary.totalDisbursed += loan.principal_amount ?? 0;
      summary.totalInterestEarned += loan.total_interest ?? 0;
      summary.totalPenaltiesCharged += loan.penalty_accrued ?? 0;
      totalPayable += loan.total_payable ?? 0;
      totalRepaid += (loan.total_payable ?? 0) - (loan.balance ?? 0);
    }

    if (loan.status === "Active" || loan.status === "Overdue") {
      summary.totalOutstanding += loan.balance ?? 0;
    }
  }

  summary.collectionRate =
    totalPayable > 0 ? Math.round((totalRepaid / totalPayable) * 10000) / 100 : 0;

  return summary;
}

// ─── Collection Report ────────────────────────────────────────────────────────

export async function getCollectionReport(
  filters: ReportFilters = {}
): Promise<CollectionSummary> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = periodBounds(filters.dateRange?.from, filters.dateRange?.to);

  // Fetch repayments in the period
  const { data: repayments, error: repErr } = await supabase
    .from("repayments")
    .select("loan_id, amount, date")
    .gte("date", from)
    .lte("date", to);

  if (repErr) throw repErr;

  // Aggregate by loan
  const repByLoan = new Map<string, number>();
  const lastPayByLoan = new Map<string, string>();
  for (const r of repayments ?? []) {
    repByLoan.set(r.loan_id, (repByLoan.get(r.loan_id) ?? 0) + r.amount);
    const prev = lastPayByLoan.get(r.loan_id);
    if (!prev || r.date > prev) lastPayByLoan.set(r.loan_id, r.date);
  }

  // Fetch active loans for context
  const { data: loans, error: lErr } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, principal_amount, installment_amount, balance, status, due_date, total_payable"
    )
    .not("status", "in", '("Pending","Denied")')
    .order("created_at", { ascending: false });

  if (lErr) throw lErr;

  const clientIds = [...new Set((loans ?? []).map((l) => l.client_id))];
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

  let totalExpected = 0;
  let totalCollected = 0;
  const rows: CollectionReportRow[] = [];

  for (const loan of loans ?? []) {
    const totalRepaid = repByLoan.get(loan.id) ?? 0;
    totalCollected += totalRepaid;
    totalExpected += loan.installment_amount ?? 0;

    rows.push({
      loanId: loan.id,
      clientName: clientMap[loan.client_id] ?? "Unknown",
      loanType: loan.loan_type ?? "—",
      principalAmount: loan.principal_amount ?? 0,
      installmentAmount: loan.installment_amount ?? 0,
      totalRepaid,
      balance: loan.balance ?? 0,
      status: loan.status,
      lastPaymentDate: lastPayByLoan.get(loan.id) ?? null,
      dueDate: loan.due_date ?? null,
    });
  }

  const collectionRate =
    totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 10000) / 100 : 0;

  return {
    period: `${filters.dateRange?.from ?? "All time"} – ${filters.dateRange?.to ?? "Today"}`,
    totalExpected,
    totalCollected,
    collectionRate,
    rows,
  };
}

// ─── Arrears / Delinquency Report ─────────────────────────────────────────────

export async function getArrearsReport(): Promise<ArrearsSummary> {
  const supabase = createSupabaseAdminClient();
  const now = new Date();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, principal_amount, balance, due_date, penalty_accrued"
    )
    .in("status", ["Overdue", "Defaulted"]);

  if (error) throw error;

  const clientIds = [...new Set((loans ?? []).map((l) => l.client_id))];
  let clientMap: Record<string, { name: string; phone: string }> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name, phone")
      .in("id", clientIds);
    (clients ?? []).forEach((c) => {
      clientMap[c.id] = { name: `${c.first_name} ${c.last_name}`, phone: c.phone ?? "" };
    });
  }

  const summary: ArrearsSummary = {
    bucket1_30: { count: 0, totalBalance: 0 },
    bucket31_60: { count: 0, totalBalance: 0 },
    bucket61_90: { count: 0, totalBalance: 0 },
    bucket90plus: { count: 0, totalBalance: 0 },
    totalOverdue: 0,
    rows: [],
  };

  for (const loan of loans ?? []) {
    const dueDate = loan.due_date ? new Date(loan.due_date) : null;
    const daysPastDue = dueDate ? Math.max(0, daysBetween(dueDate, now)) : 0;
    const bucket = arrearsBucket(daysPastDue);
    const client = clientMap[loan.client_id] ?? { name: "Unknown", phone: "" };

    const row: ArrearsRow = {
      loanId: loan.id,
      clientName: client.name,
      clientPhone: client.phone,
      loanType: loan.loan_type ?? "—",
      principalAmount: loan.principal_amount ?? 0,
      balance: loan.balance ?? 0,
      dueDate: loan.due_date ?? "",
      daysPastDue,
      bucket,
      penaltyAccrued: loan.penalty_accrued ?? 0,
    };

    summary.rows.push(row);
    summary.totalOverdue += loan.balance ?? 0;

    if (bucket === "1-30") {
      summary.bucket1_30.count++;
      summary.bucket1_30.totalBalance += loan.balance ?? 0;
    } else if (bucket === "31-60") {
      summary.bucket31_60.count++;
      summary.bucket31_60.totalBalance += loan.balance ?? 0;
    } else if (bucket === "61-90") {
      summary.bucket61_90.count++;
      summary.bucket61_90.totalBalance += loan.balance ?? 0;
    } else {
      summary.bucket90plus.count++;
      summary.bucket90plus.totalBalance += loan.balance ?? 0;
    }
  }

  summary.rows.sort((a, b) => b.daysPastDue - a.daysPastDue);
  return summary;
}

// ─── Cash Flow Report ────────────────────────────────────────────────────────

export async function getCashFlowReport(monthsBack = 12): Promise<CashFlowReport> {
  const supabase = createSupabaseAdminClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (monthsBack - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const [loansRes, repaymentsRes] = await Promise.all([
    supabase
      .from("loans")
      .select("start_date, principal_amount")
      .not("status", "in", '("Pending","Denied")')
      .gte("start_date", startDate.toISOString()),
    supabase
      .from("repayments")
      .select("date, amount")
      .gte("date", startDate.toISOString()),
  ]);

  // Build month buckets
  const months: CashFlowMonth[] = [];
  const now = new Date();
  const bucketMap = new Map<string, CashFlowMonth>();

  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(startDate);
    d.setMonth(startDate.getMonth() + i);
    if (d > now) break;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const bucket: CashFlowMonth = {
      label: d.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      disbursed: 0,
      collected: 0,
      netFlow: 0,
    };
    months.push(bucket);
    bucketMap.set(key, bucket);
  }

  for (const loan of loansRes.data ?? []) {
    const d = new Date(loan.start_date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketMap.get(key);
    if (b) b.disbursed += loan.principal_amount ?? 0;
  }

  for (const rep of repaymentsRes.data ?? []) {
    const d = new Date(rep.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketMap.get(key);
    if (b) b.collected += rep.amount ?? 0;
  }

  let totalDisbursed = 0;
  let totalCollected = 0;
  for (const m of months) {
    m.netFlow = m.collected - m.disbursed;
    totalDisbursed += m.disbursed;
    totalCollected += m.collected;
  }

  return { months, totalDisbursed, totalCollected, netCashFlow: totalCollected - totalDisbursed };
}

// ─── Penalty Report ───────────────────────────────────────────────────────────

export async function getPenaltySummary(
  filters: ReportFilters = {}
): Promise<PenaltySummary> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("penalties")
    .select("id, loan_id, client_id, amount, penalty_type, status, date_applied, applied_by, comment");

  if (filters.dateRange?.from) query = query.gte("date_applied", filters.dateRange.from);
  if (filters.dateRange?.to) query = query.lte("date_applied", filters.dateRange.to);

  const { data: penalties, error } = await query.order("date_applied", { ascending: false });
  if (error) throw error;

  const clientIds = [...new Set((penalties ?? []).map((p) => p.client_id))];
  let clientMap: Record<string, string> = {};
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("clients")
      .select("id, first_name, last_name")
      .in("id", clientIds);
    (clients ?? []).forEach((c) => { clientMap[c.id] = `${c.first_name} ${c.last_name}`; });
  }

  let totalCharged = 0;
  let totalReversed = 0;
  const rows: PenaltyReportRow[] = [];

  for (const p of penalties ?? []) {
    if (p.status === "Active") totalCharged += p.amount;
    else if (p.status === "Reversed") totalReversed += p.amount;

    rows.push({
      penaltyId: p.id,
      loanId: p.loan_id,
      clientName: clientMap[p.client_id] ?? "Unknown",
      penaltyType: p.penalty_type,
      amount: p.amount,
      status: p.status,
      dateApplied: p.date_applied,
      appliedBy: p.applied_by,
      comment: p.comment,
    });
  }

  return {
    totalCharged,
    totalReversed,
    totalOutstanding: totalCharged,
    chargedCount: rows.filter((r) => r.status === "Active").length,
    reversedCount: rows.filter((r) => r.status === "Reversed").length,
    rows,
  };
}

// ─── Audit Log Report ─────────────────────────────────────────────────────────

export async function getAuditLogReport(
  filters: ReportFilters = {}
): Promise<AuditLogReport> {
  const supabase = createSupabaseAdminClient();
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("audit_logs")
    .select("id, loan_id, action, performed_by, description, previous_value, new_value, timestamp", {
      count: "exact",
    })
    .order("timestamp", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (filters.dateRange?.from) query = query.gte("timestamp", filters.dateRange.from);
  if (filters.dateRange?.to) query = query.lte("timestamp", filters.dateRange.to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []).map((row) => ({
      id: row.id,
      loanId: row.loan_id ?? "",
      action: row.action,
      performedBy: row.performed_by,
      description: row.description ?? "",
      previousValue: row.previous_value,
      newValue: row.new_value,
      timestamp: row.timestamp,
    })),
    total: count ?? 0,
    page,
    pageSize,
  };
}

// ─── Loan Statement (client-facing) ──────────────────────────────────────────

export async function getLoanStatementData(loanId: string): Promise<LoanStatementData | null> {
  const supabase = createSupabaseAdminClient();

  const { data: loan, error: lErr } = await supabase
    .from("loans")
    .select("*, clients(first_name, last_name, email, phone, national_id)")
    .eq("id", loanId)
    .single();

  if (lErr || !loan) return null;

  const [repaymentsRes, penaltiesRes] = await Promise.all([
    supabase.from("repayments").select("*").eq("loan_id", loanId).order("date", { ascending: true }),
    supabase.from("penalties").select("*").eq("loan_id", loanId).order("date_applied", { ascending: false }),
  ]);

  const client = (loan as any).clients;
  const repayments = repaymentsRes.data ?? [];
  const penalties = penaltiesRes.data ?? [];

  // Build running balance
  let runningBalance = loan.total_payable ?? 0;
  const repaymentRows = repayments.map((r) => {
    runningBalance -= r.amount;
    return {
      id: r.id,
      date: r.date,
      amount: r.amount,
      paymentMethod: r.payment_method,
      referenceId: r.reference_id,
      runningBalance: Math.max(0, runningBalance),
    };
  });

  const totalPaid = repayments.reduce((s, r) => s + r.amount, 0);
  const totalPenaltiesPaid = penalties
    .filter((p) => p.status === "Reversed")
    .reduce((s: number, p: any) => s + p.amount, 0);
  const remainingBalance = loan.balance ?? 0;
  const progressPercent = Math.min(100, (totalPaid / (loan.total_payable || 1)) * 100);

  return {
    loan: {
      id: loan.id,
      clientName: client ? `${client.first_name} ${client.last_name}` : "Unknown",
      clientPhone: client?.phone ?? "",
      clientEmail: client?.email ?? "",
      nationalId: client?.national_id ?? "",
      loanType: loan.loan_type ?? "Loan",
      principalAmount: loan.principal_amount ?? 0,
      interestRate: loan.interest_rate ?? 0,
      interestType: loan.interest_type ?? "Flat",
      durationInMonths: loan.duration_in_months ?? 0,
      totalInterest: loan.total_interest ?? 0,
      totalPayable: loan.total_payable ?? 0,
      startDate: loan.start_date ?? "",
      dueDate: loan.due_date ?? "",
      status: loan.status ?? "Unknown",
      balance: loan.balance ?? 0,
      penaltyAccrued: loan.penalty_accrued ?? 0,
      installmentAmount: loan.installment_amount ?? 0,
      securities: loan.securities,
      guarantorName: loan.guarantor_name,
    },
    repayments: repaymentRows,
    penalties: penalties.map((p: any) => ({
      id: p.id,
      dateApplied: p.date_applied,
      amount: p.amount,
      penaltyType: p.penalty_type,
      status: p.status,
      comment: p.comment,
    })),
    summary: { totalPaid, totalPenaltiesPaid, remainingBalance, progressPercent },
  };
}
