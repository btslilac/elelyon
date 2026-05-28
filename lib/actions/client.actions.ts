"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";
import {
  uploadClientAsset,
  deleteClientAsset,
} from "../supabase-storage";
import { generateClientAssetPath } from "../storage-utils";

/**
 * Upload a client profile photo from a base64 data URL.
 * Called from Client Components — receives serialisable data, runs on the server with admin privileges.
 */
export const uploadClientPhoto = async (
  clientId: string,
  base64DataUrl: string,
  fileName: string,
  mimeType: string,
  oldPath?: string
): Promise<{ url: string; path: string } | null> => {
  try {
    // 1. Delete old photo if exists (no orphaned files)
    if (oldPath) {
      await deleteClientAsset(oldPath);
    }

    // 2. Decode base64 → ArrayBuffer
    const base64 = base64DataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // 3. Upload via admin client (bypasses RLS)
    const path = generateClientAssetPath(clientId, "profile", fileName);
    const result = await uploadClientAsset(path, bytes.buffer, mimeType);
    return result;
  } catch (err) {
    console.error("[uploadClientPhoto] error:", err);
    return null;
  }
};


function mapClientRow(row: any): LMSClient {
  return {
    $id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    nationalId: row.national_id,
    email: row.email,
    phone: row.phone,
    address: row.address,
    totalBorrowed: row.total_borrowed ?? 0,
    outstandingBalance: row.outstanding_balance ?? 0,
    profilePhotoUrl: row.profile_photo_url,
    profilePhotoPath: row.profile_photo_path,
    $createdAt: row.created_at,
    updatedAt: row.updated_at,
  } as any;
}

export const createClient = async (clientData: any) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .insert({
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        national_id: clientData.nationalId,
        email: clientData.email,
        phone: clientData.phone,
        address: clientData.address,
        total_borrowed: 0,
        outstanding_balance: 0,
        profile_photo_url: clientData.profilePhotoUrl,
        profile_photo_path: clientData.profilePhotoPath,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/clients");
    revalidatePath("/");
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error creating client", error);
    return null;
  }
};

export const getClients = async () => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Fetch overdue loans to determine which clients are in arrears
    const { data: overdueLoans } = await supabase
      .from("loans")
      .select("client_id")
      .eq("status", "Overdue");

    const overdueClientIds = new Set(overdueLoans?.map((l) => l.client_id) || []);

    return parseStringify(data.map((row) => ({
      ...mapClientRow(row),
      hasOverdueLoans: overdueClientIds.has(row.id),
    })));
  } catch (error) {
    console.error("Error fetching clients", error);
    return null;
  }
};

export const getClientById = async (clientId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (error) throw error;
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error fetching client by ID", error);
    return null;
  }
};

export const getClientFullProfile = async (clientId: string) => {
  try {
    const supabase = createSupabaseAdminClient();
    
    // Fetch client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();

    if (clientError) throw clientError;

    // Fetch related data in parallel
    const [loansRes, repaymentsRes, penaltiesRes, auditRes, notificationsRes, documentsRes] = await Promise.all([
      supabase.from("loans").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("repayments").select("*").eq("client_id", clientId).order("date", { ascending: false }),
      supabase.from("penalties").select("*").eq("client_id", clientId).order("date_applied", { ascending: false }),
      supabase.from("audit_logs").select("*").eq("client_id", clientId).order("timestamp", { ascending: false }).limit(20),
      supabase.from("notifications").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("client_documents").select("*").eq("client_id", clientId).order("created_at", { ascending: false })
    ]);

    return parseStringify({
      client: mapClientRow(client),
      loans: loansRes.data || [],
      repayments: repaymentsRes.data || [],
      penalties: penaltiesRes.data || [],
      auditLogs: auditRes.data || [],
      notifications: notificationsRes.data || [],
      documents: documentsRes.data || [],
    });
  } catch (error) {
    console.error("Error fetching full client profile", error);
    return null;
  }
};

export const updateClient = async (clientId: string, clientData: any) => {
  try {
    const supabase = createSupabaseAdminClient();
    const payload: Record<string, any> = {};
    if (clientData.firstName !== undefined) payload.first_name = clientData.firstName;
    if (clientData.lastName !== undefined) payload.last_name = clientData.lastName;
    if (clientData.nationalId !== undefined) payload.national_id = clientData.nationalId;
    if (clientData.email !== undefined) payload.email = clientData.email;
    if (clientData.phone !== undefined) payload.phone = clientData.phone;
    if (clientData.address !== undefined) payload.address = clientData.address;
    if (clientData.totalBorrowed !== undefined) payload.total_borrowed = clientData.totalBorrowed;
    if (clientData.outstandingBalance !== undefined) payload.outstanding_balance = clientData.outstandingBalance;
    if (clientData.profilePhotoUrl !== undefined) payload.profile_photo_url = clientData.profilePhotoUrl;
    if (clientData.profilePhotoPath !== undefined) payload.profile_photo_path = clientData.profilePhotoPath;

    const { data, error } = await supabase
      .from("clients")
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", clientId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/clients");
    revalidatePath(`/clients/${clientId}`);
    revalidatePath("/");
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error updating client", error);
    return null;
  }
};

export const uploadClientDocument = async (clientId: string, formData: FormData) => {
  try {
    const file = formData.get("file") as File;
    const documentType = formData.get("documentType") as string;
    const documentName = formData.get("documentName") as string;
    const uploadedBy = formData.get("uploadedBy") as string;

    if (!file || !documentType || !documentName) return null;

    // 1. Convert to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // 2. Upload to Storage
    const path = generateClientAssetPath(clientId, "documents", file.name);
    const uploadResult = await uploadClientAsset(path, arrayBuffer, file.type);
    
    if (!uploadResult) throw new Error("Failed to upload document to storage");

    // 3. Insert into Database
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("client_documents")
      .insert({
        client_id: clientId,
        document_type: documentType,
        document_name: documentName,
        file_path: uploadResult.path,
        file_url: uploadResult.url,
        uploaded_by: uploadedBy || "System",
      })
      .select()
      .single();

    if (error) {
      // Rollback storage upload if DB insert fails
      await deleteClientAsset(uploadResult.path);
      throw error;
    }

    revalidatePath(`/clients/${clientId}`);
    return parseStringify(data);
  } catch (error) {
    console.error("Error uploading client document:", error);
    return null;
  }
};

