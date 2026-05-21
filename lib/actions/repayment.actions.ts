"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit.actions";
import { getLoggedInUser } from "./user.actions";

// ─── Retry helper ────────────────────────────────────────────────────────────
async function withRetry<T>(fn: () => PromiseLike<T>, maxAttempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isTimeout =
        err?.cause?.code === "ETIMEDOUT" ||
        err?.message?.includes("ETIMEDOUT") ||
        err?.message?.includes("fetch failed");
      if (!isTimeout || attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  throw lastError;
}

function friendlyError(err: unknown): string {
  const msg = (err as any)?.message || String(err);
  if (msg.includes("ETIMEDOUT") || msg.includes("fetch failed") || msg.includes("AggregateError")) {
    return "Connection timed out. Please check your internet connection and try again.";
  }
  return msg || "An unexpected error occurred.";
}

function mapRepaymentRow(row: any): Repayment {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    paymentMethod: row.payment_method,
    referenceId: row.reference_id,
    date: row.date,
  };
}

// ─── syncInstallments ─────────────────────────────────────────────────────────
export const syncInstallments = async (
  supabase: any,
  loanId: string,
  originalPrincipal: number,
  remainingPrincipal: number,
  remainingInterest: number,
  effectiveDate: string
) => {
  // Fetch all installments
  const { data: installments, error: instError } = await supabase
    .from("loan_installments")
    .select("*")
    .eq("loan_id", loanId)
    .order("installment_number", { ascending: true });

  if (instError || !installments) {
    console.error("Failed to fetch installments for sync", instError);
    return;
  }

  // Calculate total interest due across all installments
  const totalInterestDue = installments.reduce((sum: number, inst: any) => sum + Number(inst.interest_due || 0), 0);

  // Interest paid pool
  let interestPaidPool = Math.max(0, totalInterestDue - remainingInterest);

  // Principal paid pool
  let principalPaidPool = Math.max(0, originalPrincipal - remainingPrincipal);

  // Sequentially allocate paid interest and principal to installments in order
  for (const inst of installments) {
    const instInterestDue = Number(inst.interest_due || 0);
    const instPrincipalDue = Number(inst.principal_due || 0);

    const instInterestPaid = Math.min(interestPaidPool, instInterestDue);
    interestPaidPool -= instInterestPaid;

    const instPrincipalPaid = Math.min(principalPaidPool, instPrincipalDue);
    principalPaidPool -= instPrincipalPaid;

    // Preserve existing fees and penalties paid amounts
    const instFeesPaid = Number(inst.fees_paid || 0);
    const instPenaltiesPaid = Number(inst.penalties_paid || 0);

    const isSettled = 
      (instPrincipalPaid >= instPrincipalDue) && 
      (instInterestPaid >= instInterestDue) &&
      (instFeesPaid >= Number(inst.fees_due || 0)) &&
      (instPenaltiesPaid >= Number(inst.penalties_due || 0));
    const newStatus = isSettled 
      ? "Paid" 
      : (new Date(inst.due_date) < new Date() ? "Overdue" : "Pending");

    await supabase
      .from("loan_installments")
      .update({
        interest_paid: instInterestPaid,
        principal_paid: instPrincipalPaid,
        fees_paid: instFeesPaid,
        penalties_paid: instPenaltiesPaid,
        status: newStatus,
        paid_date: isSettled ? (inst.paid_date || effectiveDate) : null,
      })
      .eq("id", inst.id);
  }
};

