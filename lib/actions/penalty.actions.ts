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
    penaltyType: row.penalty_type,
    comment: row.comment,
    appliedBy: row.applied_by,
    dateApplied: row.date_applied,
    status: row.status,
    reversedAt: row.reversed_at,
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
      .select("status, total_payable")
      .eq("id", loanId)
      .single();

    if (loanError || !loan) throw new Error("Loan not found.");
    if (loan.status !== "Active" && loan.status !== "Overdue") {
      throw new Error("Penalties can only be applied to Active or Overdue loans.");
    }
    if (amount <= 0) throw new Error("Penalty amount must be greater than zero.");

    // Create penalty record
    const { data: penalty, error: penaltyError } = await supabase
      .from("penalties")
      .insert({
        loan_id: loanId,
        client_id: clientId,
        amount,
        penalty_type: penaltyType,
        comment,
        applied_by: appliedBy,
        date_applied: dateApplied,
        status: "Active",
        reversed_at: "",
      })
      .select()
      .single();

    if (penaltyError) throw penaltyError;

    // Ledger self-healing
    const [repaymentsRes, penaltiesRes] = await Promise.all([
      supabase.from("repayments").select("amount").eq("loan_id", loanId),
      supabase.from("penalties").select("amount").eq("loan_id", loanId).eq("status", "Active"),
    ]);

    const totalRepaid = (repaymentsRes.data ?? []).reduce((s, r) => s + r.amount, 0);
    const totalPenalties = (penaltiesRes.data ?? []).reduce((s, p) => s + p.amount, 0);
    const trueBalance = Math.round((loan.total_payable + totalPenalties - totalRepaid) * 100) / 100;
    const truePenaltyAccrued = Math.round(totalPenalties * 100) / 100;

    await supabase
      .from("loans")
      .update({ balance: trueBalance, penalty_accrued: truePenaltyAccrued })
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
      .from("penalties")
      .select("*")
      .eq("loan_id", loanId)
      .order("date_applied", { ascending: false });

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
      .from("penalties")
      .select("status")
      .eq("id", penaltyId)
      .single();

    if (fetchError || !penalty) throw new Error("Penalty not found.");
    if (penalty.status === "Reversed") throw new Error("This penalty has already been reversed.");

    const { data: reversed, error: reverseError } = await supabase
      .from("penalties")
      .update({ status: "Reversed", reversed_at: new Date().toISOString() })
      .eq("id", penaltyId)
      .select()
      .single();

    if (reverseError) throw reverseError;

    // Ledger self-healing
    const { data: loan } = await supabase
      .from("loans")
      .select("total_payable")
      .eq("id", loanId)
      .single();

    const [repaymentsRes, penaltiesRes] = await Promise.all([
      supabase.from("repayments").select("amount").eq("loan_id", loanId),
      supabase.from("penalties").select("amount").eq("loan_id", loanId).eq("status", "Active"),
    ]);

    const totalRepaid = (repaymentsRes.data ?? []).reduce((s, r) => s + r.amount, 0);
    const totalPenalties = (penaltiesRes.data ?? []).reduce((s, p) => s + p.amount, 0);
    const restoredBalance = Math.round(((loan?.total_payable ?? 0) + totalPenalties - totalRepaid) * 100) / 100;
    const restoredPenalty = Math.round(totalPenalties * 100) / 100;

    await supabase
      .from("loans")
      .update({
        balance: Math.max(0, restoredBalance),
        penalty_accrued: Math.max(0, restoredPenalty),
      })
      .eq("id", loanId);

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(mapPenaltyRow(reversed));
  } catch (error) {
    console.error("Error reversing penalty:", error);
    throw error;
  }
};
