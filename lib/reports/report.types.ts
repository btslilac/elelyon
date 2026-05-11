/**
 * Elelyon LMS — Reporting Type Definitions
 * All types shared by the report query layer, server actions, and UI components.
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

// ─── Portfolio Summary ───────────────────────────────────────────────────────

export interface PortfolioSummary {
  totalLoans: number;
  pendingLoans: number;
  activeLoans: number;
  overdueLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  deniedLoans: number;
  highRiskLoans: number;

  totalDisbursed: number;       // sum of principal_amount (non-pending/denied)
  totalOutstanding: number;     // sum of balance (active + overdue)
  totalInterestEarned: number;  // sum of (total_payable - principal_amount) for closed loans
  totalPenaltiesCharged: number;
  collectionRate: number;       // percentage
}

// ─── Collection Report ───────────────────────────────────────────────────────

export interface CollectionReportRow {
  loanId: string;
  clientName: string;
  loanType: string;
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

// ─── Penalty Report ──────────────────────────────────────────────────────────

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
  penaltyType: string;
  amount: number;
  status: string;
  dateApplied: string;
  appliedBy: string;
  comment?: string;
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
