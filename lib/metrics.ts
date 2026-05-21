"use server";

import { createSupabaseAdminClient } from "./supabase";

export interface ClientMetrics {
  totalBorrowed: number;
  totalOutstanding: number;
  totalExpectedDebt: number;
  totalRepaid: number;
  repaymentRate: number;
  activeLoansCount: number;
  healthStatus: string;
  healthMessage: string;
  healthColor: string;
  healthBg: string;
  healthIconBg: string;
  healthBarBg: string;
  healthBarContainer: string;
  lastPaymentDate: string | null;
  nextDueDate: string | null;
  maxDaysPastDue: number;
}

export async function calculateClientMetrics(clientId: string): Promise<ClientMetrics> {
  const supabase = createSupabaseAdminClient();

  const [loansRes, repaymentsRes, penaltiesRes, installmentsRes] = await Promise.all([
    supabase.from("loans").select("*").eq("client_id", clientId),
    supabase.from("loan_transactions").select("*").eq("client_id", clientId).eq("type", "Repayment").order("date", { ascending: false }),
    supabase.from("loan_transactions").select("*").eq("client_id", clientId).eq("type", "Manual Penalty"),
    supabase.from("loan_installments").select("*").eq("client_id", clientId).order("due_date", { ascending: true })
  ]);

  const loans = loansRes.data || [];
  const repayments = repaymentsRes.data || [];
  const penalties = penaltiesRes.data || [];
  const installments = installmentsRes.data || [];

  const activeLoans = loans.filter(l => ["Active", "Substandard", "Loss"].includes(l.status));
  const activeLoansCount = activeLoans.length;

  const totalBorrowed = loans.filter(l => l.status !== 'Denied' && l.status !== 'Pending').reduce((sum, l) => sum + (l.principal_amount || 0), 0);
  const totalRepaid = repayments.reduce((sum, r) => sum + (r.amount || 0), 0);
  
  const unpaidInstallments = installments.filter(i => i.status === "Pending" || i.status === "Overdue");
  const totalPenaltiesDebt = penalties.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Outstanding is calculated directly from the loans table which acts as the source of truth
  const totalOutstanding = activeLoans.reduce((sum, l) => sum + ((l.remaining_principal || 0) + (l.remaining_interest || 0) + (l.remaining_penalties || 0) + (l.remaining_fees || 0)), 0);
  const totalExpectedDebt = totalOutstanding;

  const totalExpectedToDate = installments.reduce((sum, i) => sum + (i.amount_due || 0), 0) + totalPenaltiesDebt;
  const repaymentRate = totalExpectedToDate > 0 ? Math.min(100, Math.round((totalRepaid / totalExpectedToDate) * 100)) : 100;

  // Next due date
  const pendingOrOverdue = unpaidInstallments.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  const nextDueDate = pendingOrOverdue.length > 0 ? pendingOrOverdue[0].due_date : null;
  const lastPaymentDate = repayments.length > 0 ? repayments[0].date : null;

  // Health Status
  const hasOverdue = installments.some(i => i.status === "Overdue");
  
  let healthStatus = "Good";
  let healthMessage = "Your repayment rate is excellent!";
  let healthColor = "text-emerald-600";
  let healthBg = "bg-emerald-200";
  let healthIconBg = "bg-emerald-50";
  let healthBarBg = "bg-emerald-500";
  let healthBarContainer = "bg-emerald-100";

  if (activeLoansCount === 0) {
    healthStatus = "No active loans";
    healthMessage = "You have no active loans.";
    healthColor = "text-gray-600";
    healthBg = "bg-gray-200";
    healthIconBg = "bg-gray-50";
    healthBarBg = "bg-gray-500";
    healthBarContainer = "bg-gray-100";
  } else if (hasOverdue) {
    healthStatus = 'Overdue';
    healthMessage = 'You have an overdue payment that needs immediate attention!';
    healthColor = 'text-red-600';
    healthBg = 'bg-red-200';
    healthIconBg = 'bg-red-50';
    healthBarBg = 'bg-red-500';
    healthBarContainer = 'bg-red-100';
  } else {
    if (repaymentRate >= 90) {
      healthStatus = 'Good';
      healthMessage = 'Your repayment rate is excellent!';
    } else if (repaymentRate >= 75) {
      healthStatus = 'On Track';
      healthMessage = 'You are on track with your repayments.';
      healthColor = 'text-blue-600';
      healthBg = 'bg-blue-200';
      healthIconBg = 'bg-blue-50';
      healthBarBg = 'bg-blue-500';
      healthBarContainer = 'bg-blue-100';
    } else if (repaymentRate >= 50) {
      healthStatus = 'Average';
      healthMessage = 'Your repayment rate is average.';
      healthColor = 'text-amber-600';
      healthBg = 'bg-amber-200';
      healthIconBg = 'bg-amber-50';
      healthBarBg = 'bg-amber-500';
      healthBarContainer = 'bg-amber-100';
    } else if (repaymentRate >= 20) {
      healthStatus = 'Needs Improvement';
      healthMessage = 'Your repayment rate needs improvement.';
      healthColor = 'text-orange-600';
      healthBg = 'bg-orange-200';
      healthIconBg = 'bg-orange-50';
      healthBarBg = 'bg-orange-500';
      healthBarContainer = 'bg-orange-100';
    } else {
      healthStatus = 'Bad';
      healthMessage = 'Your repayment rate is poor, please repay your loans in time!';
      healthColor = 'text-red-600';
      healthBg = 'bg-red-200';
      healthIconBg = 'bg-red-50';
      healthBarBg = 'bg-red-500';
      healthBarContainer = 'bg-red-100';
    }
  }

  const maxDaysPastDue = activeLoans.reduce((max, l) => Math.max(max, l.days_past_due || 0), 0);

  return {
    totalBorrowed,
    totalOutstanding,
    totalExpectedDebt,
    totalRepaid,
    repaymentRate,
    activeLoansCount,
    healthStatus,
    healthMessage,
    healthColor,
    healthBg,
    healthIconBg,
    healthBarBg,
    healthBarContainer,
    lastPaymentDate,
    nextDueDate,
    maxDaysPastDue
  };
}
