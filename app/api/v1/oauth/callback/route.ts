import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@/lib/supabase'
import { isValidUUID, withTimeout, withRateLimit } from '@/lib/security'
import { verifyOAuthState, encryptToken, serializeEncryptedToken } from '@/lib/crypto'
import type { IntegrationProvider } from '@/types/database'

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type: string
  scope?: string
}

const VALID_PROVIDERS: IntegrationProvider[] = ['slack', 'gmail', 'google_ads', 'meta_ads']
const OAUTH_TIMEOUT_MS = 30000 // 30 second timeout for OAuth requests
const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

// GET /api/v1/oauth/callback - Handle OAuth callback from providers
export async function GET(request: NextRequest) {
  // Rate limit OAuth callbacks (stricter: 20 per minute)
  const rateLimitResponse = withRateLimit(request, { maxRequests: 20, windowMs: 60000 })
  if (rateLimitResponse) return rateLimitResponse

  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Handle OAuth errors from provider (don't log user-provided error descriptions)
  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=oauth_error`
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=missing_params`
    )
  }

  // Verify HMAC-signed state (SEC-001: prevents CSRF in OAuth flow)
  const oauthState = verifyOAuthState(state)

  if (!oauthState) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`
    )
  }

  // Validate state structure
  if (
    !isValidUUID(oauthState.integrationId) ||
    !VALID_PROVIDERS.includes(oauthState.provider as IntegrationProvider)
  ) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=invalid_state`
    )
  }

  // Check state expiry (10 minutes)
  if (Date.now() - oauthState.timestamp > STATE_EXPIRY_MS) {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=state_expired`
    )
  }

  const { integrationId, provider } = oauthState

  try {
    // Exchange code for tokens based on provider
    const tokens = await exchangeCodeForTokens(code, provider)

    if (!tokens) {
      return NextResponse.redirect(
        `${baseUrl}/settings/integrations?error=token_exchange_failed`
      )
    }

    // Update integration with encrypted tokens (SEC-002)
    const supabase = await createRouteHandlerClient(cookies)

    // Encrypt tokens before storage
    const encryptedAccessToken = encryptToken(tokens.access_token)
    const encryptedRefreshToken = tokens.refresh_token
      ? encryptToken(tokens.refresh_token)
      : null

    const updateData: Record<string, unknown> = {
      is_connected: true,
      // Store encrypted tokens if encryption is configured, otherwise plaintext
      access_token: encryptedAccessToken
        ? serializeEncryptedToken(encryptedAccessToken)
        : tokens.access_token,
      last_sync_at: new Date().toISOString(),
    }

    if (tokens.refresh_token) {
      updateData.refresh_token = encryptedRefreshToken
        ? serializeEncryptedToken(encryptedRefreshToken)
        : tokens.refresh_token
    }

    if (tokens.expires_in) {
      updateData.token_expires_at = new Date(
        Date.now() + tokens.expires_in * 1000
      ).toISOString()
    }

    const { error: updateError } = await supabase
      .from('integration')
      .update(updateData)
      .eq('id', integrationId)

    if (updateError) {
      return NextResponse.redirect(
        `${baseUrl}/settings/integrations?error=update_failed`
      )
    }

    // Success - redirect to integrations page
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?success=${provider}`
    )
  } catch {
    return NextResponse.redirect(
      `${baseUrl}/settings/integrations?error=callback_failed`
    )
  }
}

// Exchange authorization code for access tokens
async function exchangeCodeForTokens(
  code: string,
  provider: IntegrationProvider
): Promise<TokenResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectUri = `${baseUrl}/api/v1/oauth/callback`

  const configs: Record<IntegrationProvider, {
    tokenUrl: string
    clientId: string
    clientSecret: string
    extraParams?: Record<string, string>
  }> = {
    slack: {
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      clientId: process.env.SLACK_CLIENT_ID || '',
      clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    },
    gmail: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      extraParams: { grant_type: 'authorization_code' },
    },
    google_ads: {
      tokenUrl: 'https://oauth2.googleapis.com/token',
      clientId: process.env.GOOGLE_ADS_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
      extraParams: { grant_type: 'authorization_code' },
    },
    meta_ads: {
      tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
      clientId: process.env.META_APP_ID || '',
      clientSecret: process.env.META_APP_SECRET || '',
    },
  }

  const config = configs[provider]

  if (!config.clientId || !config.clientSecret) {
    return null
  }

  try {
    // Add timeout to prevent hanging requests
    const response = await withTimeout(
      fetch(config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
          ...config.extraParams,
        }),
      }),
      OAUTH_TIMEOUT_MS,
      'OAuth token exchange timed out'
    )

    const data = await response.json()

    if (!response.ok || data.error) {
      return null
    }

    // Slack returns tokens differently
    if (provider === 'slack') {
      return {
        access_token: data.access_token || data.authed_user?.access_token,
        refresh_token: data.refresh_token,
        token_type: 'Bearer',
      }
    }

    return data as TokenResponse
  } catch {
    return null
  }
}
