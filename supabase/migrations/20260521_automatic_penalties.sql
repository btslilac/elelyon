-- 1. Create a function to apply automatic fixed flat fees to overdue loans
CREATE OR REPLACE FUNCTION apply_automatic_late_fees() RETURNS void AS $$
DECLARE
    v_loan RECORD;
    v_penalty_amount NUMERIC(20, 4) := 500; -- Default flat fee (can be adjusted by Admin)
    v_target_installment UUID;
BEGIN
    -- Loop through all loans that are currently Overdue or have PAR
    FOR v_loan IN 
        SELECT l.id, l.client_id
        FROM loans l
        WHERE l.status IN ('Overdue', 'Substandard', 'Loss')
    LOOP
        -- Check if an auto-penalty has already been applied for this loan recently
        -- For simplicity, we apply it ONCE per overdue cycle (e.g. if no auto penalty exists at all, or if none in the last 30 days)
        -- Here we apply it exactly ONCE per loan that has missed a payment.
        IF NOT EXISTS (
            SELECT 1 FROM loan_transactions 
            WHERE loan_id = v_loan.id 
              AND type = 'Manual Penalty' 
              AND payment_method = 'Auto Late Fee'
        ) THEN
            
            -- Find the oldest active installment
            SELECT id INTO v_target_installment
            FROM loan_installments
            WHERE loan_id = v_loan.id AND is_settled = FALSE
            ORDER BY due_date ASC
            LIMIT 1;

            IF v_target_installment IS NOT NULL THEN
                -- 1. Attach to installment
                UPDATE loan_installments 
                SET penalties_due = penalties_due + v_penalty_amount
                WHERE id = v_target_installment;

                -- 2. Insert transaction
                INSERT INTO loan_transactions (
                    loan_id, client_id, amount, type, payment_method, comment, applied_by, status
                ) VALUES (
                    v_loan.id, v_loan.client_id, v_penalty_amount, 'Manual Penalty', 'Auto Late Fee', 'System generated late fee', 'System', 'Active'
                );

                -- 3. Update loan remaining penalties
                UPDATE loans 
                SET remaining_penalties = remaining_penalties + v_penalty_amount
                WHERE id = v_loan.id;
            END IF;
            
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Modify the daily administration job to call this new function
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
    
    -- 5. Mark loan as Overdue if it has Overdue installments but hasn't reached Substandard yet
    UPDATE loans
    SET status = 'Overdue'
    WHERE status = 'Active' 
      AND days_past_due > 0 
      AND days_past_due < 30;

    -- 6. Apply Auto Penalties
    PERFORM apply_automatic_late_fees();
END;
$$ LANGUAGE plpgsql;
