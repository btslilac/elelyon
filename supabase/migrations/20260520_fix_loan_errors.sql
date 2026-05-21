-- 1. Fix interest_rate numeric overflow
-- Change interest_rate from NUMERIC(5, 4) to NUMERIC(8, 4) 
-- to support larger numbers (e.g., up to 9999.9999)
ALTER TABLE loans 
ALTER COLUMN interest_rate TYPE NUMERIC(8, 4);

-- 2. Fix autoFlagOverdueLoans RPC failure
-- PostgREST cannot call PROCEDUREs, it requires a FUNCTION.
-- First, drop the existing procedure
DROP PROCEDURE IF EXISTS perform_daily_credit_administration_job();

-- Then, recreate it as a FUNCTION that returns void
CREATE OR REPLACE FUNCTION perform_daily_credit_administration_job() RETURNS void AS $$
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
