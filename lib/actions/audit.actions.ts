"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { parseStringify } from "../utils";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_AUDIT_COLLECTION_ID: AUDIT_COLLECTION_ID,
} = process.env;

export const logAuditEvent = async ({
  loanId,
  entityType,
  action,
  performedBy,
  description,
  previousValue,
  newValue,
  userId,
}: {
  loanId: string;
  entityType: string;
  action: AuditAction;
  performedBy: string;
  description: string;
  previousValue?: string;
  newValue?: string;
  /** Appwrite auth userId — required by collection schema */
  userId?: string;
}) => {
  try {
    // If audit collection is not configured, fail silently — don't block core operations
    if (!AUDIT_COLLECTION_ID) return null;

    const { database } = await createAdminClient();

    const log = await database.createDocument(
      DATABASE_ID!,
      AUDIT_COLLECTION_ID,
      ID.unique(),
      {
        loanId,
        entityType,
        action,
        performedBy,
        description,
        previousValue: previousValue ?? "",
        newValue: newValue ?? "",
        timestamp: new Date().toISOString(),
        userId: userId || "system",
      }
    );

    return parseStringify(log);
  } catch (error) {
    // Audit logging must never crash the calling operation
    console.warn("Audit log failed (non-critical):", error);
    return null;
  }
};

export const getAuditLogsByLoan = async (loanId: string): Promise<AuditLog[]> => {
  try {
    if (!AUDIT_COLLECTION_ID) return [];

    const { database } = await createAdminClient();

    const logs = await database.listDocuments(
      DATABASE_ID!,
      AUDIT_COLLECTION_ID,
      [Query.equal("loanId", loanId), Query.orderDesc("timestamp"), Query.limit(100)]
    );

    return parseStringify(logs.documents) as AuditLog[];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
};
