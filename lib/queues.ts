import { Queue } from 'bullmq';
import { redisConnection } from './redis';

// --- Queue Definitions ---

/**
 * notificationQueue
 * Handles immediate notification sends (SMS, Email, WhatsApp)
 */
export const notificationQueue = new Queue('notification-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5s
    },
    removeOnComplete: { count: 100 }, // Keep last 100 for audit
    removeOnFail: { count: 500 },
  },
});

/**
 * reminderQueue
 * Handles bulk reminder processing scans
 */
export const reminderQueue = new Queue('reminder-queue', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    removeOnComplete: true,
  },
});

console.log('[BullMQ] Queues initialized: notification-queue, reminder-queue');
