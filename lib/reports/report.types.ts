/**
 * Elelyon LMS — Reporting Type Definitions
 * All types shared by the report query layer, server actions, and UI components.
 * Aligned to the actual production DB schema (loan_transactions replaces repayments/penalties).
 */

// ─── Filters ────────────────────────────────────────────────────────────────

export interface ReportDateRange {
  from: string; // ISO date string YYYY-MM-DD
  to: string;
}

export interface ReportFilters {
  dateRange?: ReportDateRange;
  status?: string;
  loanType?: string;
  clientId?: string;
  page?: number;
  pageSize?: number;
}

export interface MonthlyReportFilters {
  year: number;
  month: number; // 1–12
}

// ─── Loan status constants (actual DB values) ────────────────────────────────

export const LOAN_STATUSES = {
  PENDING: "Pending",
  ACTIVE: "Active",
  OVERDUE: "Overdue",
  FULLY_PAID: "Fully Paid",
  WRITTEN_OFF: "Written Off",
  LOSS: "Loss",
  DENIED: "Denied",
} as const;

export type LoanStatus = typeof LOAN_STATUSES[keyof typeof LOAN_STATUSES];
export type LifecycleState = "Standard" | "Rollover" | "Restructured";

// ─── Portfolio Summary ───────────────────────────────────────────────────────

export interface PortfolioSummary {
  // Counts by status
  totalLoans: number;
  pendingLoans: number;
  activeLoans: number;
  overdueLoans: number;
  fullyPaidLoans: number;
  writtenOffLoans: number;
  lossLoans: number;
  deniedLoans: number;
  highRiskLoans: number;

  // Lifecycle counts
  standardLoans: number;
  rolloverLoans: number;
  restructuredLoans: number;

  // Financial totals
  totalDisbursed: number;       // sum of principal_amount (non-pending/denied)
  totalOutstanding: number;     // sum of balance (active + overdue)
  totalInterestEarned: number;  // sum of total_interest for disbursed loans
  totalPenaltiesOutstanding: number; // sum of remaining_penalties
  collectionRate: number;       // percentage

  // PAR (Portfolio At Risk) — % of active portfolio with days_past_due > 0
  par30: number; // % of portfolio with DPD >= 30
  par60: number;
  par90: number;
}

// ─── Collection Report ───────────────────────────────────────────────────────

export interface CollectionReportRow {
  loanId: string;
  clientName: string;
  loanType: string;
  lifecycleState: string;
  principalAmount: number;
  installmentAmount: number;
  totalRepaid: number;
  balance: number;
  status: string;
  lastPaymentDate: string | null;
  dueDate: string | null;
}

export interface CollectionSummary {
  period: string;
  totalExpected: number;
  totalCollected: number;
  collectionRate: number;
  rows: CollectionReportRow[];
}

// ─── Arrears / Delinquency ───────────────────────────────────────────────────

export type ArrearsBucket = '1-30' | '31-60' | '61-90' | '90+';

export interface ArrearsRow {
  loanId: string;
  clientName: string;
  clientPhone: string;
  loanType: string;
  lifecycleState: string;
  principalAmount: number;
  balance: number;
  dueDate: string;
  daysPastDue: number;
  bucket: ArrearsBucket;
  penaltyAccrued: number;
}

export interface ArrearsSummary {
  bucket1_30: { count: number; totalBalance: number };
  bucket31_60: { count: number; totalBalance: number };
  bucket61_90: { count: number; totalBalance: number };
  bucket90plus: { count: number; totalBalance: number };
  totalOverdue: number;
  rows: ArrearsRow[];
}

// ─── Cash Flow ───────────────────────────────────────────────────────────────

export interface CashFlowMonth {
  label: string;   // e.g. "Jan 2026"
  year: number;
  month: number;
  disbursed: number;
  collected: number;
  netFlow: number;
}

export interface CashFlowReport {
  months: CashFlowMonth[];
  totalDisbursed: number;
  totalCollected: number;
  netCashFlow: number;
}

// ─── Penalty / Transaction Report ────────────────────────────────────────────

export interface PenaltySummary {
  totalCharged: number;
  totalReversed: number;
  totalOutstanding: number;
  chargedCount: number;
  reversedCount: number;
  rows: PenaltyReportRow[];
}

export interface PenaltyReportRow {
  penaltyId: string;
  loanId: string;
  clientName: string;
  penaltyType: string;   // transaction type e.g. "Manual Penalty"
  amount: number;
  status: string;        // Active | Reversed
  dateApplied: string;
  appliedBy: string;
  comment?: string;
}

// ─── Income Statement ────────────────────────────────────────────────────────

