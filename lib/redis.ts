import * as dotenv from 'dotenv';
dotenv.config();

import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

let lastErrorTime = 0;

redisConnection.on('error', (err: any) => {
  const now = Date.now();
  // Rate-limit connection refused warnings to once every 10 seconds to prevent console spam
  if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
    if (now - lastErrorTime > 10000) {
      console.warn(`[Redis] ⚠️ Connection refused at ${REDIS_URL}. Please ensure Redis is running.`);
      lastErrorTime = now;
    }
  } else {
    console.error('[Redis] Connection Error:', err);
  }
});

redisConnection.on('connect', () => {
  console.log('[Redis] ✅ Connected to:', REDIS_URL);
});

export { redisConnection };
