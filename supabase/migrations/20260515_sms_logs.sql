-- SMS Delivery Logs (Africa's Talking Webhook Receipts)
-- Tracks raw delivery receipts from AT for each outgoing SMS.
-- The `message_id` corresponds to AT's SMSMessageData.Recipients[].messageId.
-- This is separate from the `notifications` table which is our high-level log.

CREATE TABLE IF NOT EXISTS sms_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id      TEXT UNIQUE NOT NULL,   -- AT's messageId per recipient
    phone_number    TEXT NOT NULL,          -- Recipient phone (e.g. +254700000000)
    message_body    TEXT NOT NULL,          -- The SMS body text
    delivery_status TEXT NOT NULL DEFAULT 'Sent',  -- AT statuses: Sent, Delivered, Failed, Rejected
    failure_reason  TEXT,                   -- Populated when status is Failed/Rejected
    network_code    TEXT,                   -- AT carrier network code
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_message_id ON sms_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_phone_number ON sms_logs(phone_number);
