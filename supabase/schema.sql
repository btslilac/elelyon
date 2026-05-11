-- ============================================================
-- Elelyon LMS — Supabase Schema
-- Paste this into: Supabase Dashboard → SQL Editor → Run
-- ============================================================

-- ── Enable UUID extension (already on by default in Supabase) ──
create extension if not exists "pgcrypto";

-- ──────────────────────────────────────────────────────────────
-- 1. USERS  (mirrors auth.users — stores app-level profile)
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

-- ──────────────────────────────────────────────────────────────
-- 2. CLIENTS
-- ──────────────────────────────────────────────────────────────
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
create table if not exists loans (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid not null references clients(id),
  principal_amount    numeric not null,
  interest_rate       numeric not null,
  interest_type       text not null,           -- Flat | Reducing
  duration_in_months  int not null,
  start_date          timestamptz,
  due_date            timestamptz,
  total_interest      numeric,
  total_payable       numeric,
  balance             numeric,
  status              text not null default 'Pending',
  penalty_accrued     numeric not null default 0,
  loan_type           text,
  securities          text,
  guarantor_name      text,
  guarantor_phone     text,
  guarantor_id        text,
  installment_amount  numeric,
  document_url        text,
  created_by          uuid references users(id),
  is_high_risk        boolean not null default false,  -- flagged when client has existing Overdue/Defaulted loans
  created_at          timestamptz not null default now()
);

-- ── Migration: run once if table already exists ─────────────────────────────
-- alter table loans add column if not exists is_high_risk boolean not null default false;

-- Index for the auto-flag overdue query (status + due_date)
create index if not exists idx_loans_status_due on loans (status, due_date);
-- Index for client-level queries
create index if not exists idx_loans_client_id on loans (client_id);

-- ──────────────────────────────────────────────────────────────
-- 4. REPAYMENTS
-- ──────────────────────────────────────────────────────────────
create table if not exists repayments (
  id              uuid primary key default gen_random_uuid(),
  loan_id         uuid not null references loans(id),
  client_id       uuid not null references clients(id),
  amount          numeric not null,
  payment_method  text not null,
  reference_id    text,
  date            timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists idx_repayments_loan_id on repayments (loan_id);

-- ──────────────────────────────────────────────────────────────
-- 5. PENALTIES
-- ──────────────────────────────────────────────────────────────
create table if not exists penalties (
  id           uuid primary key default gen_random_uuid(),
  loan_id      uuid not null references loans(id),
  client_id    uuid not null references clients(id),
  amount       numeric not null,
  penalty_type text not null,
  comment      text,
  applied_by   text not null,
  date_applied text not null,
  status       text not null default 'Active',  -- Active | Reversed
  reversed_at  text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_penalties_loan_id on penalties (loan_id);

-- ──────────────────────────────────────────────────────────────
-- 6. AUDIT LOGS
-- ──────────────────────────────────────────────────────────────
create table if not exists audit_logs (
  id              uuid primary key default gen_random_uuid(),
  loan_id         uuid references loans(id),
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

create index if not exists idx_audit_loan_id on audit_logs (loan_id);

-- ──────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- All writes go through the service-role key (server actions),
-- so RLS is enabled but policies allow service-role bypass.
-- ──────────────────────────────────────────────────────────────
alter table users       enable row level security;
alter table clients     enable row level security;
alter table loans       enable row level security;
alter table repayments  enable row level security;
alter table penalties   enable row level security;
alter table audit_logs  enable row level security;

-- Service-role bypass (server actions use the service-role key which always bypasses RLS)
-- The policies below allow authenticated users read access via the anon key if needed.

create policy "Service role full access - users"      on users       for all using (true) with check (true);
create policy "Service role full access - clients"    on clients     for all using (true) with check (true);
create policy "Service role full access - loans"      on loans       for all using (true) with check (true);
create policy "Service role full access - repayments" on repayments  for all using (true) with check (true);
create policy "Service role full access - penalties"  on penalties   for all using (true) with check (true);
create policy "Service role full access - audit_logs" on audit_logs  for all using (true) with check (true);

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKET  (run separately if needed)
-- ──────────────────────────────────────────────────────────────
-- insert into storage.buckets (id, name, public)
-- values ('loan-documents', 'loan-documents', false);
