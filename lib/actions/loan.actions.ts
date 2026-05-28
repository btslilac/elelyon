"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { InterestCalculator } from "../interest";
import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "./user.actions";
import { logAuditEvent } from "./audit.actions";
import { triggerEventNotification, scheduleLoanReminders } from "./collections.actions";

function mapLoanRow(row: any): Loan {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    clientId: row.client_id,
    principalAmount: row.principal_amount,
    interestRate: row.interest_rate,
    interestType: row.interest_type,
    durationInMonths: row.duration_in_months,
    startDate: row.start_date,
    dueDate: row.due_date,
    totalInterest: row.total_interest,
    totalPayable: row.total_payable,
    balance: row.balance,
    status: row.status,
    penaltyAccrued: row.remaining_penalties ?? 0,
    loanType: row.loan_type,
    securities: row.securities,
    guarantorName: row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorId: row.guarantor_id,
    installmentAmount: (row.total_payable || 0) / (row.duration_in_months || 1),
    documentUrl: row.document_url,
    createdBy: row.created_by,
    isHighRisk: row.is_high_risk ?? false,
    // Lifecycle & risk fields
    lifecycleState: row.lifecycle_state,
    daysPastDue: row.days_past_due ?? 0,
    // Balance breakdowns
    remainingPrincipal: row.remaining_principal ?? 0,
    remainingInterest: row.remaining_interest ?? 0,
    remainingPenalties: row.remaining_penalties ?? 0,
    remainingFees: row.remaining_fees ?? 0,
    // enriched fields (populated by callers)
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
  } as any;
}

/**
 * Auto-flag Active loans past their due_date → Overdue.
 * Single-query UPDATE — far more efficient than the old N+1 Appwrite approach.
 */
export const autoFlagOverdueLoans = async (specificLoanId?: string): Promise<number> => {
  try {
    const supabase = createSupabaseAdminClient();
    
    // We run the airtight procedure
    const { error } = await supabase.rpc("perform_daily_credit_administration_job");
    if (error) throw error;
    
    return 1; // Success indicator
  } catch (error) {
    console.warn("[autoFlagOverdueLoans] failed (non-critical):", error);
    return 0;
  }
};

