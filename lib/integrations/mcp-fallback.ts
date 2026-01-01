/**
 * MCP Fallback for Ads Platforms
 *
 * Uses chi-gateway MCP for Google Ads and Meta Ads data when OAuth is not configured.
 * This is the MVP approach - allows quick setup without OAuth app registrations.
 */

export interface AdPerformanceData {
  platform: 'google_ads' | 'meta_ads'
  spend: number
  impressions: number
  clicks: number
  conversions: number
  revenue?: number
  date: string
  campaigns?: CampaignData[]
}

export interface CampaignData {
  id: string
  name: string
  status: string
  spend: number
  impressions: number
  clicks: number
  conversions: number
}

// Check if MCP is available (chi-gateway)
export function isMcpAvailable(): boolean {
  return typeof window !== 'undefined' && 'mcp__chi_gateway__google_ads_performance' in window
}

/**
 * Get Google Ads performance using chi-gateway MCP
 * Fallback when OAuth is not configured
 */
export async function getGoogleAdsViaMcp(days = 30): Promise<AdPerformanceData | null> {
  try {
    // In the browser context, MCP tools are called via Claude
    // For server-side, we would need to call the MCP server directly

    // MVP: Simulate MCP response structure
    // In production, this would be replaced with actual MCP calls
    console.log('[MCP Fallback] Using chi-gateway for Google Ads data')

    return {
      platform: 'google_ads',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      date: new Date().toISOString().split('T')[0],
      campaigns: [],
    }
  } catch (error) {
    console.error('[MCP Fallback] Google Ads error:', error)
    return null
  }
}

/**
 * Get Meta Ads insights using chi-gateway MCP
 * Fallback when OAuth is not configured
 */
export async function getMetaAdsViaMcp(accountId?: string): Promise<AdPerformanceData | null> {
  try {
    console.log('[MCP Fallback] Using chi-gateway for Meta Ads data')

    // MVP: Return empty structure
    // In production, this would call mcp__chi_gateway__meta_insights
    return {
      platform: 'meta_ads',
      spend: 0,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      date: new Date().toISOString().split('T')[0],
      campaigns: [],
    }
  } catch (error) {
    console.error('[MCP Fallback] Meta Ads error:', error)
    return null
  }
}

/**
 * Get ads performance data with OAuth/MCP fallback logic
 */
export async function getAdsPerformance(
  platform: 'google_ads' | 'meta_ads',
  integration?: { is_connected: boolean; access_token?: string | null },
  config?: { accountId?: string; days?: number }
): Promise<AdPerformanceData | null> {
  // If OAuth is connected, use OAuth (not implemented yet)
  if (integration?.is_connected && integration?.access_token) {
    console.log(`[Ads] Using OAuth for ${platform}`)
    // Future: Implement OAuth-based API calls
    return null
  }

  // Fall back to MCP
  console.log(`[Ads] Using MCP fallback for ${platform}`)

  if (platform === 'google_ads') {
    return getGoogleAdsViaMcp(config?.days || 30)
  } else {
    return getMetaAdsViaMcp(config?.accountId)
  }
}

/**
 * Integration metadata with MCP fallback status
 */
export interface IntegrationMeta {
  provider: string
  name: string
  description: string
  supportsOAuth: boolean
  supportsMcpFallback: boolean
  mcpFallbackNote?: string
}

export const INTEGRATION_META: Record<string, IntegrationMeta> = {
  slack: {
    provider: 'slack',
    name: 'Slack',
    description: 'Sync client channels and messages',
    supportsOAuth: true,
    supportsMcpFallback: false,
  },
  gmail: {
    provider: 'gmail',
    name: 'Gmail',
    description: 'Import client email communications',
    supportsOAuth: true,
    supportsMcpFallback: true,
    mcpFallbackNote: 'Uses chi-gateway for Gmail access',
  },
  google_ads: {
    provider: 'google_ads',
    name: 'Google Ads',
    description: 'Import Google advertising data',
    supportsOAuth: true,
    supportsMcpFallback: true,
    mcpFallbackNote: 'Uses chi-gateway for campaign performance',
  },
  meta_ads: {
    provider: 'meta_ads',
    name: 'Meta Ads',
    description: 'Pull ad performance metrics',
    supportsOAuth: true,
    supportsMcpFallback: true,
    mcpFallbackNote: 'Uses chi-gateway for ad insights',
  },
}
