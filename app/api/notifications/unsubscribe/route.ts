import { NextRequest, NextResponse } from 'next/server';
import { unsubscribeUserFromDailyNews } from '@/lib/actions/user.actions';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');

    if (!email) {
        return new NextResponse(
            renderResponsePage(
                'Invalid Request',
                'No email address was provided in the unsubscribe link.',
                false
            ),
            { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }

    try {
        const success = await unsubscribeUserFromDailyNews(email);
        if (success) {
            return new NextResponse(
                renderResponsePage(
                    'Unsubscribed Successfully',
                    `You (${escapeHtml(email)}) have been unsubscribed from the daily HyperStocks Watchlist News Digest. You will no longer receive daily news emails. You can re-enable this anytime in your Watchlist or Account Settings.`,
                    true
                ),
                { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        } else {
            return new NextResponse(
                renderResponsePage(
                    'Unable to Process',
                    'We encountered an issue updating your subscription preferences. Please try again or update your settings directly on HyperStocks.',
                    false
                ),
                { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
            );
        }
    } catch (err: any) {
        console.error('Error handling unsubscribe GET:', err);
        return new NextResponse(
            renderResponsePage(
                'Server Error',
                'An unexpected error occurred while updating your preferences.',
                false
            ),
            { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const email = body?.email || body?.userId;

        if (!email) {
            return NextResponse.json({ success: false, error: 'Email or userId is required' }, { status: 400 });
        }

        const success = await unsubscribeUserFromDailyNews(email);
        return NextResponse.json({ success, message: success ? 'Unsubscribed successfully' : 'Failed to update preferences' });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderResponsePage(title: string, message: string, isSuccess: boolean): string {
    const accentColor = isSuccess ? '#3DFFA0' : '#FF5470';
    const icon = isSuccess ? '✓' : '✕';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)} — HyperStocks</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #050816;
            color: #F1F5F9;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
        }
        .container {
            background-color: #0D1224;
            border: 1px solid #26314A;
            border-radius: 12px;
            max-width: 480px;
            margin: 20px;
            padding: 36px 28px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }
        .icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 56px;
            height: 56px;
            border-radius: 50%;
            background-color: rgba(124, 92, 255, 0.12);
            color: ${accentColor};
            font-size: 26px;
            font-weight: bold;
            margin-bottom: 20px;
            border: 1px solid ${accentColor};
        }
        h1 {
            font-size: 22px;
            font-weight: 700;
            margin: 0 0 12px 0;
            color: #F1F5F9;
        }
        p {
            font-size: 14px;
            line-height: 1.6;
            color: #94A3B8;
            margin: 0 0 24px 0;
        }
        .btn {
            display: inline-block;
            background: linear-gradient(135deg, #7C5CFF, #5B3FE6);
            color: #FFFFFF;
            font-weight: 600;
            font-size: 14px;
            padding: 10px 24px;
            border-radius: 8px;
            text-decoration: none;
            transition: opacity 0.2s;
        }
        .btn:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">${icon}</div>
        <h1>${escapeHtml(title)}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Return to HyperStocks</a>
    </div>
</body>
</html>`;
}
