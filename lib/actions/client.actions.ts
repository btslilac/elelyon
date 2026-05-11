"use server";

import { createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { revalidatePath } from "next/cache";

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
    $createdAt: row.created_at,
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
    return parseStringify(data.map(mapClientRow));
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

    const { data, error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", clientId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath("/clients");
    revalidatePath("/");
    return parseStringify(mapClientRow(data));
  } catch (error) {
    console.error("Error updating client", error);
    return null;
  }
};
