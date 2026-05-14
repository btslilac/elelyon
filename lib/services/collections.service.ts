import { createSupabaseAdminClient } from "../supabase";
import { NotificationService, NotificationChannel, SendNotificationParams } from "../notifications";
import { renderTemplate, TemplateData } from "../templates";
import { formatAmount } from "../utils";
import { notificationQueue } from "../queues";

/**
 * Business logic for Collections & Notifications
 * This service is designed to be used by both Server Actions and Background Workers.
 */
export class CollectionsService {
  
  /**
   * Enqueues a notification instead of sending it directly.
   * This ensures the main thread is never blocked by provider network latency.
   */
  static async enqueueNotification(params: SendNotificationParams) {
    console.log(`[CollectionsService] Enqueueing notification for client ${params.clientId} via ${params.channels.join(',')}`);
    
    // We add to the queue. The worker will handle the actual sending and logging.
    await notificationQueue.add(params.templateType, params);
  }

  /**
   * Logic to process a single notification job (used by the worker)
   */
  static async processNotificationJob(params: SendNotificationParams) {
    // This calls the actual sending logic we previously had
    return await NotificationService.send(params);
  }

  /**
   * Scans for daily reminders and enqueues them.
   */
  static async scanAndEnqueueReminders() {
    const supabase = createSupabaseAdminClient();
    const today = new Date().toISOString().split('T')[0];

    console.log(`[CollectionsService] Scanning for reminders scheduled for ${today}...`);

    const { data: schedules, error } = await supabase
      .from('reminder_schedules')
      .select('*')
      .eq('status', 'PENDING')
      .lte('scheduled_for', today);

    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      console.log('[CollectionsService] No reminders found for today.');
      return 0;
    }

    for (const schedule of schedules) {
      // Instead of sending directly, we enqueue.
      // This allows the worker to process hundreds of reminders in parallel.
      await this.enqueueNotification({
        loanId: schedule.loan_id,
        clientId: '', // Will be fetched by worker/service if needed, or pass it here
        templateType: schedule.reminder_type,
        recipient: '', // Logic to fetch recipient is in triggerEventNotification
        messageBody: '', // Rendered by worker
        channels: ['SMS', 'EMAIL', 'WHATSAPP'], // Defaults
      });

      // Mark as PROCESSED in the schedule table
      await supabase
        .from('reminder_schedules')
        .update({ status: 'PROCESSED', processed_at: new Date().toISOString() })
        .eq('id', schedule.id);
    }

    return schedules.length;
  }
}
