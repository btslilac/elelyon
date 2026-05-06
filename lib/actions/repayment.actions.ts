"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_LOAN_COLLECTION_ID: LOAN_COLLECTION_ID,
  APPWRITE_REPAYMENT_COLLECTION_ID: REPAYMENT_COLLECTION_ID,
  APPWRITE_CLIENT_COLLECTION_ID: CLIENT_COLLECTION_ID,
} = process.env;

export const processRepayment = async ({
  loanId,
  amount,
  paymentMethod,
  referenceId = "",
}: {
  loanId: string;
  amount: number;
  paymentMethod: string;
  referenceId?: string;
}) => {
  try {
    const { database } = await createAdminClient();

    // 1. Fetch current loan state
    const loan = await database.getDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId
    );

    if (amount > loan.balance) {
      throw new Error("Amount exceeds outstanding balance");
    }

    // 2. Create Repayment Record
    const repayment = await database.createDocument(
      DATABASE_ID!,
      REPAYMENT_COLLECTION_ID!,
      ID.unique(),
      {
        loanId,
        clientId: loan.clientId,
        amount,
        paymentMethod,
        referenceId,
        date: new Date().toISOString(),
      }
    );

    // 3. Update Loan Balance & Status
    const newBalance = loan.balance - amount;
    const newStatus = newBalance <= 0 ? "Completed" : loan.status;

    await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      {
        balance: newBalance,
        status: newStatus,
      }
    );

    // 4. Update Client aggregate totals
    const client = await database.getDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      loan.clientId
    );

    await database.updateDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      loan.clientId,
      {
        totalBorrowed: client.totalBorrowed || 0, // ensure it's not null
        outstandingBalance: Math.max(0, (client.outstandingBalance || 0) - amount),
      }
    );

    revalidatePath(`/loans/${loanId}`);
    return parseStringify(repayment);
  } catch (error) {
    console.error("Repayment failed", error);
    throw error;
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
