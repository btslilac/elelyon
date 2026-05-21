process.env.TEST_SUITE = "true";

import { createSupabaseAdminClient } from "../lib/supabase";
import { waiveLoanBalance } from "../lib/actions/loan.actions";

async function debugWaiver() {
  console.log("=== STARTING WAIVER DEBUGGING ===");
  const supabase = createSupabaseAdminClient();

  const { data: clients } = await supabase.from("clients").select("id").limit(1);
  const clientId = clients![0].id;

  // Create loan
  const { data: loan } = await supabase
    .from("loans")
    .insert({
      client_id: clientId,
      principal_amount: 10000,
      interest_rate: 0.40,
      duration_in_months: 1,
      interest_type: "Flat",
      total_payable: 14000,
      total_interest: 4000,
      remaining_principal: 10000,
      remaining_interest: 4000,
      remaining_penalties: 2000,
      remaining_fees: 0,
      status: "Active",
      start_date: new Date().toISOString(),
      due_date: new Date().toISOString(),
    })
    .select()
    .single();

  const loanId = loan.id;
  console.log("Created loan:", loanId);

  // Create installment
  await supabase
    .from("loan_installments")
    .insert({
      loan_id: loanId,
      client_id: clientId,
      installment_number: 1,
      due_date: new Date().toISOString(),
      principal_due: 10000,
      interest_due: 4000,
      penalties_due: 2000,
      status: "Overdue",
    });

  // Query and log installment state 0 (Initial)
  const { data: insts0 } = await supabase.from("loan_installments").select("*").eq("loan_id", loanId);
  console.log("State 0 (Initial):", insts0);

  // Waive Interest
  await waiveLoanBalance(loanId, "Interest", 1500, "Waiver of interest");
  const { data: insts1 } = await supabase.from("loan_installments").select("*").eq("loan_id", loanId);
  console.log("State 1 (After Interest Waiver):", insts1);

  // Waive Penalties
  await waiveLoanBalance(loanId, "Penalty", 2000, "Waiver of penalties");
  const { data: insts2 } = await supabase.from("loan_installments").select("*").eq("loan_id", loanId);
  console.log("State 2 (After Penalty Waiver):", insts2);

  // Clean up
  await supabase.from("loan_installments").delete().eq("loan_id", loanId);
  await supabase.from("loan_transactions").delete().eq("loan_id", loanId);
  await supabase.from("loans").delete().eq("id", loanId);
  console.log("Teardown complete!");
}

debugWaiver().catch(console.error);
