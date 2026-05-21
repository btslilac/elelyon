-- Up Migration Script: El Elyon Microfinance Core Engine Expansion
BEGIN;

-- 1. Create Enums for Strict State Tracking
CREATE TYPE loan_status_type AS ENUM ('Active', 'Substandard', 'Loss', 'Fully Paid', 'Written Off');
CREATE TYPE loan_lifecycle_type AS ENUM ('Standard', 'Restructured', 'Rollover');
CREATE TYPE transaction_type AS ENUM ('Repayment', 'Disbursement', 'Manual Penalty', 'Restructure Adjustment');

-- 2. Create Core Loans Table (or Alter existing schema)
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    principal_amount NUMERIC(20, 4) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(5, 4) NOT NULL CHECK (interest_rate >= 0), -- e.g., 0.1500 for 15%
    tenure_months INT NOT NULL CHECK (tenure_months > 0),
    
    -- Current Outstanding Balances
    remaining_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- State and Logic Control
    status loan_status_type NOT NULL DEFAULT 'Active',
    lifecycle_state loan_lifecycle_type NOT NULL DEFAULT 'Standard',
    is_accruing BOOLEAN NOT NULL DEFAULT TRUE,
    days_past_due INT NOT NULL DEFAULT 0 CHECK (days_past_due >= 0),
    
    -- Graduation Tracking
    total_paid_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- Metadata
    disbursed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    maturity_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Installments Schedule Table
CREATE TABLE IF NOT EXISTS installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Breakdowns per installment
    principal_due NUMERIC(20, 4) NOT NULL CHECK (principal_due >= 0),
    interest_due NUMERIC(20, 4) NOT NULL CHECK (interest_due >= 0),
    fees_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (fees_due >= 0),
    penalties_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (penalties_due >= 0), -- Manually populated
    
    -- Amount paid specifically against this installment
    principal_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    interest_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    fees_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    penalties_paid NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    is_settled BOOLEAN GENERATED ALWAYS AS (
        (principal_paid >= principal_due) AND 
        (interest_paid >= interest_due) AND 
        (fees_paid >= fees_due) AND 
        (penalties_paid >= penalties_due)
    ) STORED,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(loan_id, installment_number)
);

-- 4. Create Transaction Ledger for Audit Trails
CREATE TABLE IF NOT EXISTS loan_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE RESTRICT,
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    
    -- Allocation tracking details for historical transparency
    allocated_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_to_wallet NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create Indexes for Batch Processing and Cron Optimization
CREATE INDEX IF NOT EXISTS idx_loans_status_dpd ON loans(status, days_past_due) WHERE status != 'Fully Paid';
CREATE INDEX IF NOT EXISTS idx_installments_unpaid ON installments(loan_id, due_date) WHERE is_settled = FALSE;


CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_loan_id UUID,
    p_payment_amount NUMERIC(20, 4)
) RETURNS UUID AS $$
DECLARE
    v_remaining_payment NUMERIC(20, 4) := p_payment_amount;
    v_inst RECORD;
    v_tx_id UUID;
    
    -- Transaction Allocation Accumulators
    v_alloc_fees NUMERIC(20, 4) := 0;
    v_alloc_penalties NUMERIC(20, 4) := 0;
    v_alloc_overdue_int NUMERIC(20, 4) := 0;
    v_alloc_curr_int NUMERIC(20, 4) := 0;
    v_alloc_overdue_prin NUMERIC(20, 4) := 0;
    v_alloc_curr_prin NUMERIC(20, 4) := 0;
    v_alloc_wallet NUMERIC(20, 4) := 0;
    
    -- Temporary loop variables
    v_deduct NUMERIC(20, 4);
    v_is_overdue BOOLEAN;