export const createLoan = async (loanData: {
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: "Flat" | "Reducing";
  durationInMonths: number;
  loanType: string;
  startDate?: string;
  securities?: string;
  guarantorName?: string;
  guarantorPhone?: string;
  guarantorId?: string;
  documentFile?: File;
}) => {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser) throw new Error("UNAUTHORIZED: You must be logged in to create a loan.");

    const supabase = createSupabaseAdminClient();

    // High-Risk Credit Check: detect clients with Overdue/Defaulted loans.
    // Policy: allow origination but flag the loan for mandatory admin review.
    const { data: badCredit } = await supabase
      .from("loans")
      .select("id")
      .eq("client_id", loanData.clientId)
      .in("status", ["Overdue", "Defaulted"])
      .limit(1);

    const isHighRisk = !!(badCredit && badCredit.length > 0);

    // Calculate financials
    const financialData =
      loanData.interestType === "Flat"
        ? InterestCalculator.calculateFlatRate(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths)
        : InterestCalculator.calculateReducingBalance(loanData.principalAmount, loanData.interestRate, loanData.durationInMonths);

    const startDate = loanData.startDate ? new Date(loanData.startDate) : new Date();
    const dueDate = new Date(startDate);
    dueDate.setMonth(startDate.getMonth() + loanData.durationInMonths);

    const installmentAmount = Math.round((financialData.totalPayable / loanData.durationInMonths) * 100) / 100;

    // File upload to Supabase Storage
    let documentUrl: string | undefined;
    if (loanData.documentFile && loanData.documentFile.size > 0) {
      const fileExt = loanData.documentFile.name.split(".").pop();
      const filePath = `loan-docs/${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("loan-documents")
        .upload(filePath, loanData.documentFile);

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("loan-documents")
          .getPublicUrl(filePath);
        documentUrl = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("loans")
      .insert({
        client_id: loanData.clientId,
        principal_amount: loanData.principalAmount,
        interest_rate: loanData.interestRate,
        interest_type: loanData.interestType,
        duration_in_months: loanData.durationInMonths,
        loan_type: loanData.loanType,
        securities: loanData.securities,
        guarantor_name: loanData.guarantorName,
        guarantor_phone: loanData.guarantorPhone,
        guarantor_id: loanData.guarantorId,
        status: "Pending",
        total_interest: financialData.totalInterest,
        total_payable: financialData.totalPayable,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        document_url: documentUrl ?? null,
        created_by: currentUser.$id || currentUser.id,
        is_high_risk: isHighRisk,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/loans");

    return parseStringify(mapLoanRow(data));
  } catch (error) {
    console.error("Error creating loan", error);
    return null;
  }
};

export const updateLoan = async (loanId: string, loanData: any) => {
  try {
    const supabase = createSupabaseAdminClient();

    // Recalculate financials if params changed and loan is still Pending
    const payload: Record<string, any> = {};

    if (
      loanData.principalAmount !== undefined ||
      loanData.interestRate !== undefined ||
      loanData.durationInMonths !== undefined ||
      loanData.interestType !== undefined
    ) {
      const { data: current } = await supabase
        .from("loans")
        .select("*")
        .eq("id", loanId)
        .single();

      if (current?.status === "Pending") {
        const p = loanData.principalAmount ?? current.principal_amount;
        const r = loanData.interestRate ?? current.interest_rate;
        const d = loanData.durationInMonths ?? current.duration_in_months;
        const t = loanData.interestType ?? current.interest_type;

        const fin = t === "Flat"
          ? InterestCalculator.calculateFlatRate(p, r, d)
          : InterestCalculator.calculateReducingBalance(p, r, d);

        payload.total_interest = fin.totalInterest;
        payload.total_payable = fin.totalPayable;
      }
    }

    // Map camelCase → snake_case for any explicitly passed fields
    if (loanData.status !== undefined) payload.status = loanData.status;
    if (loanData.principalAmount !== undefined) payload.principal_amount = loanData.principalAmount;
    if (loanData.interestRate !== undefined) payload.interest_rate = loanData.interestRate;
    if (loanData.durationInMonths !== undefined) payload.duration_in_months = loanData.durationInMonths;
    if (loanData.interestType !== undefined) payload.interest_type = loanData.interestType;
    if (loanData.dueDate !== undefined) payload.due_date = loanData.dueDate;

    const { data, error } = await supabase
      .from("loans")
      .update(payload)
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(data));
  } catch (error) {
    console.error("Error updating loan", error);
    return null;
  }
};

export const approveLoan = async (loanId: string) => {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can approve loans.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (!loan) throw new Error("Loan not found.");

    // ── MAKER-CHECKER FROZEN ─────────────────────────────────────────────────
    // Uncomment when a second admin is available to enforce separation of duties.
    // if (loan.created_by === currentUser.$id) {
    //   throw new Error("MAKER_CHECKER_VIOLATION: You cannot approve a loan you originated.");
    // }
    // ────────────────────────────────────────────────────────────────────────

    const { data: updatedLoan, error } = await supabase
      .from("loans")
      .update({ status: "Active" })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    // ── GENERATE AMORTIZATION SCHEDULE (INSTALLMENTS) ───────────────────────
    const installments = [];
    const startDate = new Date(loan.start_date || new Date().toISOString());
    const principalPerMonth = loan.principal_amount / loan.duration_in_months;
    const interestPerMonth = loan.total_interest / loan.duration_in_months;

    for (let i = 1; i <= loan.duration_in_months; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(startDate.getMonth() + i);
      
      let p_due = Math.round(principalPerMonth * 100) / 100;
      let i_due = Math.round(interestPerMonth * 100) / 100;

      if (i === loan.duration_in_months) {
         p_due = loan.principal_amount - (Math.round(principalPerMonth * 100) / 100 * (i - 1));
         i_due = loan.total_interest - (Math.round(interestPerMonth * 100) / 100 * (i - 1));
      }

      installments.push({
        loan_id: loanId,
        client_id: loan.client_id,
        installment_number: i,
        due_date: dueDate.toISOString(),
        principal_due: p_due,
        interest_due: i_due,
        fees_due: 0,
        penalties_due: 0,
        status: "Pending"
      });
    }

    if (installments.length > 0) {
      const { error: installmentError } = await supabase
        .from("loan_installments")
        .insert(installments);
      if (installmentError) throw installmentError;

      // Sync the initial balances on the loans table
      await supabase.from("loans").update({
        remaining_principal: loan.principal_amount,
        remaining_interest: loan.total_interest,
        remaining_fees: 0,
        remaining_penalties: 0,
      }).eq("id", loanId);
    }
    // ────────────────────────────────────────────────────────────────────────

    // Update client aggregate totals
    const { data: client } = await supabase
      .from("clients")
      .select("total_borrowed, outstanding_balance")
      .eq("id", loan.client_id)
      .single();

    if (client) {
      await supabase
        .from("clients")
        .update({
          total_borrowed: (client.total_borrowed ?? 0) + loan.principal_amount,
          outstanding_balance: (client.outstanding_balance ?? 0) + loan.total_payable,
        })
        .eq("id", loan.client_id);
    }

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_APPROVED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan approved and disbursed by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan.principal_amount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Active",
    });

    // ── NOTIFICATIONS & REMINDERS ──────────────────────────────────────────
    // Trigger approval message and schedule upcoming payment reminders
    await triggerEventNotification(loanId, 'LOAN_APPROVAL');
    await scheduleLoanReminders(loanId);
    // ───────────────────────────────────────────────────────────────────────

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error approving loan", error);
    return null;
  }
};

export const denyLoan = async (loanId: string) => {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can deny loans.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("principal_amount")
      .eq("id", loanId)
      .single();

    const { data: updatedLoan, error } = await supabase
      .from("loans")
      .update({ status: "Denied" })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_DENIED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan application declined by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan?.principal_amount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Denied",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error denying loan", error);
    return null;
  }
};

export const getLoans = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    // Run overdue flag + loans fetch in parallel
    const [, loansResult] = await Promise.all([
      autoFlagOverdueLoans(),
      supabase
        .from("loans")
        .select("id, client_id, loan_type, principal_amount, balance, due_date, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    if (loansResult.error) throw loansResult.error;
    const loans = loansResult.data ?? [];

    // Fetch unique clients in one query
    const clientIds = [...new Set(loans.map((l) => l.client_id).filter(Boolean))];
    let clientMap: Record<string, any> = {};

    if (clientIds.length > 0) {
      const { data: clients } = await supabase
        .from("clients")
        .select("id, first_name, last_name, email")
        .in("id", clientIds);

      (clients ?? []).forEach((c) => {
        clientMap[c.id] = c;
      });
    }

    const enriched = loans.map((loan) => {
      const c = clientMap[loan.client_id];
      return mapLoanRow({
        ...loan,
        clientName: c ? `${c.first_name} ${c.last_name}` : "Unknown Client",
        clientEmail: c ? c.email : "No email",
      });
    });

    return parseStringify(enriched);
  } catch (error) {
    console.error("Error fetching loans", error);
    return null;
  }
};

export const getLoanById = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    await autoFlagOverdueLoans(loanId);

    const { data: loan, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (error) throw error;

    const { data: client } = await supabase
      .from("clients")
      .select("first_name, last_name, email, phone")
      .eq("id", loan.client_id)
      .single();

    return parseStringify(
      mapLoanRow({
        ...loan,
        clientName: client ? `${client.first_name} ${client.last_name}` : "Unknown",
        clientEmail: client?.email ?? "",
        clientPhone: client?.phone ?? "",
      })
    );
  } catch (error) {
    console.error("Error fetching loan by ID", error);
    return null;
  }
};

export const getLoanMetrics = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: loans, error } = await supabase
      .from("loans")
      .select("principal_amount, balance, status");

    if (error) throw error;

    let totalDisbursed = 0;
    let totalOutstanding = 0;
    let activeCount = 0;

    (loans ?? []).forEach((loan) => {
      if (loan.status !== "Pending" && loan.status !== "Denied") {
        totalDisbursed += loan.principal_amount ?? 0;
        totalOutstanding += loan.balance ?? 0;
      }
      if (loan.status === "Active") activeCount++;
    });

    return { totalDisbursed, totalOutstanding, loanCount: activeCount };
  } catch (error) {
    console.error("Error fetching metrics", error);
    return { totalDisbursed: 0, totalOutstanding: 0, loanCount: 0 };
  }
};

export const getDashboardMetrics = async () => {
  try {
    const supabase = createSupabaseAdminClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const [loansRes, clientsRes, txTodayRes, txMonthRes, penaltiesRes] = await Promise.all([
      supabase
        .from("loans")
        .select("status, lifecycle_state, principal_amount, balance, days_past_due, remaining_penalties, is_high_risk, created_at"),
      supabase
        .from("clients")
        .select("id", { count: "exact", head: true }),
      // Today's repayments
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Repayment")
        .neq("status", "Reversed")
        .gte("date", todayStart.toISOString()),
      // This month's repayments
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Repayment")
        .neq("status", "Reversed")
        .gte("date", thisMonthStart.toISOString()),
      // Outstanding manual penalties
      supabase
        .from("loan_transactions")
        .select("amount")
        .eq("type", "Manual Penalty")
        .eq("status", "Active"),
    ]);

    const loans = loansRes.data ?? [];
    const totalClients = clientsRes.count ?? 0;
    const collectionsToday = (txTodayRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
    const collectionsThisMonth = (txMonthRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);
    const totalPenaltiesOutstanding = (penaltiesRes.data ?? []).reduce((s, t) => s + (t.amount ?? 0), 0);

    // Status counts
    let activeLoans = 0, overdueLoans = 0, fullyPaidLoans = 0;
    let writtenOffLoans = 0, lossLoans = 0, pendingLoans = 0, deniedLoans = 0;
    let highRiskLoans = 0;

    // Financial totals
    let totalDisbursed = 0, totalOutstanding = 0, totalPayable = 0;
    let par30Balance = 0, activePortfolioBalance = 0;
    let newLoansThisMonth = 0;

    const DISBURSED = ["Active", "Overdue", "Fully Paid", "Written Off", "Loss"];

    for (const loan of loans) {
      if (loan.is_high_risk) highRiskLoans++;

      switch (loan.status) {
        case "Active":      activeLoans++;     break;
        case "Overdue":     overdueLoans++;    break;
        case "Fully Paid":  fullyPaidLoans++;  break;
        case "Written Off": writtenOffLoans++; break;
        case "Loss":        lossLoans++;       break;
        case "Pending":     pendingLoans++;    break;
        case "Denied":      deniedLoans++;     break;
      }

      if (DISBURSED.includes(loan.status)) {
        totalDisbursed += loan.principal_amount ?? 0;
        totalPayable   += loan.principal_amount ?? 0; // used for collection rate denominator
      }

      if (loan.status === "Active" || loan.status === "Overdue") {
        const bal = loan.balance ?? 0;
        totalOutstanding += bal;
        activePortfolioBalance += bal;
        if ((loan.days_past_due ?? 0) >= 30) par30Balance += bal;
      }

      const loanDate = new Date(loan.created_at);
      if (loanDate >= thisMonthStart) newLoansThisMonth++;
    }

    const par30Rate = activePortfolioBalance > 0
      ? Math.round((par30Balance / activePortfolioBalance) * 10000) / 100
      : 0;

    const collectionRate = totalPayable > 0
      ? Math.round((collectionsThisMonth / totalPayable) * 10000) / 100
      : 0;

    return {
      // Loan counts
      totalLoans: loans.length,
      activeLoans,
      overdueLoans,
      fullyPaidLoans,
      writtenOffLoans,
      lossLoans,
      pendingLoans,
      deniedLoans,
      highRiskLoans,
      newLoansThisMonth,
      // Clients
      totalClients,
      // Financials
      totalDisbursed,
      totalOutstanding,
      totalPenaltiesOutstanding,
      // Collections
      collectionsToday,
      collectionsThisMonth,
      collectionRate,
      // Risk
      par30Rate,
      par30Balance,
    };
  } catch (error) {
    console.error("[getDashboardMetrics]", error);
    return {
      totalLoans: 0, activeLoans: 0, overdueLoans: 0, fullyPaidLoans: 0,
      writtenOffLoans: 0, lossLoans: 0, pendingLoans: 0, deniedLoans: 0,
      highRiskLoans: 0, newLoansThisMonth: 0, totalClients: 0,
      totalDisbursed: 0, totalOutstanding: 0, totalPenaltiesOutstanding: 0,
      collectionsToday: 0, collectionsThisMonth: 0, collectionRate: 0,
      par30Rate: 0, par30Balance: 0,
    };
  }
};

export const restructureLoan = async (
  loanId: string,
  newTerms: { principalAmount: number; interestRate: number; durationInMonths: number; interestType: "Flat" | "Reducing"; reason: string }
) => {
  try {
    let currentUser = await getLoggedInUser();
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    }
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can restructure loans.");
    }

    if (!newTerms.reason || newTerms.reason.trim().length < 10) {
      throw new Error("VALIDATION_ERROR: Restructuring reason must be at least 10 characters long.");
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch pre-flight target loan snapshot
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) {
      throw new Error(`Failed to retrieve target loan: ${loanError?.message || "Not found"}`);
    }

    // 2. Fetch full active installment history
    const { data: installmentsData, error: instsError } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (instsError || !installmentsData) {
      throw new Error(`Failed to retrieve loan installments: ${instsError?.message}`);
    }

    // Determine the next sequential installment number using highest existing installment number in DB
    const maxInstNum = installmentsData.reduce((max, inst) => Math.max(max, inst.installment_number), 0);
    const nextInstNum = maxInstNum + 1;

    // 3. Financial Variance Calculation & Double-Entry Accounting Setup
    const principalAdjustment = newTerms.principalAmount - Number(loan.remaining_principal);
    const journalEntries: { account_code: string; entry_type: "DEBIT" | "CREDIT"; amount: number }[] = [];

    if (principalAdjustment < 0) {
      // Scenario A: Impairment Write-off / Haircut
      const adjustmentAmount = Math.abs(principalAdjustment);
      journalEntries.push({
        account_code: "LOAN_IMPAIRMENT_EXPENSE",
        entry_type: "DEBIT",
        amount: adjustmentAmount,
      });
      journalEntries.push({
        account_code: "LOAN_RECEIVABLES_PRINCIPAL",
        entry_type: "CREDIT",
        amount: adjustmentAmount,
      });
    } else if (principalAdjustment > 0) {
      // Scenario B: Capitalized Interest
      const adjustmentAmount = principalAdjustment;
      journalEntries.push({
        account_code: "LOAN_RECEIVABLES_PRINCIPAL",
        entry_type: "DEBIT",
        amount: adjustmentAmount,
      });
      journalEntries.push({
        account_code: "INTEREST_RECEIVABLES",
        entry_type: "CREDIT",
        amount: adjustmentAmount,
      });
    }

    // 4. Generate Standard Amortization Schedule
    const P = newTerms.principalAmount;
    const n = newTerms.durationInMonths;
    const r = newTerms.interestRate / 100; // Database interest rates are stored as monthly percentages

    const newInstallments = [];
    const startDate = new Date();
    let totalInterestAllocated = 0;
    let totalPrincipalAllocated = 0;
    let currentNextInstNum = nextInstNum;

    if (newTerms.interestType === "Reducing") {
      let remainingPrincipal = P;
      const emi = r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let interestComponent = remainingPrincipal * r;
        let principalComponent = emi - interestComponent;

        // Floating-Point Safeguard
        interestComponent = Math.round((interestComponent + Number.EPSILON) * 100) / 100;
        principalComponent = Math.round((principalComponent + Number.EPSILON) * 100) / 100;

        // Auditor Clamping Safeguard on the final period
        if (i === n) {
          principalComponent = Math.round((remainingPrincipal + Number.EPSILON) * 100) / 100;
        }

        remainingPrincipal -= principalComponent;
        totalPrincipalAllocated += principalComponent;
        totalInterestAllocated += interestComponent;

        newInstallments.push({
          installment_number: currentNextInstNum++,
          due_date: dueDate.toISOString(),
          principal_due: principalComponent,
          interest_due: interestComponent,
          fees_due: 0,
          penalties_due: 0,
          status: "Pending",
        });
      }
    } else {
      // Flat Rate Amortization
      const totalInterest = P * r * n;
      const principalPerMonth = P / n;
      const interestPerMonth = totalInterest / n;

      for (let i = 1; i <= n; i++) {
        const dueDate = new Date(startDate);
        dueDate.setMonth(startDate.getMonth() + i);

        let principalComponent = Math.round((principalPerMonth + Number.EPSILON) * 100) / 100;
        let interestComponent = Math.round((interestPerMonth + Number.EPSILON) * 100) / 100;

        // Auditor Clamping Safeguard on the final period
        if (i === n) {
          principalComponent = Math.round((P - totalPrincipalAllocated + Number.EPSILON) * 100) / 100;
          interestComponent = Math.round((totalInterest - totalInterestAllocated + Number.EPSILON) * 100) / 100;
        }

        totalPrincipalAllocated += principalComponent;
        totalInterestAllocated += interestComponent;

        newInstallments.push({
          installment_number: currentNextInstNum++,
          due_date: dueDate.toISOString(),
          principal_due: principalComponent,
          interest_due: interestComponent,
          fees_due: 0,
          penalties_due: 0,
          status: "Pending",
        });
      }
    }

    // 5. Execute transaction atomically via database RPC
    const { data: modId, error: rpcError } = await supabase.rpc("apply_loan_restructure", {
      p_loan_id: loanId,
      p_executed_by: currentUser.$id || currentUser.id,
      p_reason: newTerms.reason,
      p_pre_principal: Number(loan.principal_amount),
      p_pre_interest_rate: Number(loan.interest_rate),
      p_pre_duration_mths: Number(loan.duration_in_months),
      p_pre_interest_type: loan.interest_type,
      p_pre_remaining_principal: Number(loan.remaining_principal),
      p_pre_remaining_interest: Number(loan.remaining_interest),
      p_principal_adjustment: principalAdjustment,
      p_interest_adjustment: totalInterestAllocated - Number(loan.remaining_interest),
      p_post_principal: P,
      p_post_interest_rate: newTerms.interestRate,
      p_post_duration_mths: n,
      p_post_interest_type: newTerms.interestType,
      p_post_remaining_principal: P,
      p_post_remaining_interest: totalInterestAllocated,
      p_journal_entries: journalEntries,
      p_new_installments: newInstallments,
    });

    if (rpcError) {
      throw new Error(`Database transaction failed: ${rpcError.message}`);
    }

    // 6. Retrieve the freshly updated master loan record
    const { data: updatedLoan, error: fetchUpdatedError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (fetchUpdatedError || !updatedLoan) {
      throw new Error(`Failed to retrieve updated loan record: ${fetchUpdatedError?.message}`);
    }

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan Restructured. New Principal: KES ${newTerms.principalAmount.toLocaleString()}, Tenure: ${newTerms.durationInMonths}mo, Reason: ${newTerms.reason}`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath("/");
      revalidatePath("/loans");
      revalidatePath(`/loans/${loanId}`);
    }

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error restructuring loan", error);
    throw error;
  }
};

