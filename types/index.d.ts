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
  | "Defaulted";

declare type InterestType = "Flat" | "Reducing";

declare type PaymentMethod = "Cash" | "Bank Transfer" | "Mobile Money";

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
};

declare type Loan = {
  $id: string;
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
};

declare type Repayment = {
  $id: string;
  loanId: string;
  clientId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceId?: string;
  date: string;
};

// ========================================
// Component Props
// ========================================
declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
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
