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

// Attach error handlers to prevent unhandled 'error' event stack traces in the console.
// The main Redis connection warning in redis.ts handles reporting the connection status.
notificationQueue.on('error', (err) => {
  // Gracefully caught to prevent process crash/unhandled stack logs
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

reminderQueue.on('error', (err) => {
  // Gracefully caught to prevent process crash/unhandled stack logs
});

console.log('[BullMQ] Queues initialized: notification-queue, reminder-queue');
