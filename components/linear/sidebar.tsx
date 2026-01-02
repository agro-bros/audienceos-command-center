"use client"

import React, { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Inbox,
  CircleUser,
  FolderKanban,
  Eye,
  Users,
  ChevronDown,
  Import,
  UserPlus,
  Github,
  Settings,
  Sparkles,
  LayoutGrid,
  Ticket,
  BookOpen,
  Zap,
  Plug,
  Info,
} from "lucide-react"

interface NavItemProps {
  icon: React.ReactNode
  label: string
  badge?: number | string
  active?: boolean
  onClick?: () => void
}

function NavItem({ icon, label, badge, active, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-2 py-1.5 text-sm rounded transition-colors",
        active
          ? "bg-border text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <span className="w-4 h-4 shrink-0">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      {badge && (
        <span className="bg-muted-foreground text-background text-xs px-1.5 py-0.5 rounded">
          {badge}
        </span>
      )}
    </button>
  )
}

interface NavGroupProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function NavGroup({ title, children, defaultOpen = true }: NavGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full mb-2 group"
      >
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            !isOpen && "-rotate-90"
          )}
        />
      </button>
      {isOpen && <div className="space-y-1">{children}</div>}
    </div>
  )
}

interface TeamItemProps {
  name: string
  color: string
  initials: string
  active?: boolean
  onClick?: () => void
}

function TeamItem({ name, color, initials, active, onClick }: TeamItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 w-full px-2 py-1.5 text-sm rounded transition-colors",
        active
          ? "bg-border text-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      )}
    >
      <div
        className={cn("w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold text-white", color)}
      >
        {initials}
      </div>
      <span className="flex-1 text-left truncate">{name}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>
  )
}

export type LinearView =
  | "dashboard"
  | "pipeline"
  | "clients"
  | "onboarding"
  | "intelligence"
  | "tickets"
  | "knowledge"
  | "automations"
  | "integrations"
  | "settings"

interface LinearSidebarProps {
  activeView: LinearView
  onViewChange: (view: LinearView) => void
  agencyName?: string
  agencyInitials?: string
}

export function LinearSidebar({
  activeView,
  onViewChange,
  agencyName = "AudienceOS",
  agencyInitials = "AO",
}: LinearSidebarProps) {
  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center text-xs font-bold text-primary-foreground">
            {agencyInitials}
          </div>
          <span className="font-medium text-sidebar-foreground">{agencyName}</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-4 overflow-y-auto">
        <nav className="space-y-1">
          <NavItem
            icon={<LayoutGrid className="w-4 h-4" />}
            label="Dashboard"
            active={activeView === "dashboard"}
            onClick={() => onViewChange("dashboard")}
          />
          <NavItem
            icon={<Inbox className="w-4 h-4" />}
            label="Inbox"
            badge={4}
            active={activeView === "intelligence"}
            onClick={() => onViewChange("intelligence")}
          />
          <NavItem
            icon={<CircleUser className="w-4 h-4" />}
            label="My Clients"
            active={activeView === "clients"}
            onClick={() => onViewChange("clients")}
          />
        </nav>

        <NavGroup title="Workspace">
          <NavItem
            icon={<FolderKanban className="w-4 h-4" />}
            label="Pipeline"
            active={activeView === "pipeline"}
            onClick={() => onViewChange("pipeline")}
          />
          <NavItem
            icon={<Eye className="w-4 h-4" />}
            label="Views"
          />
          <NavItem
            icon={<Users className="w-4 h-4" />}
            label="Team"
          />
        </NavGroup>

        <NavGroup title="Support">
          <NavItem
            icon={<Ticket className="w-4 h-4" />}
            label="Tickets"
            active={activeView === "tickets"}
            onClick={() => onViewChange("tickets")}
          />
          <NavItem
            icon={<BookOpen className="w-4 h-4" />}
            label="Knowledge Base"
            active={activeView === "knowledge"}
            onClick={() => onViewChange("knowledge")}
          />
        </NavGroup>

        <NavGroup title="Automation">
          <NavItem
            icon={<Zap className="w-4 h-4" />}
            label="Workflows"
            active={activeView === "automations"}
            onClick={() => onViewChange("automations")}
          />
          <NavItem
            icon={<Plug className="w-4 h-4" />}
            label="Integrations"
            active={activeView === "integrations"}
            onClick={() => onViewChange("integrations")}
          />
        </NavGroup>

        <NavGroup title="Your Teams" defaultOpen={true}>
          <TeamItem
            name="Chase Agency"
            color="bg-pink-500"
            initials="CA"
            active
          />
          <div className="ml-7 space-y-1 mt-1">
            <NavItem
              icon={<Sparkles className="w-4 h-4" />}
              label="Onboarding"
              active={activeView === "onboarding"}
              onClick={() => onViewChange("onboarding")}
            />
          </div>
        </NavGroup>

        <NavGroup title="Try">
          <NavItem icon={<Import className="w-4 h-4" />} label="Import clients" />
          <NavItem icon={<UserPlus className="w-4 h-4" />} label="Invite team" />
          <NavItem icon={<Github className="w-4 h-4" />} label="Link GitHub" />
        </NavGroup>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={() => onViewChange("settings")}
          className={cn(
            "flex items-center gap-2 text-xs w-full px-2 py-1.5 rounded transition-colors",
            activeView === "settings"
              ? "bg-border text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <Info className="w-4 h-4" />
          <span>Business trial ends 29d</span>
        </div>
      </div>
    </div>
  )
}