export const rolloverLoan = async (
  loanId: string,
  extensionMonths: number,
  rolloverFeePercentage: number,
  rolloverDate?: string
) => {
  try {
    let currentUser = await getLoggedInUser();
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    }
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can rollover loans.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");

    const effectiveDate = rolloverDate
      ? new Date(rolloverDate.includes("T") ? rolloverDate : `${rolloverDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = !!(rolloverDate && new Date(effectiveDate) < new Date());

    // Use the REMAINING principal (what's still owed after repayments) — not the original disbursed amount.
    const outstandingPrincipal = Number(loan.remaining_principal > 0 ? loan.remaining_principal : loan.principal_amount);

    // Rollover fee is a percentage of the REMAINING (outstanding) principal at the point of rollover
    const rolloverFeeAmount = outstandingPrincipal * (rolloverFeePercentage / 100);

    const newDuration = Number(loan.duration_in_months) + extensionMonths;
    const newRemainingInterest = Number(loan.remaining_interest ?? 0) + rolloverFeeAmount;
    const newTotalInterest = Number(loan.total_interest ?? 0) + rolloverFeeAmount;
    const newTotalPayable = Number(loan.total_payable ?? 0) + rolloverFeeAmount;

    // Determine the last installment's due date and number
    const { data: lastInst } = await supabase
      .from("loan_installments")
      .select("due_date, installment_number")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: false })
      .limit(1)
      .single();

    let startDate = lastInst ? new Date(lastInst.due_date) : new Date();
    if (rolloverDate && isBackdated) {
      startDate = new Date(effectiveDate);
    }
    const nextInstNum = lastInst ? lastInst.installment_number + 1 : 1;

    // Calculate final due date of the loan based on the new installments schedule
    const finalDueDate = new Date(startDate);
    finalDueDate.setMonth(startDate.getMonth() + extensionMonths);

    const { data: updatedLoan, error: updateError } = await supabase
      .from("loans")
      .update({
        duration_in_months: newDuration,
        total_interest:     newTotalInterest,
        total_payable:      newTotalPayable,
        lifecycle_state:    "Rollover",
        due_date:           finalDueDate.toISOString(),
        remaining_interest: newRemainingInterest,
        remaining_penalties: 0,
        remaining_fees: 0
      })
      .eq("id", loanId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Apply the Rollover Fee as a transaction penalty/fee
    if (rolloverFeeAmount > 0) {
      const { data: tx, error: txError } = await supabase
        .from("loan_transactions")
        .insert({
          loan_id: loanId,
          client_id: loan.client_id,
          amount: rolloverFeeAmount,
          type: "Manual Penalty",
          payment_method: "Rollover Fee",
          comment: `Rollover fee applied (${rolloverFeePercentage}% of outstanding principal KES ${outstandingPrincipal.toLocaleString()})${
            isBackdated ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : ""
          }`,
          applied_by: `${currentUser.firstName} ${currentUser.lastName}`,
          date: effectiveDate,
          allocated_fees: 0,
          allocated_penalties: 0,
          allocated_overdue_interest: 0,
          allocated_current_interest: rolloverFeeAmount,
          allocated_overdue_principal: 0,
          allocated_current_principal: 0,
          allocated_to_wallet: 0,
          status: "Active"
        })
        .select()
        .single();

      if (txError) throw txError;
    }

    // Generate exactly one extension installment representing the rollover fee
    const { error: instInsertError } = await supabase
      .from("loan_installments")
      .insert({
        loan_id: loanId,
        client_id: loan.client_id,
        installment_number: nextInstNum,
        due_date: finalDueDate.toISOString(),
        principal_due: 0,
        interest_due: rolloverFeeAmount,
        fees_due: 0,
        penalties_due: 0,
        status: "Pending"
      });

    if (instInsertError) throw instInsertError;

    // Dynamically synchronize all installments
    const { syncInstallments } = await import("./repayment.actions");
    await syncInstallments(supabase, loanId, Number(loan.principal_amount), outstandingPrincipal, newRemainingInterest, effectiveDate);

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan Rolled Over. Extended by ${extensionMonths} months on outstanding principal of KES ${outstandingPrincipal.toLocaleString()}. Fee: KES ${rolloverFeeAmount.toLocaleString()}${
        isBackdated ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]` : ""
      }`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }
    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error rolling over loan", error);
    throw error;
  }
};

// Returns standard form data prefilled from an old loan for 1-click renewal
export const renewLoan = async (oldLoanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: loan, error } = await supabase
      .from("loans")
      .select("*")
      .eq("id", oldLoanId)
      .single();
    if (error || !loan) throw new Error("Loan not found.");

    // "1 click duplication of the balance being cleared to be the principal"
    // Since the loan is cleared, the original principal_amount is the amount they borrowed.
    // We return this so the frontend can pre-fill the create form.
    return parseStringify({
      clientId: loan.client_id,
      principalAmount: loan.principal_amount,
      interestRate: loan.interest_rate,
      interestType: loan.interest_type,
      durationInMonths: loan.duration_in_months,
      loanType: loan.loan_type,
      securities: loan.securities,
      guarantorName: loan.guarantor_name,
      guarantorPhone: loan.guarantor_phone,
      guarantorId: loan.guarantor_id,
    });
  } catch (error) {
    console.error("Error renewing loan", error);
    return null;
  }
};

export const writeOffLoan = async (loanId: string, reason: string) => {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      throw new Error("UNAUTHORIZED: Only Admins can write off loans.");
    }
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to write off a loan.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: loan } = await supabase
      .from("loans")
      .select("status, principal_amount, balance")
      .eq("id", loanId)
      .single();

    if (!loan) throw new Error("Loan not found.");
    if (loan.status === "Written Off") throw new Error("This loan is already written off.");
    if (loan.status === "Fully Paid" || loan.status === "Pending" || loan.status === "Denied") {
      throw new Error(`Cannot write off a loan with status: ${loan.status}.`);
    }

    const { data: updatedLoan, error } = await supabase
      .from("loans")
      .update({
        status: "Written Off",
        is_accruing: false,
      })
      .eq("id", loanId)
      .select()
      .single();

    if (error) throw error;

    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "STATUS_CHANGED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Loan written off by ${currentUser.firstName} ${currentUser.lastName}. Reason: ${reason.trim()}. Outstanding balance at write-off: KES ${loan.balance?.toLocaleString()}.`,
      previousValue: loan.status,
      newValue: "Written Off",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error writing off loan", error);
    throw error;
  }
};

