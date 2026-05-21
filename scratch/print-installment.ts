import { createSupabaseAdminClient } from "../lib/supabase";

async function printInstallment() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("loan_installments")
    .select("*")
    .limit(5);

  if (error) {
    console.error("Error fetching installments:", error);
  } else {
    console.log("Current installments in DB:", JSON.stringify(data, null, 2));
  }
}

printInstallment().catch(console.error);
