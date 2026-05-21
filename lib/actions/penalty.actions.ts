"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "./user.actions";

function mapPenaltyRow(row: any): Penalty {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    loanId: row.loan_id,
    clientId: row.client_id,
    amount: row.amount,
    penaltyType: row.payment_method, // reusing this field for penalty_type
    comment: row.comment,
    appliedBy: row.applied_by,
    dateApplied: row.date,
    status: row.status,
    reversedAt: row.status === "Reversed" ? row.updated_at || row.created_at : "",
  };
}

export const createPenalty = async ({
  loanId,
  clientId,
  amount,
  penaltyType,
  comment = "",
  appliedBy,
  dateApplied,
}: {
  loanId: string;
  clientId: string;
  amount: number;
  penaltyType: PenaltyType;
  comment?: string;
  appliedBy: string;
  dateApplied: string;
}) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data: loan, error: loanError } = await supabase
      .from("loans")
      .select("status")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");
    if (loan.status !== "Active" && loan.status !== "Substandard" && loan.status !== "Loss") {
      throw new Error("Penalties can only be applied to Active, Substandard, or Loss loans.");
    }
    if (amount <= 0) throw new Error("Penalty amount must be greater than zero.");

    // 1. Attach penalty to an installment
    const { data: installments } = await supabase
      .from("loan_installments")
      .select("id, penalties_due")
      .eq("loan_id", loanId)
      .eq("is_settled", false)
      .order("due_date", { ascending: true })
      .limit(1);

    const targetInstallment = installments && installments.length > 0 ? installments[0] : null;

    if (targetInstallment) {
      await supabase
        .from("loan_installments")
        .update({ penalties_due: targetInstallment.penalties_due + amount })
        .eq("id", targetInstallment.id);
    } else {
      // Fallback to the latest installment
      const { data: lastInst } = await supabase
        .from("loan_installments")
        .select("id, penalties_due")
        .eq("loan_id", loanId)
        .order("due_date", { ascending: false })
        .limit(1)
        .single();

      if (lastInst) {
        await supabase
          .from("loan_installments")
          .update({ penalties_due: lastInst.penalties_due + amount })
          .eq("id", lastInst.id);
      }
    }

    // 2. Insert penalty record into loan_transactions
    const { data: penalty, error: penaltyError } = await supabase
      .from("loan_transactions")
      .insert({
        loan_id: loanId,
        client_id: clientId,
        amount,
        type: "Manual Penalty",
        payment_method: penaltyType, // Using this column to store the penalty type
        comment,
        applied_by: appliedBy,
        date: dateApplied,
        status: "Active",
      })
      .select()
      .single();

    if (penaltyError) throw penaltyError;

    // 3. Ledger self-healing
    const { data: allInstallments } = await supabase
      .from("loan_installments")
      .select("penalties_due, penalties_paid")
      .eq("loan_id", loanId);

    const remainingPenalties = (allInstallments ?? []).reduce(
      (sum, inst) => sum + Math.max(0, inst.penalties_due - inst.penalties_paid),
      0
    );

    await supabase
      .from("loans")
      .update({ remaining_penalties: remainingPenalties })
      .eq("id", loanId);

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(mapPenaltyRow(penalty));
  } catch (error) {
    console.error("Error creating penalty:", error);
    throw error;
  }
};

export const getPenaltiesByLoan = async (loanId: string) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "Manual Penalty")
      .order("date", { ascending: false });

    if (error) throw error;

    return parseStringify((data ?? []).map(mapPenaltyRow));
  } catch (error) {
    console.error("Error fetching penalties:", error);
    return [];
  }
};

export const reversePenalty = async (penaltyId: string, loanId: string) => {
  try {
    const currentUser = await getLoggedInUser();
    if (!currentUser || (currentUser.role !== "MANAGER" && currentUser.role !== "ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Managers or Admins can reverse penalties.");
    }

    const supabase = createSupabaseAdminClient();

    const { data: penalty, error: fetchError } = await supabase
      .from("loan_transactions")
      .select("status, amount")
      .eq("id", penaltyId)
      .single();

    if (fetchError || !penalty) throw new Error("Penalty not found.");
    if (penalty.status === "Reversed") throw new Error("This penalty has already been reversed.");

    // 1. Mark as Reversed
    const { data: reversed, error: reverseError } = await supabase
      .from("loan_transactions")
      .update({ status: "Reversed" })
      .eq("id", penaltyId)
      .select()
      .single();

    if (reverseError) throw reverseError;

    // 2. Remove penalty amount from an active installment
    const { data: installments } = await supabase
      .from("loan_installments")
      .select("id, penalties_due")
      .eq("loan_id", loanId)
      .eq("is_settled", false)
      .order("due_date", { ascending: true })
      .limit(1);

    const targetInstallment = installments && installments.length > 0 ? installments[0] : null;

    if (targetInstallment) {
      await supabase
        .from("loan_installments")
        .update({ penalties_due: Math.max(0, targetInstallment.penalties_due - penalty.amount) })
        .eq("id", targetInstallment.id);
    } else {
      const { data: lastInst } = await supabase
        .from("loan_installments")
        .select("id, penalties_due")
        .eq("loan_id", loanId)
        .order("due_date", { ascending: false })
        .limit(1)
        .single();

      if (lastInst) {
        await supabase
          .from("loan_installments")
          .update({ penalties_due: Math.max(0, lastInst.penalties_due - penalty.amount) })
          .eq("id", lastInst.id);
      }
    }

    // 3. Ledger self-healing
    const { data: allInstallments } = await supabase
      .from("loan_installments")
      .select("penalties_due, penalties_paid")
      .eq("loan_id", loanId);

    const remainingPenalties = (allInstallments ?? []).reduce(
      (sum, inst) => sum + Math.max(0, inst.penalties_due - inst.penalties_paid),
      0
    );

    await supabase
      .from("loans")
      .update({ remaining_penalties: remainingPenalties })
      .eq("id", loanId);

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(mapPenaltyRow(reversed));
  } catch (error) {
    console.error("Error reversing penalty:", error);
    throw error;
  }
};
