/* eslint-disable no-unused-vars */

// ========================================
// General
// ========================================
declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

// ========================================
// Auth
// ========================================
declare type SignUpParams = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

declare type signInProps = {
  email: string;
  password: string;
};

declare type getUserInfoProps = {
  userId: string;
};

// ========================================
// User
// ========================================
declare type User = {
  $id: string;
  email: string;
  userId: string;
  firstName: string;
  lastName: string;
  name: string;
  role?: string;
};

declare type NewUserParams = {
  userId: string;
  email: string;
  name: string;
  password: string;
};

// ========================================
// LMS Domain Types
// ========================================
declare type LoanStatus =
  | "Pending"
  | "Approved"
  | "Active"
  | "Overdue"
  | "Completed"
  | "Defaulted"
  | "Denied";

declare type InterestType = "Flat" | "Reducing";

declare type PaymentMethod = "Cash" | "Bank Transfer" | "Mobile Money";

declare type PenaltyType =
  | "Late Payment"
  | "Missed Installment"
  | "Daily Overdue Interest"
  | "Manual Administrative Charge"
  | "Restructuring Fee"
  | "Recovery Fee"
  | "Legal Fee"
  | "Custom Penalty";

declare type PenaltyStatus = "Active" | "Reversed";

declare type AuditAction =
  | "REPAYMENT_CREATED"
  | "REPAYMENT_REVERSED"
  | "PENALTY_ADDED"
  | "PENALTY_REVERSED"
  | "LOAN_APPROVED"
  | "LOAN_DENIED"
  | "LOAN_UPDATED"
  | "STATUS_CHANGED"
  | "STATEMENT_GENERATED"
  | "CLIENT_CREATED"
  | "CLIENT_UPDATED"
  | "CLIENT_DELETED";

declare type LMSClient = {
  $id: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  email?: string;
  phone: string;
  address?: string;
  totalBorrowed: number;
  outstandingBalance: number;
  profilePhotoUrl?: string;
  profilePhotoPath?: string;
  updatedAt?: string;
};

declare type Loan = {
  $id: string;
  $createdAt?: string;
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: InterestType;
  durationInMonths: number;
  startDate?: string;
  dueDate?: string;
  totalInterest: number;
  totalPayable: number;
  balance: number;
  status: LoanStatus;
  penaltyAccrued: number;
  loanType?: string;
  // Enriched fields
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;

  // Zero-Loss Risk & Business Growth Fields
  securities?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorId?: string;
  installmentAmount?: number;
  documentUrl?: string;
  createdBy?: string;
};

declare type Repayment = {
  $id: string;
  $createdAt?: string;
  loanId: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  date: string;
};

declare type Penalty = {
  $id: string;
  loanId: string;
  clientId: string;
  amount: number;
  penaltyType: PenaltyType;
  comment?: string;
  appliedBy: string;
  dateApplied: string;
  status: PenaltyStatus;
  reversedAt?: string;
  $createdAt: string;
};

declare type AuditLog = {
  $id: string;
  $createdAt?: string;
  loanId: string;
  entityType: string;
  action: AuditAction;
  performedBy: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  timestamp: string;
  $createdAt: string;
};

// ========================================
// Component Props
// ========================================
declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string | React.ReactNode;
  user?: string;
}

declare interface MobileNavProps {
  user: User;
}

declare interface FooterProps {
  user: User;
  type?: "mobile" | "desktop";
}

declare interface SiderbarProps {
  user: User;
}

declare interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

declare interface PaginationProps {
  page: number;
  totalPages: number;
}

declare interface RepaymentModalProps {
  loanId: string;
  maxAmount: number;
  onClose: () => void;
}

declare interface PenaltyModalProps {
  loanId: string;
  clientId: string;
  loanBalance: number;
  currentUser: User;
  onClose: () => void;
}

