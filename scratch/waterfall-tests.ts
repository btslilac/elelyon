// Enable test suite environment bypass before any action imports
process.env.TEST_SUITE = "true";

import { createSupabaseAdminClient } from "../lib/supabase";
import { processRepayment } from "../lib/actions/repayment.actions";
import { rolloverLoan } from "../lib/actions/loan.actions";

async function runWaterfallTest() {
  console.log("=== STARTING WATERFALL SIMULATION TEST ===");
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
    // 2. Setup Initial Loan State: principal = 10000, interest = 4000. (Total Due: 14000)
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
        remaining_penalties: 0,
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
        status: "Pending",
      });

    if (instErr) {
      throw new Error(`Failed to create test installment: ${instErr.message}`);
    }

    // Verify initial values
    let { data: state0 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Initial] Principal: ${state0.remaining_principal}, Interest: ${state0.remaining_interest}, Balance (Total Due): ${state0.balance}`);
    if (Number(state0.remaining_principal) !== 10000 || Number(state0.remaining_interest) !== 4000 || Number(state0.balance) !== 14000) {
      throw new Error("Initial state mismatch!");
    }
    console.log("✅ Initial State Verified!");

    // ==========================================
    // MONTH 1 (3000 paid + Rollover)
    // ==========================================
    console.log("\n--- Executing Month 1 Simulation ---");
    const rep1 = await processRepayment({
      loanId: loanId!,
      amount: 3000,
      paymentMethod: "M-Pesa",
      performedBy: "Test Suite",
    });

    if (!rep1.success) {
      throw new Error(`Month 1 repayment failed: ${rep1.error}`);
    }

    // Rollover with 40% fee and 1 month extension
    await rolloverLoan(loanId!, 1, 40);

    let { data: state1 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Month 1] Principal: ${state1.remaining_principal}, Interest: ${state1.remaining_interest}, Balance (Total Due): ${state1.balance}`);
    
    if (
      Number(state1.remaining_principal) !== 10000 ||
      Number(state1.remaining_interest) !== 5000 ||
      Number(state1.balance) !== 15000
    ) {
      throw new Error("❌ Month 1 State Assertion Failed!");
    }
    console.log("✅ Month 1 Verification Passed!");

    // ==========================================
    // MONTH 2 (3000 paid + Rollover)
    // ==========================================
    console.log("\n--- Executing Month 2 Simulation ---");
    const rep2 = await processRepayment({
      loanId: loanId!,
      amount: 3000,
      paymentMethod: "M-Pesa",
      performedBy: "Test Suite",
    });

    if (!rep2.success) {
      throw new Error(`Month 2 repayment failed: ${rep2.error}`);
    }

    await rolloverLoan(loanId!, 1, 40);

    let { data: state2 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Month 2] Principal: ${state2.remaining_principal}, Interest: ${state2.remaining_interest}, Balance (Total Due): ${state2.balance}`);
    
    if (
      Number(state2.remaining_principal) !== 10000 ||
      Number(state2.remaining_interest) !== 6000 ||
      Number(state2.balance) !== 16000
    ) {
      throw new Error("❌ Month 2 State Assertion Failed!");
    }
    console.log("✅ Month 2 Verification Passed!");

    // ==========================================
    // MONTH 3 (7000 paid + Rollover)
    // ==========================================
    console.log("\n--- Executing Month 3 Simulation ---");
    const rep3 = await processRepayment({
      loanId: loanId!,
      amount: 7000,
      paymentMethod: "M-Pesa",
      performedBy: "Test Suite",
    });

    if (!rep3.success) {
      throw new Error(`Month 3 repayment failed: ${rep3.error}`);
    }

    await rolloverLoan(loanId!, 1, 40);

    let { data: state3 } = await supabase.from("loans").select("*").eq("id", loanId).single();
    console.log(`[Month 3] Principal: ${state3.remaining_principal}, Interest: ${state3.remaining_interest}, Balance (Total Due): ${state3.balance}`);
    
    if (
      Number(state3.remaining_principal) !== 9000 ||
      Number(state3.remaining_interest) !== 3600 ||
      Number(state3.balance) !== 12600
    ) {
      throw new Error("❌ Month 3 State Assertion Failed!");
    }
    console.log("✅ Month 3 Verification Passed!");

    console.log("\n🎉 ALL MULTI-MONTH WATERFALL TESTS COMPLETED SUCCESSFULLY! 🎉");

  } catch (err: any) {
    console.error("\n❌ Simulation Failed with Error:", err);
    process.exit(1);
  } finally {
    // 3. Tear down and clean up temporary records
    if (loanId) {
      console.log("\n--- Tearing Down Temporary Test Records ---");
      const { error: deleteErr } = await supabase
        .from("loans")
        .delete()
        .eq("id", loanId);

      if (deleteErr) {
        console.error("❌ Failed to clean up test records:", deleteErr);
      } else {
        console.log("✅ Teardown complete. DB Clean.");
      }
    }
  }
}

runWaterfallTest();
