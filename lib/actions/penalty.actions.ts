"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_LOAN_COLLECTION_ID: LOAN_COLLECTION_ID,
  APPWRITE_PENALTY_COLLECTION_ID: PENALTY_COLLECTION_ID,
  APPWRITE_REPAYMENT_COLLECTION_ID: REPAYMENT_COLLECTION_ID,
} = process.env;

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
    const { database } = await createAdminClient();

    // Fetch current loan to validate
    const loan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);

    if (loan.status !== "Active" && loan.status !== "Overdue") {
      throw new Error("Penalties can only be applied to Active or Overdue loans.");
    }

    if (amount <= 0) {
      throw new Error("Penalty amount must be greater than zero.");
    }

    // Create penalty record
    const penalty = await database.createDocument(
      DATABASE_ID!,
      PENALTY_COLLECTION_ID!,
      ID.unique(),
      {
        loanId,
        clientId,
        amount,
        penaltyType,
        comment,
        appliedBy,
        dateApplied,
        status: "Active",
        reversedAt: "",
      }
    );

    // Ledger Self-Healing: Recalculate true balance mathematically to prevent concurrency overwrites
    const [repaymentsRes, penaltiesRes] = await Promise.all([
      database.listDocuments(DATABASE_ID!, REPAYMENT_COLLECTION_ID!, [Query.equal("loanId", loanId)]),
      database.listDocuments(DATABASE_ID!, PENALTY_COLLECTION_ID!, [Query.equal("loanId", loanId), Query.equal("status", "Active")]),
    ]);

    const totalRepaid = repaymentsRes.documents.reduce((sum, r) => sum + r.amount, 0);
    const totalPenalties = penaltiesRes.documents.reduce((sum, p) => sum + p.amount, 0);
    const trueBalance = Math.round((loan.totalPayable + totalPenalties - totalRepaid) * 100) / 100;
    const truePenaltyAccrued = Math.round(totalPenalties * 100) / 100;

    // Update loan with healed balance
    await database.updateDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId, {
      balance: trueBalance,
      penaltyAccrued: truePenaltyAccrued,
    });

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(penalty);
  } catch (error) {
    console.error("Error creating penalty:", error);
    throw error;
  }
};

export const getPenaltiesByLoan = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    const penalties = await database.listDocuments(
      DATABASE_ID!,
      PENALTY_COLLECTION_ID!,
      [Query.equal("loanId", loanId), Query.orderDesc("dateApplied")]
    );

    return parseStringify(penalties.documents);
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

    const { database } = await createAdminClient();

    // Fetch penalty record
    const penalty = await database.getDocument(DATABASE_ID!, PENALTY_COLLECTION_ID!, penaltyId);

    if (penalty.status === "Reversed") {
      throw new Error("This penalty has already been reversed.");
    }

    // Soft-reverse: update status and reversedAt
    const reversed = await database.updateDocument(
      DATABASE_ID!,
      PENALTY_COLLECTION_ID!,
      penaltyId,
      {
        status: "Reversed",
        reversedAt: new Date().toISOString(),
      }
    );

    // Ledger Self-Healing: Recalculate true balance mathematically to prevent concurrency overwrites
    const loan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);
    
    const [repaymentsRes, penaltiesRes] = await Promise.all([
      database.listDocuments(DATABASE_ID!, REPAYMENT_COLLECTION_ID!, [Query.equal("loanId", loanId)]),
      database.listDocuments(DATABASE_ID!, PENALTY_COLLECTION_ID!, [Query.equal("loanId", loanId), Query.equal("status", "Active")]),
    ]);

    const totalRepaid = repaymentsRes.documents.reduce((sum, r) => sum + r.amount, 0);
    const totalPenalties = penaltiesRes.documents.reduce((sum, p) => sum + p.amount, 0);
    
    const restoredBalance = Math.round((loan.totalPayable + totalPenalties - totalRepaid) * 100) / 100;
    const restoredPenalty = Math.round(totalPenalties * 100) / 100;

    await database.updateDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId, {
      balance: Math.max(0, restoredBalance),
      penaltyAccrued: Math.max(0, restoredPenalty),
    });

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(reversed);
  } catch (error) {
    console.error("Error reversing penalty:", error);
    throw error;
  }
};
