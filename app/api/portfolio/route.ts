import { NextResponse } from 'next/server';
import { getPortfolioService } from '@/services/portfolio';
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
        // Continue to fallback
    }
    return 'demo_investor_user';
}

export async function GET() {
    try {
        const userId = await resolveUserId();
        const portfolioService = getPortfolioService();

        const positionsRes = await portfolioService.getPositions(userId);
        if (!positionsRes.success) {
            return NextResponse.json(positionsRes, { status: 400 });
        }

        const summary = await portfolioService.calculatePortfolioSummary(positionsRes.data);

        return NextResponse.json({
            success: true,
            data: {
                positions: positionsRes.data,
                summary,
            },
        });
    } catch (err: any) {
        console.error('GET /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to fetch portfolio' },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        const userId = await resolveUserId();
        const body = await req.json();
        const { symbol, shares, costBasis, notes } = body;

        if (!symbol || !shares || !costBasis) {
            return NextResponse.json(
                { success: false, error: 'Missing required position fields' },
                { status: 400 }
            );
        }

        const portfolioService = getPortfolioService();
        const res = await portfolioService.addPosition(userId, {
            symbol,
            shares: Number(shares),
            costBasis: Number(costBasis),
            notes,
        });

        return NextResponse.json(res);
    } catch (err: any) {
        console.error('POST /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to add position' },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const userId = await resolveUserId();
        const { searchParams } = new URL(req.url);
        const positionId = searchParams.get('id');

        if (!positionId) {
            return NextResponse.json(
                { success: false, error: 'Position ID is required' },
                { status: 400 }
            );
        }

        const portfolioService = getPortfolioService();
        const res = await portfolioService.removePosition(userId, positionId);
        return NextResponse.json(res);
    } catch (err: any) {
        console.error('DELETE /api/portfolio error:', err);
        return NextResponse.json(
            { success: false, error: err?.message || 'Failed to delete position' },
            { status: 500 }
        );
    }
}
