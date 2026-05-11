"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { InterestCalculator } from "../interest";
import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "./user.actions";
import { logAuditEvent } from "./audit.actions";

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
    penaltyAccrued: row.penalty_accrued ?? 0,
    loanType: row.loan_type,
    securities: row.securities,
    guarantorName: row.guarantor_name,
    guarantorPhone: row.guarantor_phone,
    guarantorId: row.guarantor_id,
    installmentAmount: row.installment_amount,
    documentUrl: row.document_url,
    createdBy: row.created_by,
    isHighRisk: row.is_high_risk ?? false,
    // enriched fields (populated by callers)
    clientName: row.clientName,
    clientEmail: row.clientEmail,
    clientPhone: row.clientPhone,
  };
}

/**
 * Auto-flag Active loans past their due_date → Overdue.
 * Single-query UPDATE — far more efficient than the old N+1 Appwrite approach.
 */
export const autoFlagOverdueLoans = async (specificLoanId?: string): Promise<number> => {
  try {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();

    let query = supabase
      .from("loans")
      .update({ status: "Overdue" })
      .eq("status", "Active")
      .lt("due_date", now)
      .select("id");

    if (specificLoanId) {
      query = (query as any).eq("id", specificLoanId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const count = data?.length ?? 0;
    return count;
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
        balance: Math.round(financialData.totalPayable * 100) / 100,
        installment_amount: installmentAmount,
        penalty_accrued: 0,
        start_date: startDate.toISOString(),
        due_date: dueDate.toISOString(),
        document_url: documentUrl ?? null,
        created_by: currentUser.$id,
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
        payload.balance = fin.totalPayable;
      }
    }

    // Map camelCase → snake_case for any explicitly passed fields
    if (loanData.status !== undefined) payload.status = loanData.status;
    if (loanData.principalAmount !== undefined) payload.principal_amount = loanData.principalAmount;
    if (loanData.interestRate !== undefined) payload.interest_rate = loanData.interestRate;
    if (loanData.durationInMonths !== undefined) payload.duration_in_months = loanData.durationInMonths;
    if (loanData.interestType !== undefined) payload.interest_type = loanData.interestType;
    if (loanData.balance !== undefined) payload.balance = loanData.balance;
    if (loanData.penaltyAccrued !== undefined) payload.penalty_accrued = loanData.penaltyAccrued;
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
