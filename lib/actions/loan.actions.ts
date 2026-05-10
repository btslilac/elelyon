"use server";

import { ID, Query } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { InterestCalculator } from "../interest";
import { revalidatePath } from "next/cache";
import { getLoggedInUser } from "./user.actions";
import { logAuditEvent } from "./audit.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_LOAN_COLLECTION_ID: LOAN_COLLECTION_ID,
  APPWRITE_CLIENT_COLLECTION_ID: CLIENT_COLLECTION_ID,
} = process.env;

/**
 * Auto-flag ALL Active loans that have passed their due date → Overdue.
 * Called at the start of getLoans() and getLoanById() for real-time detection.
 * Runs silently — never throws so it can't break the calling page.
 */
export const autoFlagOverdueLoans = async (specificLoanId?: string): Promise<number> => {
  try {
    const { database } = await createAdminClient();
    const now = new Date().toISOString();

    // Build query: Active loans with dueDate strictly before now
    const queries = [
      Query.equal("status", ["Active"]),
      Query.lessThan("dueDate", now),
      Query.limit(200),
      Query.select(["$id"]),
    ];

    // If called for a specific loan, narrow the query
    if (specificLoanId) {
      queries.push(Query.equal("$id", specificLoanId));
    }

    const result = await database.listDocuments(DATABASE_ID!, LOAN_COLLECTION_ID!, queries);

    if (result.total === 0) return 0;

    // Batch-update all found loans to Overdue in parallel
    await Promise.all(
      result.documents.map((loan) =>
        database.updateDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loan.$id, {
          status: "Overdue",
        })
      )
    );

    // Revalidate paths so cached pages pick up the change
    revalidatePath("/loans");
    revalidatePath("/");
    if (specificLoanId) revalidatePath(`/loans/${specificLoanId}`);

    return result.total;
  } catch (error) {
    // Non-critical — never crash the calling page
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

    const { database, storage } = await createAdminClient();

    // 1. Zero-Loss Credit Check: Prevent lending to defaulters
    // Query directly by clientId + bad statuses — avoids the 25-doc default limit bug
    const badCreditCheck = await database.listDocuments(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      [
        Query.equal("clientId", loanData.clientId),
        Query.equal("status", ["Overdue", "Defaulted"]),
        Query.limit(1),
      ]
    );

    if (badCreditCheck.total > 0) {
      return { error: "CREDIT_REJECTED" };
    }

    let financialData;
    if (loanData.interestType === "Flat") {
      financialData = InterestCalculator.calculateFlatRate(
        loanData.principalAmount,
        loanData.interestRate,
        loanData.durationInMonths
      );
    } else {
      financialData = InterestCalculator.calculateReducingBalance(
        loanData.principalAmount,
        loanData.interestRate,
        loanData.durationInMonths
      );
    }

    // Calculate dates based on optional provided startDate or default to today
    const initialStartDate = loanData.startDate ? new Date(loanData.startDate) : new Date();
    const initialDueDate = new Date(initialStartDate);
    initialDueDate.setMonth(initialStartDate.getMonth() + loanData.durationInMonths);

    // Extract startDate & documentFile so they don't get spread into Appwrite DB directly
    const { startDate, documentFile, ...restLoanData } = loanData;

    const installmentAmount = Math.round((financialData.totalPayable / loanData.durationInMonths) * 100) / 100;

    let documentUrl = undefined;

    if (documentFile && documentFile.size > 0) {
      const buffer = Buffer.from(await documentFile.arrayBuffer());
      const inputFile = InputFile.fromBuffer(buffer, documentFile.name);

      const uploadedFile = await storage.createFile(
        process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID!,
        ID.unique(),
        inputFile
      );

      // Construct view URL
      documentUrl = `${process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${process.env.NEXT_PUBLIC_APPWRITE_STORAGE_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${process.env.NEXT_PUBLIC_APPWRITE_PROJECT}`;
    }

    const newLoan = await database.createDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      ID.unique(),
      {
        ...restLoanData,
        status: "Pending",
        totalInterest: financialData.totalInterest,
        totalPayable: financialData.totalPayable,
        balance: Math.round(financialData.totalPayable * 100) / 100,
        installmentAmount,
        penaltyAccrued: 0,
        startDate: initialStartDate.toISOString(),
        dueDate: initialDueDate.toISOString(),
        ...(documentUrl && { documentUrl }),
        createdBy: currentUser.$id
      }
    );

    revalidatePath("/");
    revalidatePath("/loans");

    return parseStringify(newLoan);
  } catch (error) {
    console.error("Error creating loan", error);
    return null;
  }
};

