"use server";

import { createSupabaseAdminClient } from "../supabase";
import { NotificationService, NotificationChannel } from "../notifications";
import { renderTemplate, TemplateData } from "../templates";
import { formatAmount } from "../utils";

import { CollectionsService } from "../services/collections.service";

/**
 * Triggers a notification based on a specific event (e.g. LOAN_APPROVAL)
 * This is now NON-BLOCKING as it only enqueues the job.
 */
export async function triggerEventNotification(loanId: string, eventType: string, customData: any = {}) {
  try {
    // Simply enqueue the job. The background worker will handle everything else.
    await CollectionsService.enqueueNotification({
      loanId,
      clientId: 'queued', // The worker will resolve the actual client ID
      templateType: eventType,
      recipient: 'queued',
      messageBody: 'queued',
      channels: ['SMS', 'EMAIL', 'WHATSAPP']
    });

    console.log(`[triggerEventNotification] Enqueued ${eventType} job for loan ${loanId}`);
  } catch (error) {
    console.error(`[triggerEventNotification] Failed to enqueue:`, error);
  }
}

/**
 * Main Collections Engine logic
 * Should be called by a CRON job daily or via manual trigger.
 * This is now NON-BLOCKING as it enqueues bulk jobs.
 */
export async function processAutomatedReminders() {
  try {
    const processed = await CollectionsService.scanAndEnqueueReminders();
    return { processed };
  } catch (error) {
    console.error("[processAutomatedReminders] Fatal error:", error);
    throw error;
  }
}

/**
 * Schedules all future reminders for a newly approved loan
 */
export async function scheduleLoanReminders(loanId: string) {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: loan } = await supabase.from('loans').select('due_date').eq('id', loanId).single();
    if (!loan?.due_date) return;

    const dueDate = new Date(loan.due_date);
    
    // Timeline: 7 days before, 3 days before, Due Date, 3 days overdue, 7 days overdue
    const timelines = [
      { type: 'PAYMENT_REMINDER', days: -7 },
      { type: 'PAYMENT_REMINDER', days: -3 },
      { type: 'PAYMENT_REMINDER', days: 0 },
      { type: 'OVERDUE_NOTICE', days: 3 },
      { type: 'OVERDUE_NOTICE', days: 7 }
    ];

    const schedules = timelines.map(t => {
      const date = new Date(dueDate);
      date.setDate(date.getDate() + t.days);
      return {
        loan_id: loanId,
        reminder_type: t.type,
        scheduled_for: date.toISOString().split('T')[0],
        status: 'PENDING'
      };
    });

    await supabase.from('reminder_schedules').insert(schedules);
  } catch (error) {
    console.error("[scheduleLoanReminders] Error:", error);
  }
}

/**
 * Fetches the communication history for a specific client or loan
 */
export async function getNotifications(params: { clientId?: string; loanId?: string }) {
  try {
    const supabase = createSupabaseAdminClient();
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false });

    if (params.loanId) {
      query = query.eq('loan_id', params.loanId);
    } else if (params.clientId) {
      query = query.eq('client_id', params.clientId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return [];
  }
}

/**
 * Fetches communication analytics for the dashboard
 */
export async function getCommunicationAnalytics() {
  try {
    const supabase = createSupabaseAdminClient();
    
    const { data: notifications } = await supabase
      .from('notifications')
      .select('status, channel, template_type');

    if (!notifications) return null;

    const stats = {
      totalSent: notifications.length,
      delivered: notifications.filter(n => n.status === 'SENT' || n.status === 'DELIVERED').length,
      failed: notifications.filter(n => n.status === 'FAILED').length,
      byChannel: {
        SMS: notifications.filter(n => n.channel === 'SMS').length,
        WHATSAPP: notifications.filter(n => n.channel === 'WHATSAPP').length,
        EMAIL: notifications.filter(n => n.channel === 'EMAIL').length,
      },
      byType: {} as Record<string, number>
    };

    notifications.forEach(n => {
      stats.byType[n.template_type] = (stats.byType[n.template_type] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error("[getCommunicationAnalytics] Error:", error);
    return null;
  }
}
