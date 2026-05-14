import { notificationQueue } from '../lib/queues';

/**
 * Quick test script to verify BullMQ + Redis integration.
 * Run with: npx tsx scratch/test-notification.ts
 */
async function testQueue() {
  console.log('📡 Attempting to connect to Redis and enqueue a job...');

  try {
    const job = await notificationQueue.add('TEST_NOTIFICATION', {
      loanId: '962b3ab0-548c-4916-82fd-2bf6381b183a', // Using a known ID from your logs
      clientId: 'queued',
      templateType: 'LOAN_APPROVAL',
      recipient: 'queued',
      messageBody: 'TESTING QUEUE SYSTEM',
      channels: ['SMS']
    });

    console.log('✅ Success! Job enqueued with ID:', job.id);
    console.log('👉 Next step: Run "npm run worker" in another terminal to process this job.');
  } catch (error) {
    console.error('❌ Failed to enqueue job. Is Redis running?', error);
  } finally {
    process.exit(0);
  }
}

testQueue();
