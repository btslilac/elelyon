"use server";

import { createSupabaseServerClient, createSupabaseAdminClient } from "../supabase";
import { parseStringify } from "../utils";
import { cookies } from "next/headers";

// ─── Row → Domain mappers ────────────────────────────────────────────────────

function mapUserRow(row: any): User | null {
  if (!row) return null;
  return {
    $id: row.id,
    userId: row.auth_id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    role: row.role,
    userStatus: row.user_status,
  } as any;
}

// ─── getUserInfo ─────────────────────────────────────────────────────────────

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const supabase = createSupabaseAdminClient();

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .maybeSingle();

    if (error || !data) return null;
    return parseStringify(mapUserRow(data));
  } catch (error) {
    console.error("getUserInfo error:", error);
    return null;
  }
};

// ─── signIn ──────────────────────────────────────────────────────────────────

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.session) {
      console.error("signIn auth error:", authError);
      return null;
    }

    const adminSupabase = createSupabaseAdminClient();
    let { data: userRow } = await adminSupabase
      .from("users")
      .select("*")
      .eq("auth_id", authData.user.id)
      .maybeSingle();

    // Auto-recovery: if no profile document exists, create one
    if (!userRow) {
      console.warn(
        "No user profile found for auth_id:",
        authData.user.id,
        "— attempting auto-recovery."
      );
      const meta = authData.user.user_metadata ?? {};
      const nameParts = (authData.user.email ?? "System User").split("@");
      const firstName = meta.first_name ?? meta.firstName ?? nameParts[0] ?? "System";
      const lastName = meta.last_name ?? meta.lastName ?? "Admin";

      const { data: recovered, error: recoverError } = await adminSupabase
        .from("users")
        .insert({
          auth_id: authData.user.id,
          email: authData.user.email,
          first_name: firstName,
          last_name: lastName,
          role: "ADMIN",
          user_status: "active",
        })
        .select()
        .single();

      if (recoverError) {
        console.error("Auto-recovery failed:", recoverError);
        return null;
      }
      userRow = recovered;
    }

    // Fail-safe: auto-grant ADMIN to the owner's email
    if (userRow && userRow.email === "timtheesam@gmail.com" && userRow.role !== "ADMIN") {
      const { data: escalated } = await adminSupabase
        .from("users")
        .update({ role: "ADMIN" })
        .eq("id", userRow.id)
        .select()
        .single();
      if (escalated) {
        userRow = escalated;
        console.log("Auto-escalated timtheesam@gmail.com to ADMIN.");
      }
    }

    return parseStringify(mapUserRow(userRow));
  } catch (error) {
    console.error("signIn Error:", error);
    return null;
  }
};

// ─── signUp ──────────────────────────────────────────────────────────────────

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    const adminSupabase = createSupabaseAdminClient();

    // 1. Create auth user (pre-confirmed so no email verification needed)
    const { data: authData, error: authError } =
      await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? "Error creating auth user");
    }

    // 2. Create user profile row
    const { data: profileRow, error: profileError } = await adminSupabase
      .from("users")
      .insert({
        auth_id: authData.user.id,
        email,
        first_name: firstName,
        last_name: lastName,
        role: "STAFF",
        user_status: "active",
      })
      .select()
      .single();

    if (profileError) {
      // Rollback: delete the auth user so the DB stays consistent
      await adminSupabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(
        "Failed to create user profile. Rolling back auth account."
      );
    }

    // 3. Sign in immediately so the session cookie is set
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signInWithPassword({ email, password });

    return parseStringify(mapUserRow(profileRow));
  } catch (error: any) {
    console.error("signUp Error:", error);
    throw error;
  }
};

// ─── getLoggedInUser ─────────────────────────────────────────────────────────

export async function getLoggedInUser() {
  try {
    const supabase = await createSupabaseServerClient();

    // Use getSession() — reads the JWT from the cookie with zero network calls.
    // The middleware already validates & refreshes the token on every request,
    // so by the time this runs the session in the cookie is current.
    // Using getUser() here causes parallel server actions to race on the same
    // refresh token, producing "refresh_token_already_used" errors.
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) return null;

    const profile = await getUserInfo({ userId: session.user.id });
    return parseStringify(profile);
  } catch (error) {
    return null;
  }
}

// ─── logoutAccount ───────────────────────────────────────────────────────────

export const logoutAccount = async () => {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    return null;
  }
};

// ─── requestPasswordReset ─────────────────────────────────────────────────────
// Sends a password-reset email via Supabase Auth.
// redirectTo must be an absolute URL — Supabase appends the one-time token as a
// query param and the user lands on that page after clicking the link in email.

export const requestPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createSupabaseServerClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/reset-password`,
    });

    if (error) {
      console.error("requestPasswordReset error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("requestPasswordReset unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
};

// ─── updatePassword ───────────────────────────────────────────────────────────
// Called on the /reset-password page after Supabase has exchanged the token for
// a session. At that point the user is authenticated and we can update password.

export const updatePassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      console.error("updatePassword error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("updatePassword unexpected error:", err);
    return { success: false, error: "An unexpected error occurred." };
  }
};