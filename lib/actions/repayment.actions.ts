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
    if (amount > loan.balance)
      return {
        success: false,
        error: `Amount (KES ${amount.toLocaleString()}) exceeds outstanding balance of KES ${loan.balance.toLocaleString()}.`,
      };

    // 2. Create repayment record
    // Normalise paymentDate: a date picker returns "YYYY-MM-DD" but the DB
    // expects a full ISO timestamp. Append time so it stores correctly.
    const effectiveDate = paymentDate
      ? new Date(paymentDate.includes("T") ? paymentDate : `${paymentDate}T00:00:00`).toISOString()
      : new Date().toISOString();
    const isBackdated = paymentDate && new Date(effectiveDate) < new Date();

    const { data: repayment, error: repaymentError } = await withRetry(() =>
      supabase
        .from("repayments")
        .insert({
          loan_id: loanId,
          client_id: loan.client_id,
          amount,
          payment_method: paymentMethod,
          reference_id: referenceId,
          date: effectiveDate,
        })
        .select()
        .single()
    );
    if (repaymentError) throw repaymentError;

    // 3. Ledger self-healing — recalculate balance from source of truth
    const [repaymentsRes, penaltiesRes] = await Promise.all([
      withRetry(() => supabase.from("repayments").select("amount").eq("loan_id", loanId)),
      withRetry(() => supabase.from("penalties").select("amount").eq("loan_id", loanId).eq("status", "Active")),
    ]);

    const totalRepaid = (repaymentsRes.data ?? []).reduce((s, r) => s + r.amount, 0);
    const totalPenalties = (penaltiesRes.data ?? []).reduce((s, p) => s + p.amount, 0);
    const newBalance = Math.round((loan.total_payable + totalPenalties - totalRepaid) * 100) / 100;

    // 4. Status lifecycle
    let newStatus: string;
    if (newBalance <= 0) {
      newStatus = "Completed";
    } else if (loan.due_date && new Date() > new Date(loan.due_date)) {
      newStatus = "Overdue";
    } else {
      newStatus = loan.status;
    }

    await withRetry(() =>
      Promise.resolve(
        supabase
          .from("loans")
          .update({ balance: Math.max(0, newBalance), status: newStatus })
          .eq("id", loanId)
      )
    );

    // 5. Client aggregate + audit in parallel (both non-critical)
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

    const loggedInUser = currentUserResult.status === "fulfilled" ? currentUserResult.value : null;

    // 6. Audit log (non-critical)
    try {
      await logAuditEvent({
        loanId,
        entityType: "repayment",
        action: "REPAYMENT_CREATED",
        performedBy,
        userId: loggedInUser?.$id || loggedInUser?.userId || "system",
        description: `Repayment of KES ${amount.toLocaleString()} logged via ${paymentMethod}${
          referenceId ? ` (Ref: ${referenceId})` : ""
        }${
          isBackdated
            ? ` [Backdated to ${new Date(effectiveDate).toLocaleDateString("en-KE")}]`
            : ""
        }.`,
        previousValue: String(loan.balance),
        newValue: String(newBalance),
      });
    } catch (auditErr) {
      console.warn("[processRepayment] Audit log failed (non-critical):", auditErr);
    }

    revalidatePath(`/loans/${loanId}`);
    return { success: true, data: parseStringify(mapRepaymentRow(repayment)) };
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
      .from("repayments")
      .select("*")
      .eq("loan_id", loanId)
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapRepaymentRow));
  } catch (error) {
    console.error("Error fetching repayments", error);
    return null;
  }
};
