-- ====================================================================
-- Elelyon LMS — Migration to Add Overdue to Loan Status Type Enum
-- ====================================================================

-- Safely append 'Overdue' to the loan_status_type enum.
-- We run this inside a DO block to prevent errors if 'Overdue' is already present.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'loan_status_type' AND e.enumlabel = 'Overdue'
    ) THEN
        ALTER TYPE loan_status_type ADD VALUE 'Overdue';
    END IF;
END
$$;
