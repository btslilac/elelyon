// Enable test suite environment bypass before any action imports
process.env.TEST_SUITE = "true";

import { createSupabaseAdminClient } from "../lib/supabase";
import { waiveLoanBalance } from "../lib/actions/loan.actions";

async function runWaiverTest() {
  console.log("=== STARTING BALANCE WAIVER SIMULATION TEST ===");
  const supabase = createSupabaseAdminClient();

  // 1. Fetch a valid client ID from DB
  const { data: clients, error: clientErr } = await supabase
    .from("clients")
    .select("id")
    .limit(1);
  
  if (clientErr || !clients || clients.length === 0) {
    console.error("❌ Failed to fetch client ID. Ensure clients exist in DB:", clientErr);
    process.exit(1);
  }

  const clientId = clients[0].id;
  console.log(`Using Client ID: ${clientId}`);

  let loanId: string | null = null;

  try {
    // 2. Setup Initial Loan State: principal = 10000, interest = 4000, penalties = 2000. (Total Due: 16000)
    console.log("\n--- Setting up Initial State ---");
    const { data: loan, error: loanErr } = await supabase
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

    if (loanErr || !loan) {
      throw new Error(`Failed to create test loan: ${loanErr?.message}`);
    }

    loanId = loan.id;
    console.log(`Created Loan ID: ${loanId}`);

    // Create primary installment
    const { error: instErr } = await supabase
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

    if (instErr) {
      throw new Error(`Failed to create test installment: ${instErr.message}`);
    }

    // Verify initial values
    let { data: state0 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Initial] Principal: ${state0.remaining_principal}, Interest: ${state0.remaining_interest}, Penalty: ${state0.remaining_penalties}, Total Balance: ${state0.balance}`);
    if (
      Number(state0.remaining_principal) !== 10000 ||
      Number(state0.remaining_interest) !== 4000 ||
      Number(state0.remaining_penalties) !== 2000
    ) {
      throw new Error("Initial state mismatch!");
    }
    console.log("✅ Initial State Verified!");

    // ==========================================
    // STEP 1: Waive Interest (KES 1,500)
    // ==========================================
    console.log("\n--- Executing Step 1: Waive KES 1,500 Interest ---");
    const res1 = await waiveLoanBalance(loanId!, "Interest", 1500, "Waiver test of KES 1500 interest");
    if (!res1) {
      throw new Error("Interest waiver execution returned null/void");
    }

    let { data: state1 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Waiver 1] Principal: ${state1.remaining_principal}, Interest: ${state1.remaining_interest}, Penalty: ${state1.remaining_penalties}`);
    if (Number(state1.remaining_interest) !== 2500) {
      throw new Error("❌ Remaining interest did not reduce correctly!");
    }
    
    // Verify that Waiver transaction exists in loan_transactions
    const { data: tx1, error: tx1Err } = await supabase
      .from("loan_transactions")
      .select("*")
      .eq("loan_id", loanId)
      .eq("type", "Waiver")
      .eq("comment", "Waiver test of KES 1500 interest")
      .single();

    if (tx1Err || !tx1) {
      throw new Error(`❌ Failed to log interest waiver transaction: ${tx1Err?.message}`);
    }
    console.log(`[Waiver 1 Transaction] Amount: ${tx1.amount}, Allocated Interest: ${tx1.allocated_current_interest}`);
    if (Number(tx1.amount) !== 1500 || Number(tx1.allocated_current_interest) !== 1500) {
      throw new Error("❌ Transaction allocations incorrect!");
    }
    console.log("✅ Step 1: Interest Waiver Verified!");

    // ==========================================
    // STEP 2: Waive Penalties (KES 2,000 - Full)
    // ==========================================
    await waiveLoanBalance(loanId!, "Penalty", 2000, "Waiver test of full outstanding penalties");

    let { data: state2 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Waiver 2] Principal: ${state2.remaining_principal}, Interest: ${state2.remaining_interest}, Penalty: ${state2.remaining_penalties}`);
    if (Number(state2.remaining_penalties) !== 0) {
      throw new Error("❌ Remaining penalties did not reduce correctly!");
    }

    // Verify installment penalties updated
    const { data: insts2 } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loanId)
      .order("installment_number", { ascending: true });

    if (!insts2 || insts2.length === 0) {
      throw new Error("❌ Installments disappeared!");
    }
    console.log(`[Installment 1 Penalties] Outstanding: ${Number(insts2[0].penalties_due) - Number(insts2[0].penalties_paid)}`);
    if (Number(insts2[0].penalties_due) !== 0) {
      throw new Error("❌ Installment penalties_due was not reduced!");
    }
    console.log("✅ Step 2: Penalty Waiver Verified!");

    // ==========================================
    // STEP 3: Waive Principal (KES 5,000)
    // ==========================================
    await waiveLoanBalance(loanId!, "Principal", 5000, "Waiver test of KES 5000 principal");

    let { data: state3 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Waiver 3] Principal: ${state3.remaining_principal}, Interest: ${state3.remaining_interest}, Penalty: ${state3.remaining_penalties}`);
    if (Number(state3.remaining_principal) !== 5000) {
      throw new Error("❌ Remaining principal did not reduce correctly!");
    }
    console.log("✅ Step 3: Principal Waiver Verified!");

    console.log("\n🎉 ALL BALANCE WAIVER TESTS COMPLETED SUCCESSFULLY! 🎉");

  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
  } finally {
    if (loanId) {
      console.log("\n--- Tearing Down Temporary Test Records ---");
      await supabase.from("loan_installments").delete().eq("loan_id", loanId);
      await supabase.from("loan_transactions").delete().eq("loan_id", loanId);
      await supabase.from("loans").delete().eq("id", loanId);
      console.log("✅ Teardown complete. DB Clean.");
    }
  }
}

runWaiverTest().catch(console.error);
