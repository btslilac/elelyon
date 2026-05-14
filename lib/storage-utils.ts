/**
 * Pure utility helpers for Supabase Storage paths and URLs.
 * No "use server" — safe to import from both server and client code.
 */

/**
 * Generate a unique, collision-safe storage path for a client asset.
 * Storage structure:
 *   client-assets/
 *     clients/{clientId}/profile/
 *     clients/{clientId}/documents/
 *     clients/{clientId}/signatures/
 */
export function generateClientAssetPath(
  clientId: string,
  type: "profile" | "documents" | "signatures",
  fileName: string
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  const timestamp = Date.now();
  return `clients/${clientId}/${type}/${type}-${timestamp}.${ext}`;
}

/**
 * Build the public URL for a stored asset without hitting the network.
 */
export function getClientAssetPublicUrl(path: string): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${url}/storage/v1/object/public/client-assets/${path}`;
}
