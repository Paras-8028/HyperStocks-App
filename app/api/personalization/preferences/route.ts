import { NextResponse } from 'next/server';
import { getPersonalizationService } from '@/services/personalization';
import { auth } from '@/lib/better-auth/auth';
import { headers } from 'next/headers';
import { DEFAULT_USER_PREFERENCES } from '@/types/personalization';

export async function GET(req: Request) {
    try {
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        const personalizationService = getPersonalizationService();

        if (session?.user?.email) {
            const res = await personalizationService.getUserProfile(session.user.email);
            return NextResponse.json(res);
        }

        // Return default preferences for unauthenticated / guest users
        return NextResponse.json({
            success: true,
            data: DEFAULT_USER_PREFERENCES,
        });
    } catch (err: any) {
        console.error('GET /api/personalization/preferences error:', err);
        return NextResponse.json({
            success: true,
            data: DEFAULT_USER_PREFERENCES,
        });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        const email = session?.user?.email || body.email || 'guest';
        const personalizationService = getPersonalizationService();

        const updated = await personalizationService.updatePreferences(email, {
            ...body,
            onboardingCompleted: true,
        });

        return NextResponse.json(updated);
    } catch (err: any) {
        console.error('POST /api/personalization/preferences error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to update preferences' },
            { status: 500 }
        );
    }
}
