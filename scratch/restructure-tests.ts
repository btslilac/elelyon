// Enable test suite environment bypass before any action imports
process.env.TEST_SUITE = "true";

import { createSupabaseAdminClient } from "../lib/supabase";
import { restructureLoan } from "../lib/actions/loan.actions";

async function runRestructureTest() {
  console.log("=== STARTING AUDIT-COMPLIANT LOAN RESTRUCTURE SIMULATION TEST ===");
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

  let loan1Id: string | null = null;
  let loan2Id: string | null = null;

  try {
    // ==========================================
    // TEST 1: Scenario B - Capitalized Interest
    // ==========================================
    console.log("\n--- [TEST 1] Setting up Scenario B: Capitalized Interest ---");
    const { data: loan1, error: loan1Err } = await supabase
      .from("loans")
      .insert({
        client_id: clientId,
        principal_amount: 10000,
        interest_rate: 2.0,
        duration_in_months: 1,
        interest_type: "Flat",
        total_payable: 12000,
        total_interest: 2000,
        remaining_principal: 10000,
        remaining_interest: 2000,
        remaining_penalties: 0,
        remaining_fees: 0,
        status: "Active",
        start_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (loan1Err || !loan1) {
      throw new Error(`Failed to create test loan 1: ${loan1Err?.message}`);
    }
    loan1Id = loan1.id;
    console.log(`Created Loan 1 ID: ${loan1Id}`);

    // Create a partially-paid unsettled installment (amount_paid > 0)
    // principal_due = 10000, interest_due = 2000
    // principal_paid = 1000, interest_paid = 0
    const { error: inst1Err } = await supabase
      .from("loan_installments")
      .insert({
        loan_id: loan1Id,
        client_id: clientId,
        installment_number: 1,
        due_date: new Date().toISOString(),
        principal_due: 10000,
        interest_due: 2000,
        principal_paid: 1000,
        interest_paid: 0,
        status: "Pending",
      });

    if (inst1Err) {
      throw new Error(`Failed to create test installment for loan 1: ${inst1Err.message}`);
    }

    // Update remaining principal to reflect the partial payment
    await supabase
      .from("loans")
      .update({ remaining_principal: 9000 })
      .eq("id", loan1Id);

    // Call restructureLoan for Scenario B
    // Outstanding remaining principal is 9000. We roll the unpaid interest (1000 or whatever) into it, resulting in new principal of 11000.
    // principalAdjustment = 11000 - 9000 = +2000 (Scenario B!)
    console.log("\n--- Executing restructureLoan for Scenario B (Capitalized Interest) ---");
    const result1 = await restructureLoan(loan1Id!, {
      principalAmount: 11000,
      interestRate: 3.0,
      durationInMonths: 3,
      interestType: "Reducing",
      reason: "Audit-compliant capitalized interest restructure testing",
    });

    if (!result1) {
      throw new Error("restructureLoan returned null/void");
    }

    console.log("Checking database updates...");
    
    // A. Verify master loan record
    const { data: updatedLoan1 } = await supabase.from("loans").select("*").eq("id", loan1Id).single();
    console.log(`[Loan 1 Post] principal_amount: ${updatedLoan1.principal_amount}, remaining_principal: ${updatedLoan1.remaining_principal}, remaining_interest: ${updatedLoan1.remaining_interest}, lifecycle_state: ${updatedLoan1.lifecycle_state}`);
    if (
      Number(updatedLoan1.principal_amount) !== 11000 ||
      Number(updatedLoan1.remaining_principal) !== 11000 ||
      updatedLoan1.lifecycle_state !== "Restructured"
    ) {
      throw new Error("❌ Master loan 1 fields were not updated correctly!");
    }

    // B. Verify LoanModification snapshot log
    const { data: mod1, error: mod1Err } = await supabase
      .from("loan_modifications")
      .select("*")
      .eq("loan_id", loan1Id)
      .single();

    if (mod1Err || !mod1) {
      throw new Error(`❌ Failed to retrieve loan modification log: ${mod1Err?.message}`);
    }
    console.log(`[Modification 1 Log] pre_principal: ${mod1.pre_principal}, post_principal: ${mod1.post_principal}, reason: "${mod1.reason}"`);
    if (
      Number(mod1.pre_principal) !== 10000 ||
      Number(mod1.pre_remaining_principal) !== 9000 ||
      Number(mod1.post_principal) !== 11000 ||
      mod1.reason !== "Audit-compliant capitalized interest restructure testing"
    ) {
      throw new Error("❌ LoanModification snapshot content mismatch!");
    }

    // C. Verify Journal Entries (Scenario B)
    const { data: jes1, error: jes1Err } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("modification_id", mod1.id);

    if (jes1Err || !jes1 || jes1.length !== 2) {
      throw new Error(`❌ Scenario B journal entries count mismatch: ${jes1Err?.message || "Expected 2 entries"}`);
    }

    const debitJe1 = jes1.find(je => je.entry_type === "DEBIT");
    const creditJe1 = jes1.find(je => je.entry_type === "CREDIT");
    console.log(`[Scenario B Journal] DR ${debitJe1.account_code}: ${debitJe1.amount}, CR ${creditJe1.account_code}: ${creditJe1.amount}`);

    if (
      debitJe1.account_code !== "LOAN_RECEIVABLES_PRINCIPAL" ||
      Number(debitJe1.amount) !== 2000 ||
      creditJe1.account_code !== "INTEREST_RECEIVABLES" ||
      Number(creditJe1.amount) !== 2000
    ) {
      throw new Error("❌ Scenario B double-entry ledger content mismatch!");
    }

    // D. Verify Soft-closed installments (Superseded & Preserved)
    const { data: insts1 } = await supabase
      .from("loan_installments")
      .select("*")
      .eq("loan_id", loan1Id)
      .order("installment_number", { ascending: true });

    if (!insts1) {
      throw new Error("❌ No installments found for loan 1");
    }

    console.log(`[Installment Count] Total: ${insts1.length}`);
    const superseded1 = insts1.filter(inst => inst.status === "Superseded");
    const pending1 = insts1.filter(inst => inst.status === "Pending");

    if (superseded1.length !== 1 || pending1.length !== 3) {
      throw new Error(`❌ Installment states mismatch! Superseded: ${superseded1.length} (Expected 1), Pending: ${pending1.length} (Expected 3)`);
    }

    if (Number(superseded1[0].principal_paid) !== 1000) {
      throw new Error("❌ Partially paid superseded installment was wiped out!");
    }
    console.log("✅ Scenario B: Capitalized Interest Verified Successfully!");


    // ==========================================
    // TEST 2: Scenario A - Impairment Write-off / Haircut
    // ==========================================
    console.log("\n--- [TEST 2] Setting up Scenario A: Impairment Write-off / Haircut ---");
    const { data: loan2, error: loan2Err } = await supabase
      .from("loans")
      .insert({
        client_id: clientId,
        principal_amount: 15000,
        interest_rate: 3.0,
        duration_in_months: 1,
        interest_type: "Flat",
        total_payable: 18000,
        total_interest: 3000,
        remaining_principal: 15000,
        remaining_interest: 3000,
        remaining_penalties: 0,
        remaining_fees: 0,
        status: "Active",
        start_date: new Date().toISOString(),
        due_date: new Date().toISOString(),
      })
      .select()
      .single();

    if (loan2Err || !loan2) {
      throw new Error(`Failed to create test loan 2: ${loan2Err?.message}`);
    }
    loan2Id = loan2.id;
    console.log(`Created Loan 2 ID: ${loan2Id}`);

    // Create unsettled installment (amount_paid == 0)
    const { error: inst2Err } = await supabase
      .from("loan_installments")
      .insert({
        loan_id: loan2Id,
        client_id: clientId,
        installment_number: 1,
        due_date: new Date().toISOString(),
        principal_due: 15000,
        interest_due: 3000,
        status: "Pending",
      });

    if (inst2Err) {
      throw new Error(`Failed to create test installment for loan 2: ${inst2Err.message}`);
    }

    // Call restructureLoan for Scenario A
    // Outstanding remaining principal is 15000. We do a haircut, setting the new principal to 12000.
    // principalAdjustment = 12000 - 15000 = -3000 (Scenario A!)
    console.log("\n--- Executing restructureLoan for Scenario A (Write-off Haircut) ---");
    await restructureLoan(loan2Id!, {
      principalAmount: 12000,
      interestRate: 4.0,
      durationInMonths: 2,
      interestType: "Flat",
      reason: "Audit-compliant impairment write-off haircut restructure testing",
    });

    console.log("Checking database updates...");

    // A. Verify master loan record
    const { data: updatedLoan2 } = await supabase.from("loans").select("*").eq("id", loan2Id).single();
    console.log(`[Loan 2 Post] principal_amount: ${updatedLoan2.principal_amount}, remaining_principal: ${updatedLoan2.remaining_principal}, remaining_interest: ${updatedLoan2.remaining_interest}`);
    if (
      Number(updatedLoan2.principal_amount) !== 12000 ||
      Number(updatedLoan2.remaining_principal) !== 12000 ||
      updatedLoan2.lifecycle_state !== "Restructured"
    ) {
      throw new Error("❌ Master loan 2 fields were not updated correctly!");
    }

    // B. Verify LoanModification snapshot log
    const { data: mod2, error: mod2Err } = await supabase
      .from("loan_modifications")
      .select("*")
      .eq("loan_id", loan2Id)
      .single();

    if (mod2Err || !mod2) {
      throw new Error(`❌ Failed to retrieve loan modification log: ${mod2Err?.message}`);
    }
    console.log(`[Modification 2 Log] pre_principal: ${mod2.pre_principal}, post_principal: ${mod2.post_principal}`);
    if (
      Number(mod2.pre_principal) !== 15000 ||
      Number(mod2.pre_remaining_principal) !== 15000 ||
      Number(mod2.post_principal) !== 12000 ||
      mod2.reason !== "Audit-compliant impairment write-off haircut restructure testing"
    ) {
      throw new Error("❌ LoanModification snapshot content mismatch!");
    }

    // C. Verify Journal Entries (Scenario A)
    const { data: jes2, error: jes2Err } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("modification_id", mod2.id);

    if (jes2Err || !jes2 || jes2.length !== 2) {
      throw new Error(`❌ Scenario A journal entries count mismatch: ${jes2Err?.message || "Expected 2 entries"}`);
    }

    const debitJe2 = jes2.find(je => je.entry_type === "DEBIT");
    const creditJe2 = jes2.find(je => je.entry_type === "CREDIT");
    console.log(`[Scenario A Journal] DR ${debitJe2.account_code}: ${debitJe2.amount}, CR ${creditJe2.account_code}: ${creditJe2.amount}`);

    if (
      debitJe2.account_code !== "LOAN_IMPAIRMENT_EXPENSE" ||
      Number(debitJe2.amount) !== 3000 ||
      creditJe2.account_code !== "LOAN_RECEIVABLES_PRINCIPAL" ||
      Number(creditJe2.amount) !== 3000
    ) {
      throw new Error("❌ Scenario A double-entry ledger content mismatch!");
    }
    console.log("✅ Scenario A: Impairment Write-off Haircut Verified Successfully!");

    console.log("\n🎉 ALL AUDIT-COMPLIANT RESTRUCTURING ENGINE TESTS COMPLETED SUCCESSFULLY! 🎉");

  } catch (error: any) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error(error.stack);
  } finally {
    // Teardown
    console.log("\n--- Tearing Down Temporary Test Records ---");
    if (loan1Id) {
      await supabase.from("loan_installments").delete().eq("loan_id", loan1Id);
      await supabase.from("loans").delete().eq("id", loan1Id);
    }
    if (loan2Id) {
      await supabase.from("loan_installments").delete().eq("loan_id", loan2Id);
      await supabase.from("loans").delete().eq("id", loan2Id);
    }
    console.log("✅ Teardown complete. DB Clean.");
  }
}

runRestructureTest().catch(console.error);
