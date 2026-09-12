import { NextResponse } from 'next/server';
import { getAlertService } from '@/services/alerts';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

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
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

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
