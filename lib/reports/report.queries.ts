/**
 * Elelyon LMS — Report Query Layer
 *
 * All aggregated Supabase queries for the reporting module.
 * Uses the admin client (service-role). No UI logic here.
 *
 * Schema facts:
 *   - Payments / repayments are stored in loan_transactions (type = 'Repayment')
 *   - Penalties are stored in loan_transactions (type = 'Manual Penalty')
 *   - Waivers are stored in loan_transactions (type = 'Waiver')
 *   - Loan statuses: Pending, Active, Overdue, Fully Paid, Written Off, Loss, Denied
 *   - lifecycle_state: Standard, Rollover, Restructured
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
  IncomeStatementReport,
  IncomeMonth,
  PARReport,
  PARRow,
  LoanOfficerReport,
  OfficerRow,
} from "./report.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTIVE_STATUSES = ["Active", "Overdue"];
const DISBURSED_STATUSES = ["Active", "Overdue", "Fully Paid", "Written Off", "Loss"];

function periodBounds(dateFrom?: string, dateTo?: string) {
  const from = dateFrom ? new Date(dateFrom) : new Date("2000-01-01");
  const to = dateTo ? new Date(dateTo) : new Date();
  to.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: to.toISOString() };
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
      "status, lifecycle_state, principal_amount, total_payable, balance, total_interest, remaining_penalties, is_high_risk, days_past_due"
    );

  if (error) throw error;

  const summary: PortfolioSummary = {
    totalLoans: 0,
    pendingLoans: 0,
    activeLoans: 0,
    overdueLoans: 0,
    fullyPaidLoans: 0,
    writtenOffLoans: 0,
    lossLoans: 0,
    deniedLoans: 0,
    highRiskLoans: 0,
    standardLoans: 0,
    rolloverLoans: 0,
    restructuredLoans: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    totalInterestEarned: 0,
    totalPenaltiesOutstanding: 0,
    collectionRate: 0,
    par30: 0,
    par60: 0,
    par90: 0,
  };

  let totalPayable = 0;
  let totalRepaid = 0;
  let totalPortfolioBalance = 0;
  let par30Balance = 0;
  let par60Balance = 0;
  let par90Balance = 0;

  for (const loan of loans ?? []) {
    summary.totalLoans++;
    if (loan.is_high_risk) summary.highRiskLoans++;

    // Status counts
    switch (loan.status) {
      case "Pending":     summary.pendingLoans++;    break;
      case "Active":      summary.activeLoans++;     break;
      case "Overdue":     summary.overdueLoans++;    break;
      case "Fully Paid":  summary.fullyPaidLoans++;  break;
      case "Written Off": summary.writtenOffLoans++; break;
      case "Loss":        summary.lossLoans++;       break;
      case "Denied":      summary.deniedLoans++;     break;
    }

    // Lifecycle counts
    switch (loan.lifecycle_state) {
      case "Standard":     summary.standardLoans++;     break;
      case "Rollover":     summary.rolloverLoans++;     break;
      case "Restructured": summary.restructuredLoans++; break;
    }

    // Financial aggregates for disbursed loans
    if (DISBURSED_STATUSES.includes(loan.status)) {
      summary.totalDisbursed += loan.principal_amount ?? 0;
      summary.totalInterestEarned += loan.total_interest ?? 0;
      summary.totalPenaltiesOutstanding += loan.remaining_penalties ?? 0;
      totalPayable += loan.total_payable ?? 0;
      totalRepaid += (loan.total_payable ?? 0) - (loan.balance ?? 0);
    }

    // Outstanding balance (active portfolio)
    if (ACTIVE_STATUSES.includes(loan.status)) {
      const bal = loan.balance ?? 0;
      summary.totalOutstanding += bal;
      totalPortfolioBalance += bal;
      const dpd = loan.days_past_due ?? 0;
      if (dpd >= 30) par30Balance += bal;
      if (dpd >= 60) par60Balance += bal;
      if (dpd >= 90) par90Balance += bal;
    }
  }

  summary.collectionRate =
    totalPayable > 0 ? Math.round((totalRepaid / totalPayable) * 10000) / 100 : 0;

  if (totalPortfolioBalance > 0) {
    summary.par30 = Math.round((par30Balance / totalPortfolioBalance) * 10000) / 100;
    summary.par60 = Math.round((par60Balance / totalPortfolioBalance) * 10000) / 100;
    summary.par90 = Math.round((par90Balance / totalPortfolioBalance) * 10000) / 100;
  }

  return summary;
}

// ─── Collection Report ────────────────────────────────────────────────────────

export async function getCollectionReport(
  filters: ReportFilters = {}
): Promise<CollectionSummary> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = periodBounds(filters.dateRange?.from, filters.dateRange?.to);

  // Fetch repayment transactions in the period
  let txQuery = supabase
    .from("loan_transactions")
    .select("loan_id, amount, date")
    .eq("type", "Repayment")
    .neq("status", "Reversed")
    .gte("date", from)
    .lte("date", to);

  const { data: transactions, error: txErr } = await txQuery;
  if (txErr) throw txErr;

  // Aggregate by loan
  const repByLoan = new Map<string, number>();
  const lastPayByLoan = new Map<string, string>();
  for (const t of transactions ?? []) {
    repByLoan.set(t.loan_id, (repByLoan.get(t.loan_id) ?? 0) + t.amount);
    const prev = lastPayByLoan.get(t.loan_id);
    if (!prev || t.date > prev) lastPayByLoan.set(t.loan_id, t.date);
  }

  // Fetch all disbursed loans
  const { data: loans, error: lErr } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, lifecycle_state, principal_amount, duration_in_months, balance, status, due_date, total_payable"
    )
    .in("status", DISBURSED_STATUSES)
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
    const installmentAmount = (loan.total_payable || 0) / (loan.duration_in_months || 1);
    totalCollected += totalRepaid;
    totalExpected += installmentAmount;

    rows.push({
      loanId: loan.id,
      clientName: clientMap[loan.client_id] ?? "Unknown",
      loanType: loan.loan_type ?? "—",
      lifecycleState: loan.lifecycle_state ?? "Standard",
      principalAmount: loan.principal_amount ?? 0,
      installmentAmount,
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

  // Use days_past_due directly from loans table (maintained by daily job)
  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, lifecycle_state, principal_amount, balance, due_date, remaining_penalties, days_past_due"
    )
    .eq("status", "Overdue")
    .order("days_past_due", { ascending: false });

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
    const daysPastDue = loan.days_past_due ?? 0;
    const bucket = arrearsBucket(daysPastDue);
    const client = clientMap[loan.client_id] ?? { name: "Unknown", phone: "" };

    const row: ArrearsRow = {
      loanId: loan.id,
      clientName: client.name,
      clientPhone: client.phone,
      loanType: loan.loan_type ?? "—",
      lifecycleState: loan.lifecycle_state ?? "Standard",
      principalAmount: loan.principal_amount ?? 0,
      balance: loan.balance ?? 0,
      dueDate: loan.due_date ?? "",
      daysPastDue,
      bucket,
      penaltyAccrued: loan.remaining_penalties ?? 0,
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

  return summary;
}

// ─── Cash Flow Report ────────────────────────────────────────────────────────

export async function getCashFlowReport(monthsBack = 12): Promise<CashFlowReport> {
  const supabase = createSupabaseAdminClient();

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - (monthsBack - 1));
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const [loansRes, txRes] = await Promise.all([
    supabase
      .from("loans")
      .select("start_date, principal_amount")
      .in("status", DISBURSED_STATUSES)
      .gte("start_date", startDate.toISOString()),
    supabase
      .from("loan_transactions")
      .select("date, amount")
      .eq("type", "Repayment")
      .neq("status", "Reversed")
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

  for (const tx of txRes.data ?? []) {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const b = bucketMap.get(key);
    if (b) b.collected += tx.amount ?? 0;
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

// ─── Penalty / Waiver Report ──────────────────────────────────────────────────

export async function getPenaltySummary(
  filters: ReportFilters = {}
): Promise<PenaltySummary> {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("loan_transactions")
    .select("id, loan_id, client_id, amount, type, status, date, applied_by, comment")
    .in("type", ["Manual Penalty", "Waiver"]);

  if (filters.dateRange?.from) query = query.gte("date", filters.dateRange.from);
  if (filters.dateRange?.to)   query = query.lte("date", filters.dateRange.to);

  const { data: transactions, error } = await query.order("date", { ascending: false });
  if (error) throw error;

  const clientIds = [...new Set((transactions ?? []).map((t) => t.client_id).filter(Boolean))];
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

  for (const t of transactions ?? []) {
    if (t.type === "Manual Penalty" && t.status === "Active") totalCharged += t.amount;
    else if (t.status === "Reversed") totalReversed += t.amount;

    rows.push({
      penaltyId: t.id,
      loanId: t.loan_id,
      clientName: clientMap[t.client_id] ?? "Unknown",
      penaltyType: t.type,
      amount: t.amount,
      status: t.status,
      dateApplied: t.date,
      appliedBy: t.applied_by ?? "—",
      comment: t.comment,
    });
  }

  return {
    totalCharged,
    totalReversed,
    totalOutstanding: totalCharged - totalReversed,
    chargedCount: rows.filter((r) => r.penaltyType === "Manual Penalty" && r.status === "Active").length,
    reversedCount: rows.filter((r) => r.status === "Reversed").length,
    rows,
  };
}

// ─── Income Statement ─────────────────────────────────────────────────────────

export async function getIncomeStatement(
  filters: ReportFilters = {}
): Promise<IncomeStatementReport> {
  const supabase = createSupabaseAdminClient();
  const { from, to } = periodBounds(filters.dateRange?.from, filters.dateRange?.to);

  const { data: transactions, error } = await supabase
    .from("loan_transactions")
    .select(
      "type, status, amount, date, allocated_current_interest, allocated_overdue_interest"
    )
    .gte("date", from)
    .lte("date", to)
    .in("type", ["Repayment", "Manual Penalty", "Waiver"]);

  if (error) throw error;

  // Build month buckets
  const bucketMap = new Map<string, IncomeMonth>();

  const addMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!bucketMap.has(key)) {
      bucketMap.set(key, {
        label: d.toLocaleDateString("en-KE", { month: "short", year: "numeric" }),
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        interest: 0,
        penalties: 0,
        waivers: 0,
        net: 0,
      });
    }
    return key;
  };

  let interestCollected = 0;
  let penaltyRevenue = 0;
  let waiverAmount = 0;

  for (const t of transactions ?? []) {
    if (t.status === "Reversed") continue;
    const key = addMonth(t.date);
    const m = bucketMap.get(key)!;

    if (t.type === "Repayment") {
      const interest = (t.allocated_current_interest ?? 0) + (t.allocated_overdue_interest ?? 0);
      interestCollected += interest;
      m.interest += interest;
    } else if (t.type === "Manual Penalty") {
      penaltyRevenue += t.amount ?? 0;
      m.penalties += t.amount ?? 0;
    } else if (t.type === "Waiver") {
      waiverAmount += t.amount ?? 0;
      m.waivers += t.amount ?? 0;
    }
  }

  const months = Array.from(bucketMap.values())
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map((m) => ({ ...m, net: m.interest + m.penalties - m.waivers }));

  const totalRevenue = interestCollected + penaltyRevenue;
  const netIncome = totalRevenue - waiverAmount;

  return {
    period: `${filters.dateRange?.from ?? "All time"} – ${filters.dateRange?.to ?? "Today"}`,
    interestCollected,
    penaltyRevenue,
    totalRevenue,
    waiverAmount,
    netIncome,
    months,
  };
}

// ─── PAR (Portfolio At Risk) Report ──────────────────────────────────────────

export async function getPARReport(): Promise<PARReport> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error } = await supabase
    .from("loans")
    .select(
      "id, client_id, loan_type, lifecycle_state, principal_amount, balance, days_past_due, status"
    )
    .in("status", ["Active", "Overdue", "Written Off", "Loss"]);

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

  let totalPortfolioBalance = 0;
  let par1Balance = 0;
  let par30Balance = 0;
  let par60Balance = 0;
  let par90Balance = 0;
  let writtenOffBalance = 0;
  let lossBalance = 0;
  const rows: PARRow[] = [];

  for (const loan of loans ?? []) {
    const bal = loan.balance ?? 0;
    const dpd = loan.days_past_due ?? 0;
    const client = clientMap[loan.client_id] ?? { name: "Unknown", phone: "" };

    if (loan.status === "Written Off") {
      writtenOffBalance += bal;
    } else if (loan.status === "Loss") {
      lossBalance += bal;
    } else {
      totalPortfolioBalance += bal;
      if (dpd >= 1)  par1Balance  += bal;
      if (dpd >= 30) par30Balance += bal;
      if (dpd >= 60) par60Balance += bal;
      if (dpd >= 90) par90Balance += bal;
    }

    let riskBucket = "Performing";
    if (loan.status === "Written Off") riskBucket = "Written Off";
    else if (loan.status === "Loss") riskBucket = "Loss";
    else if (dpd >= 90) riskBucket = "90+ DPD";
    else if (dpd >= 60) riskBucket = "61–90 DPD";
    else if (dpd >= 30) riskBucket = "31–60 DPD";
    else if (dpd >= 1)  riskBucket = "1–30 DPD";

    rows.push({
      loanId: loan.id,
      clientName: client.name,
      clientPhone: client.phone,
      loanType: loan.loan_type ?? "—",
      lifecycleState: loan.lifecycle_state ?? "Standard",
      principalAmount: loan.principal_amount ?? 0,
      balance: bal,
      daysPastDue: dpd,
      status: loan.status,
      riskBucket,
    });
  }

  const pct = (v: number) =>
    totalPortfolioBalance > 0 ? Math.round((v / totalPortfolioBalance) * 10000) / 100 : 0;

  rows.sort((a, b) => b.daysPastDue - a.daysPastDue);

  return {
    totalPortfolioBalance,
    par1Balance,
    par30Balance,
    par60Balance,
    par90Balance,
    par1Rate:  pct(par1Balance),
    par30Rate: pct(par30Balance),
    par60Rate: pct(par60Balance),
    par90Rate: pct(par90Balance),
    writtenOffBalance,
    lossBalance,
    rows,
  };
}

// ─── Loan Officer Performance ─────────────────────────────────────────────────

export async function getLoanOfficerReport(): Promise<LoanOfficerReport> {
  const supabase = createSupabaseAdminClient();

  const { data: loans, error: lErr } = await supabase
    .from("loans")
    .select(
      "id, created_by, principal_amount, balance, status, total_payable, duration_in_months"
    )
    .in("status", [...DISBURSED_STATUSES, "Pending", "Denied"]);

  if (lErr) throw lErr;

  // Aggregate collections per loan
  const { data: txns, error: tErr } = await supabase
    .from("loan_transactions")
    .select("loan_id, amount")
    .eq("type", "Repayment")
    .neq("status", "Reversed");

  if (tErr) throw tErr;

  const repByLoan = new Map<string, number>();
  for (const t of txns ?? []) {
    repByLoan.set(t.loan_id, (repByLoan.get(t.loan_id) ?? 0) + t.amount);
  }

  const officerMap = new Map<string, OfficerRow>();

  for (const loan of loans ?? []) {
    const officer = loan.created_by ?? "Unknown";
    if (!officerMap.has(officer)) {
      officerMap.set(officer, {
        officerName: officer,
        totalOriginated: 0,
        totalDisbursed: 0,
        activeCount: 0,
        overdueCount: 0,
        fullyPaidCount: 0,
        writtenOffCount: 0,
        lossCount: 0,
        totalCollected: 0,
        collectionRate: 0,
      });
    }
    const row = officerMap.get(officer)!;
    row.totalOriginated++;

    if (DISBURSED_STATUSES.includes(loan.status)) {
      row.totalDisbursed += loan.principal_amount ?? 0;
      row.totalCollected += repByLoan.get(loan.id) ?? 0;
    }

    switch (loan.status) {
      case "Active":      row.activeCount++;     break;
      case "Overdue":     row.overdueCount++;    break;
      case "Fully Paid":  row.fullyPaidCount++;  break;
      case "Written Off": row.writtenOffCount++; break;
      case "Loss":        row.lossCount++;       break;
    }
  }

  const officers = Array.from(officerMap.values()).map((o) => ({
    ...o,
    collectionRate:
      o.totalDisbursed > 0
        ? Math.round((o.totalCollected / o.totalDisbursed) * 10000) / 100
        : 0,
  })).sort((a, b) => b.totalDisbursed - a.totalDisbursed);

  return {
    officers,
    totalLoans: loans?.length ?? 0,
    totalDisbursed: officers.reduce((s, o) => s + o.totalDisbursed, 0),
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
  if (filters.dateRange?.to)   query = query.lte("timestamp", filters.dateRange.to);

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

  const [txRes, penRes] = await Promise.all([
    supabase
      .from("loan_transactions")
      .select("id, date, amount, type, payment_method, reference_id, comment, status")
      .eq("loan_id", loanId)
      .eq("type", "Repayment")
      .neq("status", "Reversed")
      .order("date", { ascending: true }),
    supabase
      .from("loan_transactions")
      .select("id, date, amount, type, status, comment")
      .eq("loan_id", loanId)
      .in("type", ["Manual Penalty", "Waiver"])
      .order("date", { ascending: false }),
  ]);

  const client = (loan as any).clients;
  const repayments = txRes.data ?? [];
  const penaltyTxns = penRes.data ?? [];

  // Build running balance
  let runningBalance = loan.total_payable ?? 0;
  const repaymentRows = repayments.map((r) => {
    runningBalance -= r.amount;
    return {
      id: r.id,
      date: r.date,
      amount: r.amount,
      paymentMethod: r.payment_method ?? "—",
      referenceId: r.reference_id,
      runningBalance: Math.max(0, runningBalance),
    };
  });

  const totalPaid = repayments.reduce((s, r) => s + r.amount, 0);
  const totalPenaltiesPaid = penaltyTxns
    .filter((p) => p.status === "Reversed")
    .reduce((s, p) => s + p.amount, 0);
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
      lifecycleState: loan.lifecycle_state ?? "Standard",
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
      penaltyAccrued: loan.remaining_penalties ?? 0,
      installmentAmount: (loan.total_payable || 0) / (loan.duration_in_months || 1),
      daysPastDue: loan.days_past_due ?? 0,
      securities: loan.securities,
      guarantorName: loan.guarantor_name,
    },
    repayments: repaymentRows,
    penalties: penaltyTxns.map((p) => ({
      id: p.id,
      dateApplied: p.date,
      amount: p.amount,
      penaltyType: p.type,
      status: p.status,
      comment: p.comment,
    })),
    summary: { totalPaid, totalPenaltiesPaid, remainingBalance, progressPercent },
  };
}
