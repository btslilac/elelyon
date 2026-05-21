-- ============================================================
-- Elelyon LMS — Schema & RPC Migration for Restructuring Engine
-- ============================================================

-- 1. Create loan_modifications table to log pre-flight & post-flight terms
CREATE TABLE IF NOT EXISTS loan_modifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    modification_type TEXT NOT NULL DEFAULT 'RESTRUCTURE',
    
    -- Snapshots of the contract before restructuring
    pre_principal NUMERIC(20, 4) NOT NULL,
    pre_interest_rate NUMERIC(8, 4) NOT NULL,
    pre_duration_mths INT NOT NULL,
    pre_interest_type TEXT NOT NULL,
    pre_remaining_principal NUMERIC(20, 4) NOT NULL,
    pre_remaining_interest NUMERIC(20, 4) NOT NULL,
    
    -- Numerical adjustments
    principal_adjustment NUMERIC(20, 4) NOT NULL,
    interest_adjustment NUMERIC(20, 4) NOT NULL,
    
    -- Target terms after restructuring
    post_principal NUMERIC(20, 4) NOT NULL,
    post_interest_rate NUMERIC(8, 4) NOT NULL,
    post_duration_mths INT NOT NULL,
    post_interest_type TEXT NOT NULL,
    post_remaining_principal NUMERIC(20, 4) NOT NULL,
    post_remaining_interest NUMERIC(20, 4) NOT NULL,
    
    executed_by UUID REFERENCES users(id),
    reason TEXT NOT NULL CHECK (char_length(reason) >= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create journal_entries table for balanced double-entry ledger bookkeeping
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modification_id UUID NOT NULL REFERENCES loan_modifications(id) ON DELETE CASCADE,
    account_code TEXT NOT NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Add modification_id to loan_installments to track superseded rows
ALTER TABLE loan_installments
ADD COLUMN IF NOT EXISTS modification_id UUID REFERENCES loan_modifications(id) ON DELETE SET NULL;

-- 4. Create database transaction function for atomic loan restructuring
CREATE OR REPLACE FUNCTION apply_loan_restructure(
    p_loan_id UUID,
    p_executed_by UUID,
    p_reason TEXT,
    -- Pre-flight snapshot terms
    p_pre_principal NUMERIC(20, 4),
    p_pre_interest_rate NUMERIC(8, 4),
    p_pre_duration_mths INT,
    p_pre_interest_type TEXT,
    p_pre_remaining_principal NUMERIC(20, 4),
    p_pre_remaining_interest NUMERIC(20, 4),
    -- Numerical adjustments
    p_principal_adjustment NUMERIC(20, 4),
    p_interest_adjustment NUMERIC(20, 4),
    -- Post-flight target terms
    p_post_principal NUMERIC(20, 4),
    p_post_interest_rate NUMERIC(8, 4),
    p_post_duration_mths INT,
    p_post_interest_type TEXT,
    p_post_remaining_principal NUMERIC(20, 4),
    p_post_remaining_interest NUMERIC(20, 4),
    -- Journal Entries
    p_journal_entries JSONB,
    -- New Installments
    p_new_installments JSONB
) RETURNS UUID AS $$
DECLARE
    v_modification_id UUID;
    v_je RECORD;
    v_inst RECORD;
    v_client_id UUID;
    v_total_interest_before NUMERIC(20,4);
    v_remaining_interest_before NUMERIC(20,4);
    v_total_payable_before NUMERIC(20,4);
    v_remaining_principal_before NUMERIC(20,4);
    v_remaining_fees_before NUMERIC(20,4);
    v_remaining_penalties_before NUMERIC(20,4);
    v_client_outstanding_balance NUMERIC(20,4);
BEGIN
    -- 1. Fetch baseline loan metrics
    SELECT client_id, total_interest, remaining_interest, total_payable, remaining_principal, remaining_fees, remaining_penalties
    INTO v_client_id, v_total_interest_before, v_remaining_interest_before, v_total_payable_before, v_remaining_principal_before, v_remaining_fees_before, v_remaining_penalties_before
    FROM loans
    WHERE id = p_loan_id;

    IF v_client_id IS NULL THEN
        RAISE EXCEPTION 'Loan with ID % not found.', p_loan_id;
    END IF;

    -- 2. Insert the immutable LoanModification log
    INSERT INTO loan_modifications (
        loan_id, modification_type, pre_principal, pre_interest_rate, pre_duration_mths, pre_interest_type,
        pre_remaining_principal, pre_remaining_interest, principal_adjustment, interest_adjustment,
        post_principal, post_interest_rate, post_duration_mths, post_interest_type,
        post_remaining_principal, post_remaining_interest, executed_by, reason
    ) VALUES (
        p_loan_id, 'RESTRUCTURE', p_pre_principal, p_pre_interest_rate, p_pre_duration_mths, p_pre_interest_type,
        p_pre_remaining_principal, p_pre_remaining_interest, p_principal_adjustment, p_interest_adjustment,
        p_post_principal, p_post_interest_rate, p_post_duration_mths, p_post_interest_type,
        p_post_remaining_principal, p_post_remaining_interest, p_executed_by, p_reason
    ) RETURNING id INTO v_modification_id;

    -- 3. Insert Journal Entries if provided
    IF p_journal_entries IS NOT NULL AND jsonb_array_length(p_journal_entries) > 0 THEN
        FOR v_je IN SELECT * FROM jsonb_to_recordset(p_journal_entries) AS x(
            account_code TEXT,
            entry_type TEXT,
            amount NUMERIC(20, 4)
        ) LOOP
            INSERT INTO journal_entries (modification_id, account_code, entry_type, amount)
            VALUES (v_modification_id, v_je.account_code, v_je.entry_type, v_je.amount);
        END LOOP;
    END IF;

    -- 4. Soft-close existing unsettled installments
    -- Mark status as 'Superseded' and set modification_id
    UPDATE loan_installments
    SET status = 'Superseded',
        modification_id = v_modification_id
    WHERE loan_id = p_loan_id AND is_settled = FALSE;

    -- 5. Insert the new generated installments
    IF p_new_installments IS NOT NULL AND jsonb_array_length(p_new_installments) > 0 THEN
        FOR v_inst IN SELECT * FROM jsonb_to_recordset(p_new_installments) AS x(
            installment_number INT,
            due_date TIMESTAMPTZ,
            principal_due NUMERIC(20, 4),
            interest_due NUMERIC(20, 4),
            fees_due NUMERIC(20, 4),
            penalties_due NUMERIC(20, 4),
            status TEXT
        ) LOOP
            INSERT INTO loan_installments (
                loan_id, client_id, installment_number, due_date,
                principal_due, interest_due, fees_due, penalties_due,
                principal_paid, interest_paid, fees_paid, penalties_paid,
                status
            ) VALUES (
                p_loan_id, v_client_id, v_inst.installment_number, v_inst.due_date,
                v_inst.principal_due, v_inst.interest_due, v_inst.fees_due, v_inst.penalties_due,
                0, 0, 0, 0,
                v_inst.status
            );
        END LOOP;
    END IF;

    -- 6. Mutate the main loan terms & outstanding active pointers
    -- Preserve historical accrued/paid interest
    UPDATE loans
    SET principal_amount = p_post_principal,
        interest_rate = p_post_interest_rate,
        duration_in_months = p_post_duration_mths,
        interest_type = p_post_interest_type,
        total_interest = (v_total_interest_before - v_remaining_interest_before) + p_post_remaining_interest,
        total_payable = (v_total_payable_before - (v_remaining_principal_before + v_remaining_interest_before + v_remaining_fees_before + v_remaining_penalties_before)) + p_post_remaining_principal + p_post_remaining_interest,
        remaining_principal = p_post_remaining_principal,
        remaining_interest = p_post_remaining_interest,
        remaining_fees = 0,
        remaining_penalties = 0,
        lifecycle_state = 'Restructured',
        updated_at = now()
    WHERE id = p_loan_id;

    -- 7. Self-healing client aggregate total balance recalculation
    SELECT COALESCE(SUM(balance), 0)
    INTO v_client_outstanding_balance
    FROM loans
    WHERE client_id = v_client_id AND status::text IN ('Active', 'Substandard', 'Loss', 'Overdue');

    UPDATE clients
    SET outstanding_balance = v_client_outstanding_balance
    WHERE id = v_client_id;

    RETURN v_modification_id;
END;
$$ LANGUAGE plpgsql;
