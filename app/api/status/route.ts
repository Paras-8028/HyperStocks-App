import { NextResponse } from 'next/server';
import { SystemStatusService } from '@/services/system/SystemStatusService';

export const dynamic = 'force-dynamic';

/**
 * GET /api/status
 * Phase 8: Free-Tier Operational Health & Provenance Status Endpoint.
 * Reports health metrics, data provenance legends, and provider quotas without exposing secrets or making paid calls.
 */
export async function GET() {
  try {
    const status = await SystemStatusService.getSystemStatus();
    return NextResponse.json(status, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'DEGRADED',
        error: error?.message || 'Failed to retrieve system status',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
