import { createSupabaseAdminClient } from "../lib/supabase";

async function checkDatabase() {
  const supabase = createSupabaseAdminClient();

  console.log("Checking loan_modifications table...");
  const { data: modTable, error: modError } = await supabase
    .from("loan_modifications")
    .select("count")
    .limit(1);

  if (modError) {
    console.log("loan_modifications does not exist or error:", modError.message);
  } else {
    console.log("loan_modifications table exists!");
  }

  console.log("Checking transaction types...");
  const { data: txData, error: txError } = await supabase
    .from("loan_transactions")
    .select("type")
    .limit(1);

  if (txError) {
    console.error("Error querying loan_transactions:", txError.message);
  } else {
    console.log("Successfully connected to loan_transactions!");
  }

  // Let's run a query to check the transaction_type enum values from PostgreSQL if possible
  const { data: enumData, error: enumError } = await supabase.rpc("exec_sql", {
    query_text: "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'transaction_type'"
  });

  if (enumError) {
    console.log("exec_sql RPC check failed (as expected if no exec_sql RPC is defined):", enumError.message);
  } else {
    console.log("transaction_type enum values in DB:", enumData);
  }
}

checkDatabase().catch(console.error);
