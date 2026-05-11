"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";

function mapAuditRow(row: any): AuditLog {
  return {
    $id: row.id,
    $createdAt: row.created_at,
    loanId: row.loan_id,
    entityType: row.entity_type,
    action: row.action,
    performedBy: row.performed_by,
    description: row.description,
    previousValue: row.previous_value,
    newValue: row.new_value,
    timestamp: row.timestamp,
  };
}

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
  userId?: string;
}) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .insert({
        loan_id: loanId,
        entity_type: entityType,
        action,
        performed_by: performedBy,
        description,
        previous_value: previousValue ?? "",
        new_value: newValue ?? "",
        timestamp: new Date().toISOString(),
        user_id: userId ?? "system",
      })
      .select()
      .single();

    if (error) throw error;

    return parseStringify(mapAuditRow(data));
  } catch (error) {
    // Audit logging must never crash the calling operation
    console.warn("Audit log failed (non-critical):", error);
    return null;
  }
};

export const getAuditLogsByLoan = async (loanId: string): Promise<AuditLog[]> => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .eq("loan_id", loanId)
      .order("timestamp", { ascending: false })
      .limit(100);

    if (error) throw error;

    return parseStringify((data ?? []).map(mapAuditRow)) as AuditLog[];
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return [];
  }
};