BEGIN
    -- Prevent zero/negative operations within the function
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Repayment amount must be strictly greater than zero.';
    END IF;

    -- Fetch active, un-settled installments in chronological order
    FOR v_inst IN 
        SELECT *, (due_date < CURRENT_TIMESTAMP) AS overdue_flag
        FROM installments 
        WHERE loan_id = p_loan_id AND is_settled = FALSE
        ORDER BY due_date ASC, installment_number ASC
    LOOP
        EXIT WHEN v_remaining_payment <= 0;
        v_is_overdue := v_inst.overdue_flag;

        -- STEP 1: Fees Allocation
        IF (v_inst.fees_due - v_inst.fees_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.fees_due - v_inst.fees_paid));
            UPDATE installments SET fees_paid = fees_paid + v_deduct WHERE id = v_inst.id;
            v_alloc_fees := v_alloc_fees + v_deduct;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- STEP 2: Penalties Allocation (Preserving manual entries manually posted here)
        IF v_remaining_payment > 0 AND (v_inst.penalties_due - v_inst.penalties_paid) > 0 THEN
            -- Check if within 3-day grace period to block enforcement of penalties
            IF (v_inst.due_date + INTERVAL '3 days') >= CURRENT_TIMESTAMP THEN
                -- If within grace period, skip penalty payment processing for this loop iteration
                NULL;
            ELSE
                v_deduct := LEAST(v_remaining_payment, (v_inst.penalties_due - v_inst.penalties_paid));
                UPDATE installments SET penalties_paid = penalties_paid + v_deduct WHERE id = v_inst.id;
                v_alloc_penalties := v_alloc_penalties + v_deduct;
                v_remaining_payment := v_remaining_payment - v_deduct;
            END IF;
        END IF;

        -- STEP 3: Overdue Interest OR Current Interest Allocation
        IF v_remaining_payment > 0 AND (v_inst.interest_due - v_inst.interest_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.interest_due - v_inst.interest_paid));
            UPDATE installments SET interest_paid = interest_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_int := v_alloc_overdue_int + v_deduct;
            ELSE
                v_alloc_curr_int := v_alloc_curr_int + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- STEP 4: Overdue Principal OR Current Principal Allocation
        IF v_remaining_payment > 0 AND (v_inst.principal_due - v_inst.principal_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.principal_due - v_inst.principal_paid));
            UPDATE installments SET principal_paid = principal_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_principal := v_alloc_overdue_prin + v_deduct;
            ELSE
                v_alloc_curr_prin := v_alloc_curr_prin + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;
    END LOOP;

    -- STEP 5: Any leftover funds pass directly into institutional wallet buffer
    IF v_remaining_payment > 0 THEN
        v_alloc_wallet := v_remaining_payment;
    END IF;

    -- Record the permanent immutable transaction entry
    INSERT INTO loan_transactions (
        loan_id, amount, type, allocated_fees, allocated_penalties,
        allocated_overdue_interest, allocated_current_interest,
        allocated_overdue_principal, allocated_current_principal, allocated_to_wallet
    ) VALUES (
        p_loan_id, p_payment_amount, 'Repayment', v_alloc_fees, v_alloc_penalties,
        v_alloc_overdue_int, v_alloc_curr_int, v_alloc_overdue_prin, v_alloc_curr_prin, v_alloc_wallet
    ) RETURNING id INTO v_tx_id;

    -- Synchronize aggregated loan balances 
    UPDATE loans l
    SET 
        remaining_principal = (SELECT COALESCE(SUM(principal_due - principal_paid), 0) FROM installments WHERE loan_id = p_loan_id),
        remaining_interest  = (SELECT COALESCE(SUM(interest_due - interest_paid), 0) FROM installments WHERE loan_id = p_loan_id),
        remaining_penalties = (SELECT COALESCE(SUM(penalties_due - penalties_paid), 0) FROM installments WHERE loan_id = p_loan_id),
        remaining_fees      = (SELECT COALESCE(SUM(fees_due - fees_paid), 0) FROM installments WHERE loan_id = p_loan_id),
        total_paid_principal = total_paid_principal + v_alloc_overdue_prin + v_alloc_curr_prin,
        status = CASE 
            WHEN (SELECT COUNT(*) FROM installments WHERE loan_id = p_loan_id AND is_settled = FALSE) = 0 THEN 'Fully Paid'::loan_status_type
            ELSE l.status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE l.id = p_loan_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Procedure executing chronological state changes, default tracking, and non-accrual limits
CREATE OR REPLACE PROCEDURE perform_daily_credit_administration_job() AS $$
BEGIN
    -- 1. Calculate and update Days Past Due (DPD) for active loans based on oldest unpaid installment
    UPDATE loans l
    SET days_past_due = COALESCE(
        (SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - due_date))
         FROM installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Substandard', 'Loss');

    -- 2. Transition loans to Substandard (PAR 30)
    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status = 'Active';

    -- 3. Transition loans to Non-Accrual Loss Status (PAR 90)
    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Substandard');
END;
$$ LANGUAGE plpgsql;

COMMIT;