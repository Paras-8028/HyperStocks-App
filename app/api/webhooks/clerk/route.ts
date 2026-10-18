import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/database/mongoose';
import { UserPreferenceModel } from '@/database/models/user_preference.model';
import { verifyClerkWebhookSignature } from '@/lib/utils/clerk-webhook';

interface ClerkEmailAddress {
    id: string;
    email_address: string;
    verification?: {
        status: string;
    };
}

interface ClerkUserData {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    primary_email_address_id?: string | null;
    email_addresses?: ClerkEmailAddress[];
}

interface ClerkWebhookEvent {
    type: string;
    data: ClerkUserData;
}

export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text();
        const svixId = req.headers.get('svix-id');
        const svixTimestamp = req.headers.get('svix-timestamp');
        const svixSignature = req.headers.get('svix-signature');

        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

        // If webhook secret is configured, enforce strict cryptographic signature verification
        if (webhookSecret) {
            const isValid = verifyClerkWebhookSignature({
                payload: rawBody,
                headers: {
                    'svix-id': svixId,
                    'svix-timestamp': svixTimestamp,
                    'svix-signature': svixSignature,
                },
                secret: webhookSecret,
            });

            if (!isValid) {
                console.warn('[Clerk Webhook] Invalid signature verification attempt');
                return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
            }
        } else if (process.env.NODE_ENV === 'production') {
            console.error('[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET in production environment');
            return NextResponse.json(
                { error: 'Webhook secret not configured on server' },
                { status: 500 }
            );
        } else {
            console.warn('[Clerk Webhook] CLERK_WEBHOOK_SECRET not set; proceeding in development mode');
        }

        let evt: ClerkWebhookEvent;
        try {
            evt = JSON.parse(rawBody) as ClerkWebhookEvent;
        } catch {
            return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
        }

        const eventType = evt.type;
        const data = evt.data;

        if (!data?.id) {
            return NextResponse.json({ error: 'Missing user ID in event data' }, { status: 400 });
        }

        await connectToDatabase();

        // Extract primary email safely
        const emailList = Array.isArray(data.email_addresses) ? data.email_addresses : [];
        const primaryEmailObj =
            emailList.find((e) => e.id === data.primary_email_address_id) || emailList[0];
        const email = primaryEmailObj?.email_address?.toLowerCase()?.trim() || '';

        // Extract user display name
        const nameParts = [data.first_name, data.last_name].filter(Boolean);
        const name = nameParts.length > 0 ? nameParts.join(' ') : data.username || 'Investor';

        if (eventType === 'user.created') {
            // Idempotent upsert: preserve custom user preferences if already exists, set default schedule on insert
            await UserPreferenceModel.updateOne(
                { userId: data.id },
                {
                    $set: {
                        email,
                        name,
                    },
                    $setOnInsert: {
                        userId: data.id,
                        newsEmailEnabled: true,
                        timezone: 'Asia/Kolkata',
                        deliveryMode: 'daily',
                        preferredDeliveryTime: '08:00',
                        scheduleIntervalMinutes: 240,
                        deliveryDays: [1, 2, 3, 4, 5],
                        isSchedulePaused: false,
                        onboardingCompleted: false,
                        createdAt: new Date(),
                    },
                },
                { upsert: true }
            );

            console.log(`[Clerk Webhook] Synchronized new user creation: ${data.id} (${email})`);
        } else if (eventType === 'user.updated') {
            // Update profile info while leaving existing user scheduling settings intact
            await UserPreferenceModel.updateOne(
                { userId: data.id },
                {
                    $set: {
                        email,
                        name,
                    },
                },
                { upsert: true }
            );

            console.log(`[Clerk Webhook] Synchronized user update: ${data.id} (${email})`);
        } else if (eventType === 'user.deleted') {
            // Safe deactivation: pause schedule and disable emails to prevent orphan dispatch
            await UserPreferenceModel.updateOne(
                { userId: data.id },
                {
                    $set: {
                        newsEmailEnabled: false,
                        isSchedulePaused: true,
                    },
                }
            );

            console.log(`[Clerk Webhook] Deactivated user preferences for deleted user: ${data.id}`);
        }

        return NextResponse.json({ success: true, eventType });
    } catch (err) {
        console.error('[Clerk Webhook] Error processing webhook event:', err);
        return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
    }
}
