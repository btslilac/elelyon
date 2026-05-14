import { NextResponse } from 'next/server';
import { processAutomatedReminders } from '@/lib/actions/collections.actions';

/**
 * GET /api/notifications/process
 * Secure endpoint to trigger the automated collections engine.
 * Protect with a secret key to prevent unauthorized execution.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    // Security check: Verify the cron key
    const CRON_SECRET = process.env.CRON_SECRET || 'fallback-secret-for-dev';
    if (key !== CRON_SECRET) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const result = await processAutomatedReminders();
    
    return NextResponse.json({ 
      success: true, 
      processed: result.processed,
      timestamp: new Date().toISOString() 
    });
  } catch (error: any) {
    console.error("[API_NOTIFICATIONS_PROCESS] Error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