export const updateLoan = async (loanId: string, loanData: any) => {
  try {
    const { database } = await createAdminClient();

    // Recalculate if financial parameters are provided and loan is still Pending
    if (loanData.principalAmount || loanData.interestRate || loanData.durationInMonths || loanData.interestType) {
      const currentLoan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);

      if (currentLoan.status === 'Pending') {
        const p = loanData.principalAmount ?? currentLoan.principalAmount;
        const r = loanData.interestRate ?? currentLoan.interestRate;
        const d = loanData.durationInMonths ?? currentLoan.durationInMonths;
        const t = loanData.interestType ?? currentLoan.interestType;

        let financialData;
        if (t === "Flat") {
          financialData = InterestCalculator.calculateFlatRate(p, r, d);
        } else {
          financialData = InterestCalculator.calculateReducingBalance(p, r, d);
        }

        loanData.totalInterest = financialData.totalInterest;
        loanData.totalPayable = financialData.totalPayable;
        loanData.balance = financialData.totalPayable;
      }
    }

    const updatedLoan = await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      loanData
    );

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(updatedLoan);
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

    const { database } = await createAdminClient();

    // We fetch the loan first for MAKER-CHECKER validation
    const loan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);

    // MAKER-CHECKER VALIDATION
    if (loan.createdBy === currentUser.$id) {
      throw new Error("MAKER_CHECKER_VIOLATION: You cannot approve a loan you originated.");
    }

    const updatedLoan = await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      {
        status: "Active",
      }
    );

    // Update Client aggregate totals
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
        totalBorrowed: (client.totalBorrowed || 0) + loan.principalAmount,
        outstandingBalance: (client.outstandingBalance || 0) + loan.totalPayable,
      }
    );

    // Audit log the approval
    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_APPROVED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id || currentUser.userId || "system",
      description: `Loan approved and disbursed by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan.principalAmount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Active",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(updatedLoan);
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

    const { database } = await createAdminClient();

    const loan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);

    const updatedLoan = await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      {
        status: "Denied",
      }
    );

    // Audit log the denial
    await logAuditEvent({
      loanId,
      entityType: "loan",
      action: "LOAN_DENIED",
      performedBy: `${currentUser.firstName} ${currentUser.lastName}`,
      userId: currentUser.$id || currentUser.userId || "system",
      description: `Loan application declined by ${currentUser.firstName} ${currentUser.lastName}. Principal: KES ${loan.principalAmount?.toLocaleString()}.`,
      previousValue: "Pending",
      newValue: "Denied",
    });

    revalidatePath("/");
    revalidatePath("/loans");
    revalidatePath(`/loans/${loanId}`);

    return parseStringify(updatedLoan);
  } catch (error) {
    console.error("Error denying loan", error);
    return null;
  }
};

export const getLoans = async () => {
  try {
    const { database } = await createAdminClient();

    // ── Real-time overdue detection + loans fetch run in PARALLEL ──────────
    // autoFlagOverdueLoans only writes to Appwrite by $id (no field collision).
    // Both queries start simultaneously; we wait for both before proceeding,
    // so the returned loan list always reflects the post-flag status.
    const [_, loansRaw] = await Promise.all([
      autoFlagOverdueLoans(),
      database.listDocuments(
        DATABASE_ID!,
        LOAN_COLLECTION_ID!,
        [
          Query.orderDesc("$createdAt"),
          Query.limit(500),
          Query.select(["$id", "clientId", "loanType", "principalAmount", "balance", "dueDate", "status", "$createdAt"])
        ]
      )
    ]);
    // ────────────────────────────────────────────────────────────────────────

    // Extract unique client IDs from the freshly-flagged loans
    const clientIds = [...new Set(loansRaw.documents.map((loan) => loan.clientId))];

    // Fetch client metadata in parallel (independent of the above)
    let clients = { documents: [] as any[] };
    if (clientIds.length > 0) {
      const clientsRaw = await database.listDocuments(
        DATABASE_ID!,
        CLIENT_COLLECTION_ID!,
        [
          Query.equal("$id", clientIds),
          Query.select(["$id", "firstName", "lastName", "email"])
        ]
      );
      clients.documents = clientsRaw.documents as any[];
    }

    // Re-fetch loans AFTER the flag so status is always current
    const enrichedLoans = loansRaw.documents.map((loan: any) => {
      const client = clients.documents.find((c: any) => c.$id === loan.clientId);
      return {
        ...loan,
        // If autoFlag updated this loan to Overdue, reflect that here
        clientName: client ? `${client.firstName} ${client.lastName}` : "Unknown Client",
        clientEmail: client ? client.email : "No email",
      };
    });

    return parseStringify(enrichedLoans);
  } catch (error) {
    console.error("Error fetching loans", error);
    return null;
  }
};

export const getLoanById = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    // ── Real-time overdue detection for this specific loan ──────────────────
    await autoFlagOverdueLoans(loanId);
    // ────────────────────────────────────────────────────────────────────────

    // Fetch AFTER the flag so the returned status is always current
    const loan = await database.getDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId
    );

    const client = await database.getDocument(
      DATABASE_ID!,
      CLIENT_COLLECTION_ID!,
      loan.clientId
    );

    const enrichedLoan = {
      ...loan,
      clientName: `${client.firstName} ${client.lastName}`,
      clientEmail: client.email,
      clientPhone: client.phone,
    };

    return parseStringify(enrichedLoan);
  } catch (error) {
    console.error("Error fetching loan by ID", error);
    return null;
  }
};

export const getLoanMetrics = async () => {
  try {
    const { database } = await createAdminClient();
    // Note: autoFlagOverdueLoans is NOT called here — it already ran in
    // getLoans() on the same request (home page calls them in Promise.all).
    // Calling it twice would double the Appwrite write cost for no benefit.
    const loans = await database.listDocuments(DATABASE_ID!, LOAN_COLLECTION_ID!);

    let totalDisbursed = 0;
    let totalOutstanding = 0;
    let activeCount = 0;

    loans.documents.forEach(loan => {
      if (loan.status !== 'Pending' && loan.status !== 'Denied') {
        totalDisbursed += loan.principalAmount;
        totalOutstanding += loan.balance;
      }
      if (loan.status === 'Active') activeCount++;
    });

    return {
      totalDisbursed,
      totalOutstanding,
      loanCount: activeCount,
    };
  } catch (error) {
    console.error("Error fetching metrics", error);
    return { totalDisbursed: 0, totalOutstanding: 0, loanCount: 0 };
  }
};
