-- ============================================================
-- Elelyon LMS — Supabase Schema (Airtight Core Engine)
-- ============================================================

-- ⚠️ WARNING: CLEAN SLATE MIGRATION ⚠️
-- To apply this clean slate, you must uncomment and run these DROP commands FIRST
-- if you already have these tables in your database. 
-- THIS WILL DELETE ALL EXISTING DATA in these tables.
--
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS loan_transactions CASCADE;
DROP TABLE IF EXISTS loan_installments CASCADE;
DROP TABLE IF EXISTS repayments CASCADE;
DROP TABLE IF EXISTS penalties CASCADE;
DROP TABLE IF EXISTS loans CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS loan_status_type CASCADE;
DROP TYPE IF EXISTS loan_lifecycle_type CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. ENUMS
-- ──────────────────────────────────────────────────────────────
CREATE TYPE loan_status_type AS ENUM ('Pending', 'Active', 'Substandard', 'Loss', 'Fully Paid', 'Written Off', 'Denied', 'Overdue');
CREATE TYPE loan_lifecycle_type AS ENUM ('Standard', 'Restructured', 'Rollover');
CREATE TYPE transaction_type AS ENUM ('Repayment', 'Disbursement', 'Manual Penalty', 'Restructure Adjustment');

-- ──────────────────────────────────────────────────────────────
-- 2. USERS & CLIENTS
-- ──────────────────────────────────────────────────────────────
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  auth_id         uuid unique references auth.users(id) on delete cascade,
  email           text not null unique,
  first_name      text not null,
  last_name       text not null,
  role            text not null default 'STAFF',   -- ADMIN | MANAGER | STAFF
  user_status     text not null default 'active',
  created_at      timestamptz not null default now()
);

