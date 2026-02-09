/**
 * DEPRECATED: Slack message sync now uses slack-channel-sync-service via /api/cron/slack-sync.
 * Per-client channel sync replaces per-user channel sync.
 */
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint is deprecated. Use /api/cron/slack-sync for channel message sync.' },
    { status: 410 }
  )
}
