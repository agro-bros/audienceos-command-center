"use client"

import React, { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import { VerticalPageLayout, VerticalSection } from "@/components/linear/vertical-section"
import { Search, Check, AlertCircle, Clock, ExternalLink, Settings2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { integrationIcons } from "@/components/linear/integration-card"

type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing"
type IntegrationCategory = "advertising" | "communication" | "analytics" | "crm" | "productivity"

interface Integration {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  color: string
  category: IntegrationCategory
  status: IntegrationStatus
  lastSync?: string
  accounts?: number
}

// Use shared integration icons from integration-card.tsx

const mockIntegrations: Integration[] = [
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications and send messages directly from your workspace",
    icon: integrationIcons.slack,
    color: "bg-[#4A154B]",
    category: "communication",
    status: "connected",
    lastSync: "2 min ago",
    accounts: 3,
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Sync client communications and track email threads",
    icon: integrationIcons.gmail,
    color: "bg-[#EA4335]",
    category: "communication",
    status: "connected",
    lastSync: "5 min ago",
    accounts: 2,
  },
  {
    id: "google-ads",
    name: "Google Ads",
    description: "Import campaign performance data and manage ad accounts",
    icon: integrationIcons.googleAds,
    color: "bg-[#4285F4]",
    category: "advertising",
    status: "connected",
    lastSync: "1 hour ago",
    accounts: 8,
  },
  {
    id: "meta-ads",
    name: "Meta Ads",
    description: "Connect Facebook and Instagram ad accounts for unified reporting",
    icon: integrationIcons.meta,
    color: "bg-[#0866FF]",
    category: "advertising",
    status: "connected",
    lastSync: "30 min ago",
    accounts: 5,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Import website analytics and conversion data",
    icon: integrationIcons.googleAnalytics,
    color: "bg-[#E37400]",
    category: "analytics",
    status: "syncing",
    lastSync: "Syncing...",
    accounts: 12,
  },
  {
    id: "hubspot",
    name: "HubSpot",
    description: "Sync contacts, deals, and marketing data",
    icon: integrationIcons.hubspot,
    color: "bg-[#FF7A59]",
    category: "crm",
    status: "disconnected",
  },
  {
    id: "notion",
    name: "Notion",
    description: "Link documentation and project notes",
    icon: integrationIcons.notion,
    color: "bg-[#000000]",
    category: "productivity",
    status: "error",
    lastSync: "Failed 2 hours ago",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Automate workflows with 5,000+ apps",
    icon: integrationIcons.zapier,
    color: "bg-[#FF4A00]",
    category: "productivity",
    status: "disconnected",
  },
]

const statusConfig: Record<IntegrationStatus, { icon: React.ReactNode; label: string; className: string }> = {
  connected: {
    icon: <Check className="w-3.5 h-3.5" />,
    label: "Connected",
    className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  disconnected: {
    icon: null,
    label: "Not connected",
    className: "bg-muted text-muted-foreground border-border",
  },
  error: {
    icon: <AlertCircle className="w-3.5 h-3.5" />,
    label: "Error",
    className: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  syncing: {
    icon: <Clock className="w-3.5 h-3.5 animate-spin" />,
    label: "Syncing",
    className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
}

interface IntegrationCardProps {
  integration: Integration
  onClick?: () => void
}

function IntegrationCardComponent({ integration, onClick }: IntegrationCardProps) {
  const status = statusConfig[integration.status]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick?.()
    }
  }

  return (
    <div
      className="bg-card border border-border rounded-lg p-5 hover:border-primary/50 transition-colors cursor-pointer group focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Configure ${integration.name} integration`}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0",
            integration.color
          )}
        >
          {integration.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-medium text-foreground">{integration.name}</h3>
            <button
              className="p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              aria-label={`${integration.name} settings`}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {integration.description}
          </p>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border font-medium",
                status.className
              )}
            >
              {status.icon}
              {status.label}
            </span>
            {integration.accounts && integration.status === "connected" && (
              <span className="text-xs text-muted-foreground">
                {integration.accounts} account{integration.accounts > 1 ? "s" : ""}
              </span>
            )}
          </div>
          {integration.lastSync && integration.status !== "disconnected" && (
            <p className="text-xs text-muted-foreground mt-2">
              {integration.status === "syncing" ? "Syncing..." : `Last synced ${integration.lastSync}`}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export function IntegrationsHub() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<IntegrationCategory | "all">("all")

  const filteredIntegrations = useMemo(() => {
    let result = mockIntegrations

    if (categoryFilter !== "all") {
      result = result.filter((i) => i.category === categoryFilter)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query)
      )
    }

    return result
  }, [searchQuery, categoryFilter])

  const connectedCount = mockIntegrations.filter((i) => i.status === "connected").length
  const errorCount = mockIntegrations.filter((i) => i.status === "error").length

  const categories: { id: IntegrationCategory | "all"; label: string }[] = [
    { id: "all", label: "All" },
    { id: "advertising", label: "Advertising" },
    { id: "communication", label: "Communication" },
    { id: "analytics", label: "Analytics" },
    { id: "crm", label: "CRM" },
    { id: "productivity", label: "Productivity" },
  ]

  return (
    <VerticalPageLayout
      title="Integrations"
      description="Connect your tools and services to power your workflow"
    >
      {/* Stats */}
      <div className="flex items-center gap-6 mb-6">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            {connectedCount} connected
          </span>
        </div>
        {errorCount > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-muted-foreground">
              {errorCount} with errors
            </span>
          </div>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search integrations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-secondary border-border"
          />
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-md p-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={cn(
                "px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer",
                categoryFilter === cat.id
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Integration grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredIntegrations.map((integration) => (
          <IntegrationCardComponent
            key={integration.id}
            integration={integration}
            onClick={() => { /* TODO: Open configuration modal */ }}
          />
        ))}
      </div>

      {filteredIntegrations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No integrations found</p>
        </div>
      )}

      {/* Request integration */}
      <VerticalSection
        title="Missing an integration?"
        description="Request a new integration to be added to the platform"
        className="mt-8"
      >
        <button className="inline-flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
          <ExternalLink className="w-4 h-4" />
          Request an integration
        </button>
      </VerticalSection>
    </VerticalPageLayout>
  )
}
