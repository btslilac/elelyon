import { createSupabaseAdminClient } from "../lib/supabase";

async function testWaiverInsert() {
  const supabase = createSupabaseAdminClient();

  // 1. Fetch a client
  const { data: clients } = await supabase.from("clients").select("id").limit(1);
  if (!clients || clients.length === 0) {
    console.log("No clients found in database.");
    return;
  }
  const clientId = clients[0].id;

  // 2. Fetch a loan
  const { data: loans } = await supabase.from("loans").select("id").limit(1);
  if (!loans || loans.length === 0) {
    console.log("No loans found in database.");
    return;
  }
  const loanId = loans[0].id;

  console.log("Attempting to insert a mock Waiver transaction...");
  const { data, error } = await supabase.from("loan_transactions").insert({
    loan_id: loanId,
    client_id: clientId,
    amount: 1,
    type: "Waiver",
    payment_method: "Waiver",
    comment: "TEST_ENUM_CHECK",
    applied_by: "Test Checker",
    date: new Date().toISOString(),
    status: "Active"
  }).select();

  if (error) {
    console.log("❌ Insert failed:", error.message);
  } else {
    console.log("✅ Insert succeeded! The 'Waiver' enum value is supported in the DB.");
    // Clean up
    if (data && data[0]) {
      await supabase.from("loan_transactions").delete().eq("id", data[0].id);
      console.log("Cleaned up mock transaction.");
    }
  }
}

testWaiverInsert().catch(console.error);
