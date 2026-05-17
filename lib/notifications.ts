import { Resend } from 'resend';
import twilio from 'twilio';
import africastalking from 'africastalking';
import { createSupabaseAdminClient } from './supabase';

// --- Types ---
export type NotificationChannel = 'SMS' | 'EMAIL' | 'WHATSAPP';

export interface SendNotificationParams {
  loanId?: string;
  clientId: string;
  guarantorId?: string;
  templateType: string;
  recipient: string; // Phone or Email
  messageBody: string;
  channels: NotificationChannel[];
  subject?: string;
  createdBy?: string;
}

// --- Configuration ---
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const AT_USERNAME = process.env.AT_USERNAME || '';
const AT_API_KEY = process.env.AT_API_KEY || '';
const AT_SENDER_ID = process.env.AT_SENDER_ID || ''; // Alphanumeric or Shortcode
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER || '';
const WHATSAPP_TOKEN = process.env.WHATSAPP_CLOUD_API_TOKEN || '';
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';

// Initialize clients
// Use a dummy key if missing to prevent constructor from throwing during module load in dev
const resend = new Resend(RESEND_API_KEY || 're_dummy_key');
const at = africastalking({ apiKey: AT_API_KEY || 'dummy', username: AT_USERNAME || 'dummy' });
const sms = at.SMS;
const twilioClient = twilio(TWILIO_SID || 'ACdummy', TWILIO_AUTH_TOKEN || 'dummy');

export class NotificationService {
  /**
   * Unified entry point to send notifications across multiple channels
   */
  static async send(params: SendNotificationParams) {
    const results = await Promise.allSettled(
      params.channels.map(channel => this.sendToChannel(channel, params))
    );

    return results;
  }

  private static async sendToChannel(channel: NotificationChannel, params: SendNotificationParams) {
    const supabase = createSupabaseAdminClient();

    // 1. Create log entry (PENDING)
    const { data: logEntry, error: logError } = await supabase
      .from('notifications')
      .insert({
        loan_id: params.loanId,
        client_id: params.clientId,
        guarantor_id: params.guarantorId,
        channel,
        template_type: params.templateType,
        recipient: params.recipient,
        message_body: params.messageBody,
        status: 'PENDING',
        created_by: params.createdBy
      })
      .select()
      .single();

    if (logError) throw logError;

    let providerResponse: any = null;
    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMessage: string | null = null;

    try {
      switch (channel) {
        case 'EMAIL':
          providerResponse = await this.sendEmail(params.recipient, params.subject || 'Loan Update', params.messageBody);
          break;
        case 'SMS':
          providerResponse = await this.sendSMS(params.recipient, params.messageBody);
          break;
        case 'WHATSAPP':
          providerResponse = await this.sendWhatsApp(params.recipient, params.messageBody);
          break;
      }
    } catch (err: any) {
      status = 'FAILED';
      errorMessage = err.message || 'Unknown error';
      providerResponse = err;
    }

    // 2. Update log entry with outcome
    await supabase
      .from('notifications')
      .update({
        status,
        provider_response: providerResponse,
        error_message: errorMessage,
        sent_at: status === 'SENT' ? new Date().toISOString() : null,
        retry_count: status === 'FAILED' ? (logEntry.retry_count || 0) + 1 : 0
      })
      .eq('id', logEntry.id);

    return { channel, status, logId: logEntry.id };
  }

  // --- Channel Implementations ---

  private static async sendEmail(to: string, subject: string, body: string) {
    if (!RESEND_API_KEY || RESEND_API_KEY === 're_dummy_key') {
      console.warn("[NotificationService] Skipping Email: RESEND_API_KEY is not set.");
      return { skipped: true, reason: "Missing API Key" };
    }

    const { data, error } = await resend.emails.send({
      from: 'Elelyon Microfinance <notifications@elelyon.ebenezarenterprises.com>',
      to: [to],
      subject,
      text: body,
    });

    if (error) throw error;
    return data;
  }

  private static async sendSMS(to: string, message: string) {
    // Try Africa's Talking first
    try {
      if (!AT_API_KEY || AT_API_KEY === 'dummy') throw new Error("AT_API_KEY missing");
      const response = await sms.send({
        to: [to],
        message,
        from: AT_SENDER_ID || undefined,
        enqueue: true
      });

      // Persist each recipient's AT messageId so the delivery webhook can update it
      const recipients: any[] = response?.SMSMessageData?.Recipients ?? [];
      if (recipients.length > 0) {
        const supabase = createSupabaseAdminClient();
        const rows = recipients.map((r: any) => ({
          message_id: r.messageId,
          phone_number: r.number,
          message_body: message,
          delivery_status: r.status ?? 'Sent',
        }));
        await supabase.from('sms_logs').upsert(rows, { onConflict: 'message_id' });
      }

      return response;
    } catch (atError) {
      console.warn("Africa's Talking failed or skipped, trying Twilio fallback...", atError);

      if (!TWILIO_SID || TWILIO_SID === 'ACdummy') {
        console.warn("[NotificationService] Skipping SMS: Both AT and Twilio keys are missing.");
        return { skipped: true, reason: "Missing API Keys" };
      }

      const response = await twilioClient.messages.create({
        body: message,
        from: TWILIO_PHONE,
        to
      });
      return response;
    }
  }

  private static async sendWhatsApp(to: string, message: string) {
    if (!WHATSAPP_TOKEN) throw new Error("WHATSAPP_CLOUD_API_TOKEN missing");

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${WHATSAPP_PHONE_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace('+', ''), // WhatsApp API usually expects numbers without +
          type: 'text',
          text: { body: message },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "WhatsApp API error");

    return data;
  }
}
