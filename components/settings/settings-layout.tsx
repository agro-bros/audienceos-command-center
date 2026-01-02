"use client"

import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { useSettingsStore } from "@/stores/settings-store"
import { useAuthStore } from "@/lib/store"
import type { SettingsSection } from "@/types/settings"
import { SETTINGS_PERMISSIONS } from "@/types/settings"
import {
  Building2,
  Users,
  Bot,
  Bell,
  Workflow,
  Shield,
  ChevronRight,
} from "lucide-react"

// Settings navigation items with metadata
const settingsNavItems: Array<{
  id: SettingsSection
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}> = [
  {
    id: "agency_profile",
    label: "Agency Profile",
    description: "Agency name, logo, timezone, business hours",
    icon: Building2,
  },
  {
    id: "team_members",
    label: "Team Members",
    description: "Manage users and invitations",
    icon: Users,
    adminOnly: true,
  },
  {
    id: "ai_configuration",
    label: "AI Configuration",
    description: "Assistant name, tone, and usage",
    icon: Bot,
    adminOnly: true,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Email, Slack, and digest preferences",
    icon: Bell,
  },
  {
    id: "pipeline",
    label: "Pipeline Stages",
    description: "Custom stages and health thresholds",
    icon: Workflow,
    adminOnly: true,
  },
  {
    id: "security",
    label: "Security",
    description: "Domains, SSO, and access controls",
    icon: Shield,
    adminOnly: true,
  },
  {
    id: "audit_log",
    label: "Audit Log",
    description: "View settings change history",
    icon: Shield,
    adminOnly: true,
  },
]

interface SettingsLayoutProps {
  children: React.ReactNode
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { activeSection, setActiveSection, hasUnsavedChanges } = useSettingsStore()
  const { user } = useAuthStore()

  const isAdmin = user?.role === "admin"

  // Check if user can access a section
  const canAccessSection = useCallback(
    (section: SettingsSection): boolean => {
      const permission = SETTINGS_PERMISSIONS.find(
        (p) => p.section === section && p.action === "read"
      )
      if (!permission) return false
      return permission.roles.includes(user?.role || "user")
    },
    [user?.role]
  )

  // Filter nav items based on user permissions
  const visibleNavItems = settingsNavItems.filter((item) => {
    if (item.adminOnly && !isAdmin) return false
    return canAccessSection(item.id)
  })

  const handleSectionChange = (section: SettingsSection) => {
    if (hasUnsavedChanges) {
      // TODO: Show confirmation dialog
      // For now, allow navigation
    }
    setActiveSection(section)
  }

  return (
    <div className="flex h-full gap-4">
      {/* Settings Sidebar */}
      <aside className="w-56 shrink-0">
        <nav className="space-y-0.5">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id

            return (
              <button
                key={item.id}
                onClick={() => handleSectionChange(item.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-2 rounded-md transition-colors text-left",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[11px] font-medium", isActive && "text-primary")}>
                    {item.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">
                    {item.description}
                  </p>
                </div>
                {isActive && (
                  <ChevronRight className="h-3 w-3 shrink-0 text-primary" />
                )}
              </button>
            )
          })}
        </nav>

        {/* Unsaved changes indicator */}
        {hasUnsavedChanges && (
          <div className="mt-3 px-2.5">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-500">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Unsaved changes
            </div>
          </div>
        )}
      </aside>

      {/* Settings Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
