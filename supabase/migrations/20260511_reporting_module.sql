-- ============================================================
-- Elelyon LMS — Reporting Module Migration
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. Add closed_at to loans (tracks when a loan was fully cleared) ────────
alter table loans
  add column if not exists closed_at timestamptz;

-- Backfill closed_at for any existing Completed loans
-- (use created_at of last repayment as an approximation)
update loans l
set closed_at = (
  select max(r.date)
  from repayments r
  where r.loan_id = l.id
)
where l.status = 'Completed'
  and l.closed_at is null;

-- ── 2. Indexes for report-heavy columns ─────────────────────────────────────
create index if not exists idx_loans_status         on loans(status);
create index if not exists idx_loans_start_date     on loans(start_date);
create index if not exists idx_loans_due_date        on loans(due_date);
create index if not exists idx_loans_closed_at       on loans(closed_at);
create index if not exists idx_repayments_date       on repayments(date);
create index if not exists idx_repayments_loan_id   on repayments(loan_id);
create index if not exists idx_penalties_date        on penalties(date_applied);
create index if not exists idx_penalties_loan_id    on penalties(loan_id);
create index if not exists idx_audit_logs_timestamp  on audit_logs(timestamp);

-- ── 3. monthly_reports — one row per month-end snapshot ─────────────────────
create table if not exists monthly_reports (
  id                         uuid primary key default gen_random_uuid(),
  year                       int  not null,
  month                      int  not null check (month between 1 and 12),
  period_label               text not null,
  generated_at               timestamptz not null default now(),
  generated_by               text,

  -- Portfolio counts
  total_active_loans         int  not null default 0,
  total_new_loans            int  not null default 0,
  total_closed_loans         int  not null default 0,
  total_overdue_loans        int  not null default 0,
  total_defaulted_loans      int  not null default 0,

  -- Financial totals (accounting equation)
  opening_portfolio_balance  numeric not null default 0,
  new_loans_disbursed        numeric not null default 0,
  total_repayments_collected numeric not null default 0,
  total_penalties_charged    numeric not null default 0,
  closing_portfolio_balance  numeric not null default 0,

  -- Collection efficiency
  expected_collections       numeric not null default 0,
  actual_collections         numeric not null default 0,
  collection_rate            numeric not null default 0,

  unique (year, month)
);

-- ── 4. monthly_report_entries — one row per loan per month ──────────────────
create table if not exists monthly_report_entries (
  id                     uuid primary key default gen_random_uuid(),
  report_id              uuid not null references monthly_reports(id) on delete cascade,
  loan_id                uuid not null references loans(id),
  client_id              uuid not null references clients(id),

  -- Snapshot data (immutable — reflects state AT time of generation)
  client_name            text    not null,
  loan_type              text,
  disbursement_date      timestamptz,
  due_date               timestamptz,

  -- Monthly accounting
  opening_balance        numeric not null default 0,
  new_loan_amount        numeric not null default 0,
  amount_paid_this_month numeric not null default 0,
  penalties_this_month   numeric not null default 0,
  closing_balance        numeric not null default 0,

  -- Status snapshot
  loan_status            text    not null,
  days_past_due          int     not null default 0,
  installment_amount     numeric not null default 0,

  created_at             timestamptz not null default now()
);

create index if not exists idx_monthly_entries_report_id on monthly_report_entries(report_id);
create index if not exists idx_monthly_entries_loan_id   on monthly_report_entries(loan_id);
create index if not exists idx_monthly_reports_year_month on monthly_reports(year, month);

-- ── 5. RLS — admin-only access to report tables ──────────────────────────────
alter table monthly_reports        enable row level security;
alter table monthly_report_entries enable row level security;

-- Service role bypasses RLS (used by our admin client) — no policy needed.
-- If you want to add user-level policies, add them below.
