import { NextResponse } from 'next/server';
import { getAlertService } from '@/services/alerts';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';
import { SmartAlertCategory } from '@/types/alerts';

async function resolveUserId(): Promise<string> {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (session?.user?.email) {
            const mongoose = await connectToDatabase();
            const db = mongoose.connection.db;
            if (db) {
                const u = await db.collection('user').findOne({ email: session.user.email });
                if (u) return u.id || String(u._id);
            }
        }
    } catch {
        // Fallback for session error
    }
    return 'demo_investor_user';
}

export async function GET(req: Request) {
    try {
        const userId = await resolveUserId();
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

        // 2. Legacy Price Alerts by Symbol
        if (symbol) {
            const res = await alertService.getAlertsForSymbol(userId, symbol);
            return NextResponse.json(res);
        }

        // 3. Legacy Price Alerts for user
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
        const body = await req.json();
        const { alertId, action } = body;

        const alertService = getAlertService();

        if (action === 'markAllRead') {
            const res = await alertService.markAllAlertsRead(userId);
            return NextResponse.json(res);
        }

        if (!alertId) {
            return NextResponse.json(
                { success: false, error: 'alertId or markAllRead action is required' },
                { status: 400 }
            );
        }

        const res = await alertService.markAlertRead(userId, alertId);
        return NextResponse.json(res);
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