export interface IncomeStatementReport {
  period: string;
  // Revenue
  interestCollected: number;     // allocated_current_interest + allocated_overdue_interest from Repayments
  penaltyRevenue: number;        // Manual Penalty transactions (Active)
  totalRevenue: number;
  // Waivers (expense/write-down)
  waiverAmount: number;          // Waiver transactions
  netIncome: number;
  // Monthly breakdown
  months: IncomeMonth[];
}

export interface IncomeMonth {
  label: string;
  year: number;
  month: number;
  interest: number;
  penalties: number;
  waivers: number;
  net: number;
}

// ─── PAR (Portfolio At Risk) ─────────────────────────────────────────────────

export interface PARReport {
  totalPortfolioBalance: number;
  par1Balance: number;    // DPD >= 1
  par30Balance: number;   // DPD >= 30
  par60Balance: number;   // DPD >= 60
  par90Balance: number;   // DPD >= 90
  par1Rate: number;       // percentage of total portfolio
  par30Rate: number;
  par60Rate: number;
  par90Rate: number;
  writtenOffBalance: number;
  lossBalance: number;
  rows: PARRow[];
}

export interface PARRow {
  loanId: string;
  clientName: string;
  clientPhone: string;
  loanType: string;
  lifecycleState: string;
  principalAmount: number;
  balance: number;
  daysPastDue: number;
  status: string;
  riskBucket: string;
}

// ─── Loan Officer Performance ────────────────────────────────────────────────

export interface LoanOfficerReport {
  officers: OfficerRow[];
  totalLoans: number;
  totalDisbursed: number;
}

export interface OfficerRow {
  officerName: string;
  totalOriginated: number;
  totalDisbursed: number;
  activeCount: number;
  overdueCount: number;
  fullyPaidCount: number;
  writtenOffCount: number;
  lossCount: number;
  totalCollected: number;
  collectionRate: number;
}

// ─── Audit Log Report ────────────────────────────────────────────────────────

export interface AuditLogReportRow {
  id: string;
  loanId: string;
  action: string;
  performedBy: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
}

export interface AuditLogReport {
  rows: AuditLogReportRow[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Monthly Snapshot ────────────────────────────────────────────────────────

/** Stored in monthly_reports table */
export interface MonthlyReportRecord {
  id: string;
  year: number;
  month: number;
  periodLabel: string;
  generatedAt: string;
  generatedBy: string;

  // Portfolio counts
  totalActiveLoans: number;
  totalNewLoans: number;
  totalClosedLoans: number;
  totalOverdueLoans: number;
  totalDefaultedLoans: number;

  // Financial totals
  openingPortfolioBalance: number;
  newLoansDisbursed: number;
  totalRepaymentsCollected: number;
  totalPenaltiesCharged: number;
  closingPortfolioBalance: number;

  // Efficiency
  expectedCollections: number;
  actualCollections: number;
  collectionRate: number;
}

/** Stored in monthly_report_entries table — one row per loan per month */
export interface MonthlyReportEntry {
  id: string;
  reportId: string;
  loanId: string;
  clientId: string;
  clientName: string;
  loanType: string;
  disbursementDate: string;
  dueDate: string;
  openingBalance: number;
  newLoanAmount: number;
  amountPaidThisMonth: number;
  penaltiesThisMonth: number;
  closingBalance: number;
  loanStatus: string;
  daysPastDue: number;
  installmentAmount: number;
}

/** Full monthly report with entries */
export interface MonthlyReportFull extends MonthlyReportRecord {
  entries: MonthlyReportEntry[];
}

/** Input for generating a monthly snapshot */
export interface GenerateMonthlyReportInput {
  year: number;
  month: number;
  generatedBy: string;
  overwrite?: boolean;
}

// ─── Loan Statement (client-facing) ──────────────────────────────────────────

export interface LoanStatementData {
  loan: {
    id: string;
    clientName: string;
    clientPhone: string;
    clientEmail: string;
    nationalId: string;
    loanType: string;
    lifecycleState: string;
    principalAmount: number;
    interestRate: number;
    interestType: string;
    durationInMonths: number;
    totalInterest: number;
    totalPayable: number;
    startDate: string;
    dueDate: string;
    status: string;
    balance: number;
    penaltyAccrued: number;
    installmentAmount: number;
    daysPastDue: number;
    securities?: string;
    guarantorName?: string;
  };
  repayments: {
    id: string;
    date: string;
    amount: number;
    paymentMethod: string;
    referenceId?: string;
    runningBalance: number;
  }[];
  penalties: {
    id: string;
    dateApplied: string;
    amount: number;
    penaltyType: string;
    status: string;
    comment?: string;
  }[];
  summary: {
    totalPaid: number;
    totalPenaltiesPaid: number;
    remainingBalance: number;
    progressPercent: number;
  };
}
