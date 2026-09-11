import { NextResponse } from 'next/server';
import { getAlertService } from '@/services/alerts';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { connectToDatabase } from '@/database/mongoose';

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
        // Fallback
    }
    return 'demo_investor_user';
}

export async function GET() {
    try {
        const userId = await resolveUserId();
        const alertService = getAlertService();
        const res = await alertService.getUserAlertPreferences(userId);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('GET /api/alerts/preferences error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch preferences' },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const userId = await resolveUserId();
        const body = await req.json();
        const { preferences } = body;

        if (!preferences) {
            return NextResponse.json(
                { success: false, error: 'Preferences payload is required' },
                { status: 400 }
            );
        }

        const alertService = getAlertService();
        const res = await alertService.updateAlertPreferences(userId, preferences);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('PUT /api/alerts/preferences error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to update preferences' },
            { status: 500 }
        );
    }
}