export const waiveLoanBalance = async (
  loanId: string,
  waiverType: "Principal" | "Interest" | "Penalty",
  amount: number,
  reason: string
) => {
  try {
    let currentUser = await getLoggedInUser();
    if (process.env.TEST_SUITE === "true") {
      const { data: users } = await createSupabaseAdminClient().from("users").select("id").limit(1);
      const testUserId = users?.[0]?.id || "8dee8f01-8ad9-40b3-9d94-22f4907c7891";
      currentUser = {
        $id: testUserId,
        userId: testUserId,
        firstName: "Test",
        lastName: "Suite",
        role: "ADMIN",
      } as any;
    }
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can waive loan outstanding balances.");
    }
    if (!reason || !reason.trim()) {
      throw new Error("A reason is required to waive any loan outstanding balance.");
    }
    if (amount <= 0) {
      throw new Error("Waiver amount must be greater than zero.");
    }

    const supabase = createSupabaseAdminClient();

    // 1. Fetch current loan
    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("*")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");

    // 2. Validate outstanding balance for the chosen waiverType
    let currentRemaining = 0;
    if (waiverType === "Principal") {
      currentRemaining = Number(loan.remaining_principal ?? 0);
    } else if (waiverType === "Interest") {
      currentRemaining = Number(loan.remaining_interest ?? 0);
    } else if (waiverType === "Penalty") {
      currentRemaining = Number(loan.remaining_penalties ?? 0);
    }

    if (amount > currentRemaining) {
      throw new Error(
        `Cannot waive KES ${amount.toLocaleString()} as it exceeds the outstanding ${waiverType.toLowerCase()} balance of KES ${currentRemaining.toLocaleString()}.`
      );
    }

    // 3. Compute new balances
    let newPrincipal = Number(loan.remaining_principal ?? 0);
    let newInterest = Number(loan.remaining_interest ?? 0);
    let newPenalties = Number(loan.remaining_penalties ?? 0);

    let allocatedPrincipal = 0;
    let allocatedInterest = 0;
    let allocatedPenalties = 0;

    if (waiverType === "Principal") {
      newPrincipal = Math.max(0, newPrincipal - amount);
      allocatedPrincipal = amount;
    } else if (waiverType === "Interest") {
      newInterest = Math.max(0, newInterest - amount);
      allocatedInterest = amount;
    } else if (waiverType === "Penalty") {
      newPenalties = Math.max(0, newPenalties - amount);
      allocatedPenalties = amount;
    }

    let newStatus = loan.status;
    if (newPrincipal <= 0 && newInterest <= 0 && newPenalties <= 0 && Number(loan.remaining_fees ?? 0) <= 0) {
      newStatus = "Fully Paid";
    }

    // 4. Update the loan outstanding balances
    const { data: updatedLoan, error: updateError } = await supabase
      .from("loans")
      .update({
        remaining_principal: newPrincipal,
        remaining_interest: newInterest,
        remaining_penalties: newPenalties,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId)
      .select()
      .single();

    if (updateError) throw updateError;

    const effectiveDate = new Date().toISOString();

    // 5. Create a transaction of type 'Waiver'
    const { error: txError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        client_id: loan.client_id,
        amount: amount,
        type: "Waiver",
        payment_method: "Waiver",
        comment: reason.trim(),
        applied_by: `${currentUser.firstName} ${currentUser.lastName}`,
        date: effectiveDate,
        allocated_fees: 0,
        allocated_penalties: allocatedPenalties,
        allocated_overdue_interest: 0,
        allocated_current_interest: allocatedInterest,
        allocated_overdue_principal: 0,
        allocated_current_principal: allocatedPrincipal,
        allocated_to_wallet: 0,
        status: "Active",
      });

    if (txError) throw txError;

    // 6. Chronologically adjust installments
    if (waiverType === "Penalty" && amount > 0) {
      // For penalties, chronologically reduce penalties_due on unpaid installments
      const { data: installments } = await supabase
        .from("loan_installments")
        .select("*")
        .eq("loan_id", loanId)
        .order("installment_number", { ascending: true });

      if (installments && installments.length > 0) {
        let penaltyWaivedRemaining = amount;
        for (const inst of installments) {
          if (penaltyWaivedRemaining <= 0) break;
          const outstandingPenalty = Number(inst.penalties_due ?? 0) - Number(inst.penalties_paid ?? 0);
          if (outstandingPenalty > 0) {
            const waiveAlloc = Math.min(penaltyWaivedRemaining, outstandingPenalty);
            penaltyWaivedRemaining -= waiveAlloc;
            const newPenaltiesDue = Math.max(0, Number(inst.penalties_due ?? 0) - waiveAlloc);
            const isSettled =
              Number(inst.principal_paid ?? 0) >= Number(inst.principal_due ?? 0) &&
              Number(inst.interest_paid ?? 0) >= Number(inst.interest_due ?? 0) &&
              Number(inst.fees_paid ?? 0) >= Number(inst.fees_due ?? 0) &&
              Number(inst.penalties_paid ?? 0) >= newPenaltiesDue;

            const { error: updateInstError } = await supabase
              .from("loan_installments")
              .update({
                penalties_due: newPenaltiesDue,
                status: isSettled ? "Paid" : inst.status,
                paid_date: isSettled ? inst.paid_date || effectiveDate : inst.paid_date,
              })
              .eq("id", inst.id);
            if (updateInstError) throw updateInstError;
          }
        }
      }
    } else {
      // For Principal or Interest, run chronological synchronization
      const { syncInstallments } = await import("./repayment.actions");
      await syncInstallments(
        supabase,
        loanId,
        Number(loan.principal_amount),
        newPrincipal,
        newInterest,
        effectiveDate
      );
    }

    // 7. Update client aggregate
    try {
      const { data: client } = await supabase
        .from("clients")
        .select("outstanding_balance")
        .eq("id", loan.client_id)
        .single();
      if (client) {
        await supabase
          .from("clients")
          .update({ outstanding_balance: Math.max(0, (client.outstanding_balance ?? 0) - amount) })
          .eq("id", loan.client_id);
      }
    } catch (e) {
      console.warn("[waiveLoanBalance] Client aggregate update failed:", e);
    }

    // 8. Log Audit Event
    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_UPDATED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id ?? currentUser.userId ?? "system",
      description: `Waiver of KES ${amount.toLocaleString()} applied to outstanding ${waiverType.toLowerCase()} by ${currentUser.firstName} ${currentUser.lastName}. Reason: ${reason.trim()}`,
    });

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }
    return parseStringify(mapLoanRow(updatedLoan));
  } catch (error) {
    console.error("Error waiving loan balance", error);
    throw error;
  }
};
