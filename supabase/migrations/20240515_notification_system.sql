-- Notification & Collections System Migration

-- 1. Notification Templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- e.g. 'LOAN_APPROVAL', 'PAYMENT_REMINDER'
    subject_template TEXT, -- Used for emails
    body_template TEXT NOT NULL,
    channels TEXT[] DEFAULT '{SMS, EMAIL, WHATSAPP}', -- Channels this template is active for
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Notifications Log
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    guarantor_id UUID, -- Optional: if sent to guarantor
    channel TEXT NOT NULL, -- 'SMS', 'EMAIL', 'WHATSAPP'
    template_type TEXT NOT NULL, -- e.g. 'LOAN_APPROVAL'
    recipient TEXT NOT NULL, -- Phone number or Email
    message_body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ'
    provider_response JSONB,
    retry_count INT DEFAULT 0,
    error_message TEXT,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID -- Admin user who triggered it (if manual)
);

-- 3. Reminder Schedules
-- Tracks scheduled reminders to prevent double-sending
CREATE TABLE IF NOT EXISTS reminder_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- '7_DAYS_BEFORE', '3_DAYS_OVERDUE', etc.
    scheduled_for DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSED', 'CANCELLED'
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(loan_id, reminder_type)
);

-- 4. Escalation Logs
CREATE TABLE IF NOT EXISTS escalation_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    level INT NOT NULL, -- 1: Overdue, 2: Final Warning, 3: Guarantor Notified
    action_taken TEXT NOT NULL,
    notified_channels TEXT[] DEFAULT '{}',
    performed_by TEXT DEFAULT 'SYSTEM',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_loan_id ON notifications(loan_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_status ON reminder_schedules(status);
CREATE INDEX IF NOT EXISTS idx_reminder_schedules_date ON reminder_schedules(scheduled_for);

-- Default Templates Seeding
INSERT INTO notification_templates (name, subject_template, body_template, channels) VALUES
('LOAN_APPROVAL', 
 'Loan Approved - {{company_name}}', 
 'Dear {{client_name}}, your loan of {{loan_amount}} has been approved. Your first payment of {{installment_amount}} is due on {{due_date}}. Thank you for choosing {{company_name}}.', 
 '{SMS, EMAIL, WHATSAPP}'),

('PAYMENT_REMINDER', 
 'Payment Reminder - {{company_name}}', 
 'Dear {{client_name}}, a friendly reminder that your loan payment of {{installment_amount}} is due on {{due_date}}. Outstanding balance: {{outstanding_balance}}.', 
 '{SMS, EMAIL, WHATSAPP}'),

('OVERDUE_NOTICE', 
 'Late Payment Notice - {{company_name}}', 
 'URGENT: Dear {{client_name}}, your loan payment was due on {{due_date}}. Please pay {{installment_amount}} immediately to avoid further penalties. Balance: {{outstanding_balance}}.', 
 '{SMS, EMAIL, WHATSAPP}'),

('GUARANTOR_ESCALATION', 
 'Loan Default Escalation - {{company_name}}', 
 'ATTENTION: This is to notify you that the loan for {{client_name}}, which you guaranteed, is now 30 days overdue. Please contact us immediately regarding the balance of {{outstanding_balance}}.', 
 '{SMS, EMAIL, WHATSAPP}'),

('PAYMENT_CONFIRMATION', 
 'Payment Received - {{company_name}}', 
 'Dear {{client_name}}, we have received your payment of {{payment_amount}}. Your remaining balance is {{outstanding_balance}}. Thank you!', 
 '{SMS, EMAIL, WHATSAPP}');