create table if not exists clients (
  id                  uuid primary key default gen_random_uuid(),
  first_name          text not null,
  last_name           text not null,
  national_id         text not null,
  email               text,
  phone               text not null,
  address             text,
  total_borrowed      numeric not null default 0,
  outstanding_balance numeric not null default 0,
  created_at          timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 3. LOANS
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    
    -- Original Contract
    principal_amount NUMERIC(20, 4) NOT NULL CHECK (principal_amount > 0),
    interest_rate NUMERIC(5, 4) NOT NULL CHECK (interest_rate >= 0),
    duration_in_months INT NOT NULL CHECK (duration_in_months > 0),
    interest_type text not null default 'Flat',
    total_payable numeric not null default 0,
    total_interest numeric not null default 0,
    
    -- Current Outstanding Balances (Source of truth)
    remaining_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    remaining_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- Computed field for backward compatibility
    balance NUMERIC(20, 4) GENERATED ALWAYS AS (remaining_principal + remaining_interest + remaining_penalties + remaining_fees) STORED,
    
    -- State and Logic Control
    status loan_status_type NOT NULL DEFAULT 'Pending',
    lifecycle_state loan_lifecycle_type NOT NULL DEFAULT 'Standard',
    is_accruing BOOLEAN NOT NULL DEFAULT TRUE,
    days_past_due INT NOT NULL DEFAULT 0 CHECK (days_past_due >= 0),
    
    -- Graduation Tracking
    total_paid_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    -- Metadata and UI
    loan_type text,
    securities text,
    guarantor_name text,
    guarantor_phone text,
    guarantor_id text,
    document_url text,
    created_by uuid references users(id),
    is_high_risk boolean not null default false,
    
    start_date TIMESTAMP WITH TIME ZONE,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loans_status_dpd ON loans(status, days_past_due) WHERE status NOT IN ('Fully Paid', 'Pending', 'Denied');
CREATE INDEX IF NOT EXISTS idx_loans_client_id ON loans(client_id);

-- ──────────────────────────────────────────────────────────────
-- 4. INSTALLMENTS SCHEDULE
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    installment_number INT NOT NULL CHECK (installment_number > 0),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Breakdowns per installment
    principal_due NUMERIC(20, 4) NOT NULL CHECK (principal_due >= 0),
    interest_due NUMERIC(20, 4) NOT NULL CHECK (interest_due >= 0),
    fees_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (fees_due >= 0),
    penalties_due NUMERIC(20, 4) NOT NULL DEFAULT 0 CHECK (penalties_due >= 0),
    
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
    
    -- Backward compatibility for UI
    amount_due NUMERIC(20, 4) GENERATED ALWAYS AS (principal_due + interest_due + fees_due + penalties_due) STORED,
    amount_paid NUMERIC(20, 4) GENERATED ALWAYS AS (principal_paid + interest_paid + fees_paid + penalties_paid) STORED,
    status text NOT NULL DEFAULT 'Pending',
    paid_date timestamptz,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(loan_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installments_unpaid ON loan_installments(loan_id, due_date) WHERE is_settled = FALSE;

-- ──────────────────────────────────────────────────────────────
-- 5. LOAN TRANSACTIONS (Consolidates Repayments & Penalties)
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS loan_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    amount NUMERIC(20, 4) NOT NULL CHECK (amount > 0),
    type transaction_type NOT NULL,
    
    -- Metadata (covers repayment method and penalty types)
    payment_method text,
    reference_id text,
    comment text,
    applied_by text,
    status text not null default 'Active',
    
    -- Allocation tracking details for historical transparency
    allocated_fees NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_penalties NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_interest NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_overdue_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_current_principal NUMERIC(20, 4) NOT NULL DEFAULT 0,
    allocated_to_wallet NUMERIC(20, 4) NOT NULL DEFAULT 0,
    
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON loan_transactions(loan_id);

-- ──────────────────────────────────────────────────────────────
-- 6. AUDIT LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  loan_id         uuid references loans(id) ON DELETE CASCADE,
  entity_type     text,
  action          text not null,
  performed_by    text not null,
  description     text,
  previous_value  text,
  new_value       text,
  timestamp       timestamptz not null default now(),
  user_id         text,
  created_at      timestamptz not null default now()
);


-- ──────────────────────────────────────────────────────────────
-- 7. PL/PGSQL PROCEDURES & FUNCTIONS
-- ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_loan_repayment(
    p_loan_id UUID,
    p_payment_amount NUMERIC(20, 4),
    p_payment_method TEXT,
    p_reference_id TEXT,
    p_applied_by TEXT,
    p_date TIMESTAMP WITH TIME ZONE
) RETURNS UUID AS $$
DECLARE
    v_remaining_payment NUMERIC(20, 4) := p_payment_amount;
    v_inst RECORD;
    v_tx_id UUID;
    v_client_id UUID;
    
    -- Transaction Allocation Accumulators
    v_alloc_fees NUMERIC(20, 4) := 0;
    v_alloc_penalties NUMERIC(20, 4) := 0;
    v_alloc_overdue_int NUMERIC(20, 4) := 0;
    v_alloc_curr_int NUMERIC(20, 4) := 0;
    v_alloc_overdue_prin NUMERIC(20, 4) := 0;
    v_alloc_curr_prin NUMERIC(20, 4) := 0;
    v_alloc_wallet NUMERIC(20, 4) := 0;
    
    v_deduct NUMERIC(20, 4);
    v_is_overdue BOOLEAN;
BEGIN
    IF p_payment_amount <= 0 THEN
        RAISE EXCEPTION 'Repayment amount must be strictly greater than zero.';
    END IF;

    SELECT client_id INTO v_client_id FROM loans WHERE id = p_loan_id;

    FOR v_inst IN 
        SELECT *, (due_date < CURRENT_TIMESTAMP) AS overdue_flag
        FROM loan_installments 
        WHERE loan_id = p_loan_id AND is_settled = FALSE
        ORDER BY due_date ASC, installment_number ASC
    LOOP
        EXIT WHEN v_remaining_payment <= 0;
        v_is_overdue := v_inst.overdue_flag;

        -- 1: Fees Allocation
        IF (v_inst.fees_due - v_inst.fees_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.fees_due - v_inst.fees_paid));
            UPDATE loan_installments SET fees_paid = fees_paid + v_deduct WHERE id = v_inst.id;
            v_alloc_fees := v_alloc_fees + v_deduct;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 2: Penalties Allocation
        IF v_remaining_payment > 0 AND (v_inst.penalties_due - v_inst.penalties_paid) > 0 THEN
            IF (v_inst.due_date + INTERVAL '3 days') >= CURRENT_TIMESTAMP THEN
                NULL;
            ELSE
                v_deduct := LEAST(v_remaining_payment, (v_inst.penalties_due - v_inst.penalties_paid));
                UPDATE loan_installments SET penalties_paid = penalties_paid + v_deduct WHERE id = v_inst.id;
                v_alloc_penalties := v_alloc_penalties + v_deduct;
                v_remaining_payment := v_remaining_payment - v_deduct;
            END IF;
        END IF;

        -- 3: Interest Allocation
        IF v_remaining_payment > 0 AND (v_inst.interest_due - v_inst.interest_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.interest_due - v_inst.interest_paid));
            UPDATE loan_installments SET interest_paid = interest_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_int := v_alloc_overdue_int + v_deduct;
            ELSE
                v_alloc_curr_int := v_alloc_curr_int + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;

        -- 4: Principal Allocation
        IF v_remaining_payment > 0 AND (v_inst.principal_due - v_inst.principal_paid) > 0 THEN
            v_deduct := LEAST(v_remaining_payment, (v_inst.principal_due - v_inst.principal_paid));
            UPDATE loan_installments SET principal_paid = principal_paid + v_deduct WHERE id = v_inst.id;
            
            IF v_is_overdue THEN
                v_alloc_overdue_prin := v_alloc_overdue_prin + v_deduct;
            ELSE
                v_alloc_curr_prin := v_alloc_curr_prin + v_deduct;
            END IF;
            v_remaining_payment := v_remaining_payment - v_deduct;
        END IF;
        
        -- Sync legacy UI statuses
        UPDATE loan_installments 
        SET 
            status = CASE WHEN is_settled THEN 'Paid' ELSE status END,
            paid_date = CASE WHEN is_settled THEN p_date ELSE NULL END
        WHERE id = v_inst.id;
    END LOOP;

    -- 5: Wallet buffer
    IF v_remaining_payment > 0 THEN
        v_alloc_wallet := v_remaining_payment;
    END IF;

    -- Permanent Entry
    INSERT INTO loan_transactions (
        loan_id, client_id, amount, type, payment_method, reference_id, applied_by, date,
        allocated_fees, allocated_penalties, allocated_overdue_interest, allocated_current_interest,
        allocated_overdue_principal, allocated_current_principal, allocated_to_wallet
    ) VALUES (
        p_loan_id, v_client_id, p_payment_amount, 'Repayment', p_payment_method, p_reference_id, p_applied_by, p_date,
        v_alloc_fees, v_alloc_penalties, v_alloc_overdue_int, v_alloc_curr_int, 
        v_alloc_overdue_prin, v_alloc_curr_prin, v_alloc_wallet
    ) RETURNING id INTO v_tx_id;

    -- Synchronize Aggregates
    UPDATE loans l
    SET 
        remaining_principal = (SELECT COALESCE(SUM(principal_due - principal_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_interest  = (SELECT COALESCE(SUM(interest_due - interest_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_penalties = (SELECT COALESCE(SUM(penalties_due - penalties_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        remaining_fees      = (SELECT COALESCE(SUM(fees_due - fees_paid), 0) FROM loan_installments WHERE loan_id = p_loan_id),
        total_paid_principal = total_paid_principal + v_alloc_overdue_prin + v_alloc_curr_prin,
        status = CASE 
            WHEN (SELECT COUNT(*) FROM loan_installments WHERE loan_id = p_loan_id AND is_settled = FALSE) = 0 THEN 'Fully Paid'::loan_status_type
            ELSE l.status
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE l.id = p_loan_id;

    RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE PROCEDURE perform_daily_credit_administration_job() AS $$
BEGIN
    -- 1. Calculate DPD
    UPDATE loans l
    SET days_past_due = COALESCE(
        (SELECT GREATEST(0, EXTRACT(DAY FROM (CURRENT_TIMESTAMP - due_date)))
         FROM loan_installments
         WHERE loan_id = l.id AND is_settled = FALSE
         ORDER BY due_date ASC LIMIT 1), 0
    )
    WHERE l.status IN ('Active', 'Substandard', 'Loss');

    -- 2. Transition Overdue Installments
    UPDATE loan_installments
    SET status = 'Overdue'
    WHERE status = 'Pending' AND due_date < CURRENT_TIMESTAMP;

    -- 3. Transition Substandard (PAR 30)
    UPDATE loans 
    SET status = 'Substandard' 
    WHERE days_past_due >= 30 AND days_past_due < 90 AND status = 'Active';

    -- 4. Transition Loss (PAR 90)
    UPDATE loans 
    SET status = 'Loss', is_accruing = FALSE 
    WHERE days_past_due >= 90 AND status IN ('Active', 'Substandard');
END;
$$ LANGUAGE plpgsql;


-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────
alter table users               enable row level security;
alter table clients             enable row level security;
alter table loans               enable row level security;
alter table loan_installments   enable row level security;
alter table loan_transactions   enable row level security;
alter table audit_logs          enable row level security;

create policy "Service role full access - users"             on users             for all using (true) with check (true);
create policy "Service role full access - clients"           on clients           for all using (true) with check (true);
create policy "Service role full access - loans"             on loans             for all using (true) with check (true);
create policy "Service role full access - loan_installments" on loan_installments for all using (true) with check (true);
create policy "Service role full access - loan_transactions" on loan_transactions for all using (true) with check (true);
create policy "Service role full access - audit_logs"        on audit_logs        for all using (true) with check (true);
