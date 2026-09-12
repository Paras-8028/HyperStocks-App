import { NextResponse } from 'next/server';
import { getAlertService } from '@/services/alerts';
import { auth } from '@clerk/nextjs/server';
import { SmartAlertCategory } from '@/types/alerts';

async function resolveUserId(): Promise<string | null> {
    try {
        const { userId } = await auth();
        return userId;
    } catch {
        return null;
    }
}

export async function GET(req: Request) {
    try {
        const userId = await resolveUserId();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mode = searchParams.get('mode');
        const symbol = searchParams.get('symbol');
        const category = searchParams.get('category') as SmartAlertCategory | null;
        const unreadOnly = searchParams.get('unreadOnly') === 'true';

        const alertService = getAlertService();

        // 1. Smart Alerts mode
        if (mode === 'smart') {
            const res = await alertService.getSmartAlerts(
                userId,
                category || undefined,
                unreadOnly
            );
            return NextResponse.json(res);
        }

        // 2. Unread count mode
        if (mode === 'count') {
            const smartRes = await alertService.getSmartAlerts(userId);
            const count = smartRes.success ? smartRes.data.filter((a) => !a.isRead).length : 0;
            return NextResponse.json({ success: true, data: { unreadCount: count } });
        }

        // 3. Traditional price alerts by symbol
        if (symbol) {
            const res = await alertService.getAlertsForSymbol(userId, symbol);
            return NextResponse.json(res);
        }

        // 4. All traditional price alerts for user
        const res = await alertService.getUserAlerts(userId);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('GET /api/alerts error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch alerts' },
            { status: 500 }
        );
    }
}

export async function PATCH(req: Request) {
    try {
        const userId = await resolveUserId();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { action, alertId } = body;

        const alertService = getAlertService();

        if (action === 'mark-read' && alertId) {
            const res = await alertService.markAlertRead(userId, alertId);
            return NextResponse.json(res);
        }

        if (action === 'mark-all-read') {
            const res = await alertService.markAllAlertsRead(userId);
            return NextResponse.json(res);
        }

        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    } catch (err: any) {
        console.error('PATCH /api/alerts error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to update alert state' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const userId = await resolveUserId();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { symbol, targetPrice, condition } = body;

        if (!symbol || !targetPrice || !condition) {
            return NextResponse.json(
                { success: false, error: 'Missing required alert fields' },
                { status: 400 }
            );
        }

        const alertService = getAlertService();
        const res = await alertService.createAlert(userId, {
            symbol,
            targetPrice: Number(targetPrice),
            condition,
        });

        return NextResponse.json(res);
    } catch (err: any) {
        console.error('POST /api/alerts error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to create alert' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const userId = await resolveUserId();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const alertId = searchParams.get('id');

        if (!alertId) {
            return NextResponse.json(
                { success: false, error: 'Alert ID is required' },
                { status: 400 }
            );
        }

        const alertService = getAlertService();
        const res = await alertService.deleteAlert(userId, alertId);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('DELETE /api/alerts error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to delete alert' },
            { status: 500 }
        );
    }
}
