"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";
import { InterestCalculator } from "../interest";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_LOAN_COLLECTION_ID: LOAN_COLLECTION_ID,
  APPWRITE_CLIENT_COLLECTION_ID: CLIENT_COLLECTION_ID,
} = process.env;

export const createLoan = async (loanData: {
  clientId: string;
  principalAmount: number;
  interestRate: number;
  interestType: "Flat" | "Reducing";
  durationInMonths: number;
  loanType: string;
}) => {
  try {
    const { database } = await createAdminClient();

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

    // Calculate a placeholder due date just in case your Appwrite collection requires it
    const initialStartDate = new Date();
    const initialDueDate = new Date();
    initialDueDate.setMonth(initialStartDate.getMonth() + loanData.durationInMonths);

    const newLoan = await database.createDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      ID.unique(),
      {
        ...loanData,
        status: "Pending",
        totalInterest: financialData.totalInterest,
        totalPayable: financialData.totalPayable,
        balance: financialData.totalPayable,
        penaltyAccrued: 0,
        startDate: initialStartDate.toISOString(), // <-- ADDED: Fixes the crash
        dueDate: initialDueDate.toISOString(),     // <-- ADDED: Prevents potential due date crash
      }
    );

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

    return parseStringify(updatedLoan);
  } catch (error) {
    console.error("Error updating loan", error);
    return null;
  }
};

export const approveLoan = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    const startDate = new Date();
    const dueDate = new Date();

    // We fetch the loan first to get the duration to set the dueDate correctly
    const loan = await database.getDocument(DATABASE_ID!, LOAN_COLLECTION_ID!, loanId);
    dueDate.setMonth(startDate.getMonth() + loan.durationInMonths);

    const updatedLoan = await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      {
        status: "Active",
        startDate: startDate.toISOString(),
        dueDate: dueDate.toISOString(),
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

    return parseStringify(updatedLoan);
  } catch (error) {
    console.error("Error approving loan", error);
    return null;
  }
};

export const denyLoan = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    const updatedLoan = await database.updateDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId,
      {
        status: "Denied",
      }
    );

    return parseStringify(updatedLoan);
  } catch (error) {
    console.error("Error denying loan", error);
    return null;
  }
};

export const getLoans = async () => {
  try {
    const { database } = await createAdminClient();

    const loans = await database.listDocuments(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    return parseStringify(loans.documents);
  } catch (error) {
    console.error("Error fetching loans", error);
    return null;
  }
};

export const getLoanById = async (loanId: string) => {
  try {
    const { database } = await createAdminClient();

    const loan = await database.getDocument(
      DATABASE_ID!,
      LOAN_COLLECTION_ID!,
      loanId
    );

    return parseStringify(loan);
  } catch (error) {
    console.error("Error fetching loan by ID", error);
    return null;
  }
};

export const getLoanMetrics = async () => {
  try {
    const { database } = await createAdminClient();
    const loans = await database.listDocuments(DATABASE_ID!, LOAN_COLLECTION_ID!);

    let totalDisbursed = 0;
    let totalOutstanding = 0;

    loans.documents.forEach(loan => {
      if (loan.status !== 'Pending' && loan.status !== 'Denied') {
        totalDisbursed += loan.principalAmount;
        totalOutstanding += loan.balance;
      }
    });

    return {
      totalDisbursed,
      totalOutstanding,
      loanCount: loans.total
    };
  } catch (error) {
    console.error("Error fetching metrics", error);
    return { totalDisbursed: 0, totalOutstanding: 0, loanCount: 0 };
  }
};
