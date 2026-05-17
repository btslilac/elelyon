import * as dotenv from 'dotenv';
dotenv.config();

import { Worker, Job } from 'bullmq';
import { schedule } from 'node-cron';
import { redisConnection } from './lib/redis';
import { NotificationService } from './lib/notifications';
import { CollectionsService } from './lib/services/collections.service';
import { createSupabaseAdminClient } from './lib/supabase';
import { renderTemplate, TemplateData } from './lib/templates';
import { formatAmount } from './lib/utils';

console.log('🚀 Elelyon Background Worker Starting...');

/**
 * 1. Notification Worker
 * Processes individual SMS, Email, and WhatsApp sends.
 */
const notificationWorker = new Worker(
  'notification-queue',
  async (job: Job) => {
    const params = job.data;
    console.log(`[Worker] Processing ${job.name} for client ${params.clientId}`);

    try {
      // Enriched data fetching if placeholders are missing
      const supabase = createSupabaseAdminClient();

      const { data: loan } = await supabase
        .from('loans')
        .select('*, clients(*)')
        .eq('id', params.loanId)
        .single();

      if (!loan) throw new Error(`Loan ${params.loanId} not found`);
      const client = loan.clients;

      // Fetch Template
      const { data: template } = await supabase
        .from('notification_templates')
        .select('*')
        .eq('name', params.templateType)
        .eq('is_active', true)
        .single();

      if (!template) throw new Error(`Template ${params.templateType} not found`);

      // Render Template
      const templateData: TemplateData = {
        client_name: `${client.first_name} ${client.last_name}`,
        loan_amount: formatAmount(loan.principal_amount),
        due_date: loan.due_date ? new Date(loan.due_date).toLocaleDateString() : 'N/A',
        outstanding_balance: formatAmount(loan.balance),
        installment_amount: formatAmount(loan.installment_amount),
        company_name: "El Elyon Credit & Capital Solutions Limited",
      };

      const renderedBody = renderTemplate(template.body_template, templateData);
      const renderedSubject = template.subject_template ? renderTemplate(template.subject_template, templateData) : undefined;

      // Send via NotificationService
      await NotificationService.send({
        ...params,
        clientId: client.id,
        recipient: template.channels.includes('EMAIL') ? client.email : client.phone,
        messageBody: renderedBody,
        subject: renderedSubject,
        channels: template.channels
      });

      return { status: 'success' };
    } catch (error: any) {
      console.error(`[Worker] Job ${job.id} failed:`, error.message);
      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection: redisConnection,
    concurrency: 5 // Process 5 notifications in parallel
  }
);

notificationWorker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed successfully.`);
});

notificationWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed with error:`, err.message);
});

/**
 * 2. Automated Scheduler (Cron)
 * Runs daily at 8:00 AM EAT (Africa/Nairobi)
 */
schedule('0 8 * * *', async () => {
  console.log('⏰ Running daily collection scan [08:00 EAT]...');
  try {
    const count = await CollectionsService.scanAndEnqueueReminders();
    console.log(`[Scheduler] Enqueued ${count} reminders.`);
  } catch (error) {
    console.error('[Scheduler] Daily scan failed:', error);
  }
}, {
  timezone: "Africa/Nairobi"
});

/**
 * 3. Escalation Scanner
 * Runs daily at 9:00 AM EAT
 */
schedule('0 9 * * *', async () => {
  console.log('⏰ Running overdue escalation scan [09:00 EAT]...');
  // Logic for 30-day escalation can be added here
}, {
  timezone: "Africa/Nairobi"
});

console.log('✅ Worker and Scheduler are active and listening for jobs.');