// ─── processRepayment ─────────────────────────────────────────────────────────
export const processRepayment = async ({
  loanId,
  amount,
  paymentMethod,
  referenceId = "",
  performedBy = "System",
  paymentDate,
}: {
  loanId: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
  performedBy?: string;
  paymentDate?: string;
}): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    const supabase = createSupabaseAdminClient();

    // 1. Fetch current loan
    const { data: loan, error: loanError } = await withRetry(() =>
      supabase.from("loans").select("*").eq("id", loanId).single()
    );
    if (loanError || !loan) throw new Error("Loan not found.");

    if (amount <= 0) return { success: false, error: "Repayment amount must be greater than zero." };

    const effectiveDate = paymentDate
      ? new Date(paymentDate.includes("T") ? paymentDate : `${paymentDate}T12:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = paymentDate && new Date(effectiveDate) < new Date();

    // 2. Pure TypeScript-driven Interest-First Waterfall Allocation
    const currentInterest = Number(loan.remaining_interest ?? 0);
    const currentPrincipal = Number(loan.remaining_principal ?? 0);

    let allocatedInterest = Math.min(amount, currentInterest);
    let remainingPayment = amount - allocatedInterest;

    let allocatedPrincipal = Math.min(remainingPayment, currentPrincipal);
    remainingPayment -= allocatedPrincipal; // excess goes to wallet

    let newInterest = Math.max(0, currentInterest - allocatedInterest);
    let newPrincipal = Math.max(0, currentPrincipal - allocatedPrincipal);

    let newStatus = loan.status;
    if (newInterest <= 0 && newPrincipal <= 0) {
      newStatus = "Fully Paid";
    }

    // 3. Update Loans table
    const { error: updateError } = await supabase
      .from("loans")
      .update({
        remaining_principal: newPrincipal,
        remaining_interest: newInterest,
        remaining_penalties: 0,
        remaining_fees: 0,
        total_paid_principal: Number(loan.total_paid_principal ?? 0) + allocatedPrincipal,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", loanId);

    if (updateError) throw updateError;

    // 4. Create transaction log
    const { data: tx, error: txError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        client_id: loan.client_id,
        amount: amount,
        type: "Repayment",
        payment_method: paymentMethod,
        reference_id: referenceId,
        comment: `Repayment processed via ${paymentMethod}. Allocated to interest/fees: KES ${allocatedInterest.toLocaleString()}, to principal: KES ${allocatedPrincipal.toLocaleString()}${remainingPayment > 0 ? `, to wallet: KES ${remainingPayment.toLocaleString()}` : ""}`,
        applied_by: performedBy,
        date: effectiveDate,
        allocated_fees: 0,
        allocated_penalties: 0,
        allocated_overdue_interest: 0,
        allocated_current_interest: allocatedInterest,
        allocated_overdue_principal: 0,
        allocated_current_principal: allocatedPrincipal,
        allocated_to_wallet: remainingPayment,
        status: "Active"
      })
      .select()
      .single();

    if (txError) throw txError;

    // 5. Sequentially synchronize installments
    await syncInstallments(supabase, loanId, Number(loan.principal_amount), newPrincipal, newInterest, effectiveDate);

    // 6. Client aggregate + audit in parallel (both non-critical)
    const [, currentUserResult] = await Promise.allSettled([
      (async () => {
        try {
          const { data: client } = await supabase
            .from("clients")
            .select("outstanding_balance, total_borrowed")
            .eq("id", loan.client_id)
            .single();
          if (client) {
            await supabase
              .from("clients")
              .update({ outstanding_balance: Math.max(0, (client.outstanding_balance ?? 0) - amount) })
              .eq("id", loan.client_id);
          }
        } catch (e) {
          console.warn("[processRepayment] Client aggregate update failed (non-critical):", e);
        }
      })(),
      getLoggedInUser().catch(() => null),
    ]);

    const loggedInUser = process.env.TEST_SUITE === "true"
      ? { $id: "system-test", userId: "system-test", firstName: "Test", lastName: "Suite" } as any
      : (currentUserResult.status === "fulfilled" ? currentUserResult.value : null);

    // 7. Audit log (non-critical)
    try {
      const { data: updatedLoan } = await supabase.from("loans").select("balance").eq("id", loanId).single();
      
      await logAuditEvent({
        loanId,
        entityType: "repayment",
        action: "REPAYMENT_CREATED",
        performedBy,
        userId: loggedInUser?.$id || loggedInUser?.userId || "system",
        description: `Repayment of KES ${amount.toLocaleString()} logged via ${paymentMethod}${referenceId ? ` (Ref: ${referenceId})` : ""
          }${isBackdated
            ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]`
            : ""
          }.`,
        previousValue: String(loan.balance),
        newValue: String(updatedLoan?.balance || "Unknown"),
      });
    } catch (auditErr) {
      console.warn("[processRepayment] Audit log failed (non-critical):", auditErr);
    }

    if (process.env.TEST_SUITE !== "true") {
      revalidatePath(`/loans/${loanId}`);
    }
    return { success: true, data: parseStringify(mapRepaymentRow(tx)) };
  } catch (error) {
    console.error("Repayment failed", error);
    return { success: false, error: friendlyError(error) };
  }
};

// ─── getRepaymentsByLoan ──────────────────────────────────────────────────────
export const getRepaymentsByLoan = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "Repayment")
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapRepaymentRow));
  } catch (error) {
    console.error("Error fetching repayments", error);
    return null;
  }
};

// ─── getInstallmentsByLoan ────────────────────────────────────────────────────
function mapInstallmentRow(row: any): LoanInstallment {
  return {
    $id: row.id,
    loanId: row.loan_id,
    clientId: row.client_id,
    installmentNumber: row.installment_number,
    dueDate: row.due_date,
    principalDue: row.principal_due,
    interestDue: row.interest_due,
    feesDue: row.fees_due,
    penaltiesDue: row.penalties_due,
    principalPaid: row.principal_paid,
    interestPaid: row.interest_paid,
    feesPaid: row.fees_paid,
    penaltiesPaid: row.penalties_paid,
    amountDue: row.amount_due,
    amountPaid: row.amount_paid,
    isSettled: row.is_settled,
    status: row.status,
    paidDate: row.paid_date,
    createdAt: row.created_at,
  };
}

export const getInstallmentsByLoan = async (loanId: string): Promise<LoanInstallment[]> => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapInstallmentRow));
  } catch (error) {
    console.error("Error fetching installments", error);
    return [];
  }
};

// ─── getAllTransactionsByLoan ─────────────────────────────────────────────────
function mapTransactionRow(row: any): LoanTransaction {
  return {
    $id: row.id,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    type: row.type,
    paymentMethod: row.payment_method,
    referenceId: row.reference_id,
    comment: row.comment,
    appliedBy: row.applied_by,
    status: row.status,
    allocatedFees: row.allocated_fees ?? 0,
    allocatedPenalties: row.allocated_penalties ?? 0,
    allocatedOverdueInterest: row.allocated_overdue_interest ?? 0,
    allocatedCurrentInterest: row.allocated_current_interest ?? 0,
    allocatedOverduePrincipal: row.allocated_overdue_principal ?? 0,
    allocatedCurrentPrincipal: row.allocated_current_principal ?? 0,
    allocatedToWallet: row.allocated_to_wallet ?? 0,
    date: row.date,
    createdAt: row.created_at,
  };
}

export const getAllTransactionsByLoan = async (loanId: string): Promise<LoanTransaction[]> => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapTransactionRow));
  } catch (error) {
    console.error("Error fetching all transactions", error);
    return [];
  }
};
