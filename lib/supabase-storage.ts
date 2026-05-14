"use server";

import { createSupabaseAdminClient } from "./supabase";

const BUCKET = "client-assets";

/**
 * Upload a file buffer to Supabase Storage using the service-role admin client.
 * Bypasses RLS — safe for server actions only.
 *
 * Storage structure:
 *   client-assets/
 *     clients/{clientId}/profile/
 *     clients/{clientId}/documents/
 *     clients/{clientId}/signatures/
 */
export async function uploadClientAsset(
  path: string,
  fileBuffer: ArrayBuffer,
  mimeType: string
): Promise<{ url: string; path: string } | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(path, fileBuffer, {
        contentType: mimeType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path);
    return { url: urlData.publicUrl, path: data.path };
  } catch (err) {
    console.error("[StorageService] upload error:", err);
    return null;
  }
}

/**
 * Delete a file from Supabase Storage using the service-role admin client.
 */
export async function deleteClientAsset(path: string): Promise<boolean> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error("[StorageService] delete error:", err);
    return false;
  }
}

