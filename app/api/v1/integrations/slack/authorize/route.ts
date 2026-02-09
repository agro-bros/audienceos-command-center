/**
 * DEPRECATED: Slack OAuth now routes through diiiploy-gateway.
 * Use POST /api/v1/integrations with provider=slack to initiate OAuth.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Slack OAuth now uses the Gateway flow via /api/v1/integrations.' },
    { status: 410 }
  )
}
