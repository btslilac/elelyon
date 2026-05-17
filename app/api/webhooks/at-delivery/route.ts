import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase with service role to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/webhooks/at-delivery
 *
 * Africa's Talking sends delivery receipts as application/x-www-form-urlencoded.
 * AT fields: id, status, phoneNumber, networkCode, failureReason
 *
 * Always returns 200 OK immediately — if we return a non-2xx, AT will
 * retry the webhook indefinitely.
 */
export async function POST(request: NextRequest) {
  try {
    // AT sends form-encoded bodies, NOT JSON
    const text = await request.text();
    const params = new URLSearchParams(text);

    const messageId    = params.get('id') ?? '';
    const status       = params.get('status') ?? 'Unknown';
    const phoneNumber  = params.get('phoneNumber') ?? '';
    const networkCode  = params.get('networkCode') ?? null;
    const failureReason = params.get('failureReason') ?? null;

    if (!messageId) {
      console.warn('[AT Webhook] Received payload with no message id — ignoring.');
      return new NextResponse('OK', { status: 200 });
    }

    console.log(`[AT Webhook] Receipt — id: ${messageId}, status: ${status}, phone: ${phoneNumber}`);

    // Update the delivery status on the existing sms_logs row.
    // The row is created by NotificationService.sendSMS() using the AT message id.
    const { error } = await supabase
      .from('sms_logs')
      .update({
        delivery_status: status,
        failure_reason:  failureReason,
        network_code:    networkCode,
        updated_at:      new Date().toISOString(),
      })
      .eq('message_id', messageId);

    if (error) {
      // Log the error but still return 200 so AT doesn't retry
      console.error('[AT Webhook] DB update failed:', error.message);
    }
  } catch (err: any) {
    // Swallow all errors — always return 200
    console.error('[AT Webhook] Unexpected error:', err?.message ?? err);
  }

  return new NextResponse('OK', { status: 200 });
}
