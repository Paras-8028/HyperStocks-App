import { NextResponse } from 'next/server';
import { getPersonalizationService } from '@/services/personalization';
import { auth, currentUser } from '@clerk/nextjs/server';
import { DEFAULT_USER_PREFERENCES } from '@/types/personalization';

export async function GET() {
    try {
        const { userId } = await auth();
        const personalizationService = getPersonalizationService();

        if (userId) {
            const res = await personalizationService.getUserProfile(userId);
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
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const clerkUser = await currentUser();
        const body = await req.json();
        const personalizationService = getPersonalizationService();

        const updated = await personalizationService.updatePreferences(userId, {
            ...body,
            userId,
            email: clerkUser?.primaryEmailAddress?.emailAddress || body.email || '',
            name: clerkUser?.fullName || clerkUser?.firstName || body.name || 'Investor',
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
