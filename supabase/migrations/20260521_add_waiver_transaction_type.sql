-- ====================================================================
-- Elelyon LMS — Migration to Add Waiver Transaction Type
-- ====================================================================

-- PostgREST / Supabase uses the 'transaction_type' enum for loan transactions.
-- This script safely appends 'Waiver' to the transaction_type enum.
-- We run this inside a DO block to prevent errors if 'Waiver' is already present.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'transaction_type' AND e.enumlabel = 'Waiver'
    ) THEN
        ALTER TYPE transaction_type ADD VALUE 'Waiver';
    END IF;
END
$$;
