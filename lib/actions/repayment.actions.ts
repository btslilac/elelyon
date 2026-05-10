"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { logAuditEvent } from "./audit.actions";
import { getLoggedInUser } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_LOAN_COLLECTION_ID: LOAN_COLLECTION_ID,
  APPWRITE_REPAYMENT_COLLECTION_ID: REPAYMENT_COLLECTION_ID,
  APPWRITE_PENALTY_COLLECTION_ID: PENALTY_COLLECTION_ID,
  APPWRITE_CLIENT_COLLECTION_ID: CLIENT_COLLECTION_ID,
} = process.env;

// ─── Retry helper ──────────────────────────────────────────────────────────────
// 2 attempts max with a single 800ms back-off on ETIMEDOUT.
// Keeps the total window tight so users don't wait 15s+ for a retry chain.
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
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

// ─── Friendly error mapper ─────────────────────────────────────────────────────
function friendlyError(err: unknown): string {
  const msg = (err as any)?.message || String(err);
  if (
    msg.includes("ETIMEDOUT") ||
    msg.includes("fetch failed") ||
    msg.includes("AggregateError")
  ) {
    return "Connection to Appwrite timed out. Please check your internet connection and try again. If the issue persists, the Appwrite server (tor.cloud.appwrite.io) may be temporarily unavailable.";
  }
  return msg || "An unexpected error occurred.";
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
  /** ISO date string — defaults to now, can be a past date for backdated entry */
  paymentDate?: string;
}): Promise<{ success: boolean; error?: string; data?: any }> => {
  try {
    const { database } = await createAdminClient();

    // 1. Fetch current loan state (with retry)
    const loan = await withRetry(() =>
      database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId)
    );

    if (amount <= 0)
      return { success: false, error: "Repayment amount must be greater than zero." };
    if (amount > loan.balance)
      return {
        success: false,
        error: `Amount (KES ${amount.toLocaleString()}) exceeds outstanding balance of KES ${loan.balance.toLocaleString()}.`,
      };

    // 2. Create Repayment Record (with retry)
    const effectiveDate = paymentDate || new Date().toISOString();
    const isBackdated = paymentDate && paymentDate < new Date().toISOString();

    const repayment = await withRetry(() =>
      database.createDocument(DATABASE_ID!, REPAYMENT_COLLECTION_ID!, ID.unique(), {
        loanId,
        clientId: loan.clientId,
        amount,
        paymentMethod,
        referenceId,
        date: effectiveDate,
      })
    );

    // 3. Ledger self-healing — recalculate balance from source of truth (with retry)
    const [repaymentsRes, penaltiesRes] = await withRetry(() =>
      Promise.all([
        database.listDocuments(DATABASE_ID!, REPAYMENT_COLLECTION_ID!, [
          Query.equal("loanId", loanId),
        ]),
        database.listDocuments(DATABASE_ID!, PENALTY_COLLECTION_ID!, [
          Query.equal("loanId", loanId),
          Query.equal("status", "Active"),
        ]),
      ])
    );

    const totalRepaid = repaymentsRes.documents.reduce((s, r) => s + r.amount, 0);
    const totalPenalties = penaltiesRes.documents.reduce((s, p) => s + p.amount, 0);
    const newBalance =
      Math.round((loan.totalPayable + totalPenalties - totalRepaid) * 100) / 100;

    // 4. Status lifecycle
    let newStatus: string;
    if (newBalance <= 0) {
      newStatus = "Completed";
    } else if (loan.dueDate && new Date() > new Date(loan.dueDate)) {
      newStatus = "Overdue";
    } else {
      newStatus = loan.status;
    }

    await withRetry(() =>
      database.updateDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId, {
        balance: Math.max(0, newBalance),
        status: newStatus,
      })
    );

    // 5. Get current user for audit trail (non-critical, parallel with client update)
    const [, currentUser] = await Promise.allSettled([
      // Client aggregate totals (non-critical — don't fail the repayment)
      (async () => {
        try {
          const client = await withRetry(() =>
            database.getDocument(DATABASE_ID!, CLIENT_COLLECTION_ID!, loan.clientId)
          );
          await withRetry(() =>
            database.updateDocument(DATABASE_ID!, CLIENT_COLLECTION_ID!, loan.clientId, {
              totalBorrowed: client.totalBorrowed || 0,
              outstandingBalance: Math.max(0, (client.outstandingBalance || 0) - amount),
            })
          );
        } catch (clientErr) {
          console.warn("[processRepayment] Client aggregate update failed (non-critical):", clientErr);
        }
      })(),
      // Get logged-in user for the userId field in audit log
      getLoggedInUser().catch(() => null),
    ]);

    const loggedInUser = currentUser.status === "fulfilled" ? currentUser.value : null;

    // 6. Audit log (non-critical — never block the repayment)
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
    return { success: true, data: parseStringify(repayment) };
  } catch (error) {
    console.error("Repayment failed", error);
    return { success: false, error: friendlyError(error) };
  }
};

export const getRepaymentsByLoan = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    const repayments = await database.listDocuments(
      DATABASE_ID!,
      REPAYMENT_COLLECTION_ID!,
      [Query.equal("loanId", loanId), Query.orderDesc("date")]
    );

    return parseStringify(repayments.documents);
  } catch (error) {
    console.error("Error fetching repayments", error);
    return null;
  }
};
