import { NextResponse } from 'next/server';
import { AlertNotificationEngine } from '@/services/alerts';

function verifyCronAuthorization(req: Request): boolean {
    const cronSecret = process.env.CRON_SECRET;

    // In development mode, allow execution if secret is not set
    if (!cronSecret && process.env.NODE_ENV !== 'production') {
        return true;
    }

    if (!cronSecret) {
        return false;
    }

    const authHeader = req.headers.get('authorization');
    const headerSecret = req.headers.get('x-cron-secret');

    if (authHeader && authHeader === `Bearer ${cronSecret}`) {
        return true;
    }

    if (headerSecret && headerSecret === cronSecret) {
        return true;
    }

    return false;
}

export async function GET(req: Request) {
    if (!verifyCronAuthorization(req)) {
        return NextResponse.json({ success: false, error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    try {
        const result = await AlertNotificationEngine.processActivePriceAlerts();
        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            ...result,
        });
    } catch (err: any) {
        console.error('GET /api/cron/process-alerts error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Error processing scheduled alerts' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    return GET(req);
}
