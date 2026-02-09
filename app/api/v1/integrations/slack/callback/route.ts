/**
 * DEPRECATED: Slack OAuth callback now handled by diiiploy-gateway.
 * The gateway redirects to /api/v1/integrations/gateway-callback after token exchange.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Slack OAuth callbacks now route through the Gateway.' },
    { status: 410 }
  )
}
