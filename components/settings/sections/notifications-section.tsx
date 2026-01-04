"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { useSettingsStore } from "@/stores/settings-store"
import { createClient } from "@/lib/supabase"
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Moon,
  Users,
  Send,
  CheckCircle2,
  Loader2,
  X,
  ChevronRight,
  Globe,
  AlertCircle,
} from "lucide-react"
import type { NotificationPreferences } from "@/types/settings"

// Mock clients for muting (in production, fetch from API)
const MOCK_CLIENTS = [
  { id: "1", name: "CloudMetrics Pro", health: "green" },
  { id: "2", name: "Urban Thread Co.", health: "yellow" },
  { id: "3", name: "Horizon Wealth Partners", health: "green" },
  { id: "4", name: "Apex Consulting Group", health: "green" },
  { id: "5", name: "GreenLeaf Markets", health: "red" },
]

// Timezone list (common options)
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "Europe/London", label: "London (GMT)" },
  { value: "Europe/Paris", label: "Paris (CET)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Australia/Sydney", label: "Sydney (AEDT)" },
]

// Setting section header
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

// Setting row - Linear style
function SettingRow({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 pr-4">
        <h4 className="text-sm text-foreground">{label}</h4>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function NotificationsSection() {
  const { toast } = useToast()
  const { setHasUnsavedChanges } = useSettingsStore()

  // Form state
  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [showMutedClients, setShowMutedClients] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Notification preferences
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [emailTickets, setEmailTickets] = useState(true)
  const [emailMentions, setEmailMentions] = useState(true)
  const [slackEnabled, setSlackEnabled] = useState(false)
  const [slackChannel, setSlackChannel] = useState("")

  // Digest mode (TASK-030)
  const [digestMode, setDigestMode] = useState(false)
  const [digestTime, setDigestTime] = useState("08:00")
  const [digestDays, setDigestDays] = useState<string[]>(["monday", "tuesday", "wednesday", "thursday", "friday"])

  // Quiet hours with timezone (TASK-027)
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(false)
  const [quietStart, setQuietStart] = useState("22:00")
  const [quietEnd, setQuietEnd] = useState("08:00")
  const [timezone, setTimezone] = useState("America/New_York")

  // Client muting (TASK-028)
  const [mutedClients, setMutedClients] = useState<string[]>([])

  // Loading state
  const [isLoading, setIsLoading] = useState(true)

  // Load existing preferences on mount
  const loadPreferences = useCallback(async (currentUserId: string) => {
    try {
      const response = await fetch(`/api/v1/settings/users/${currentUserId}/preferences`)
      if (!response.ok) {
        throw new Error('Failed to load preferences')
      }
      const { preferences } = await response.json()
      const prefs = preferences?.notifications || {}

      // Apply loaded preferences
      if (prefs.email_alerts !== undefined) setEmailAlerts(prefs.email_alerts)
      if (prefs.email_tickets !== undefined) setEmailTickets(prefs.email_tickets)
      if (prefs.email_mentions !== undefined) setEmailMentions(prefs.email_mentions)
      if (prefs.slack_channel_id) {
        setSlackEnabled(true)
        setSlackChannel(prefs.slack_channel_id)
      }
      if (prefs.digest_mode !== undefined) setDigestMode(prefs.digest_mode)
      if (prefs.digest_time) setDigestTime(prefs.digest_time)
      if (prefs.digest_days) setDigestDays(prefs.digest_days)
      if (prefs.quiet_hours_start) {
        setQuietHoursEnabled(true)
        setQuietStart(prefs.quiet_hours_start)
      }
      if (prefs.quiet_hours_end) setQuietEnd(prefs.quiet_hours_end)
      if (prefs.timezone) setTimezone(prefs.timezone)
      if (prefs.muted_clients) setMutedClients(prefs.muted_clients)
    } catch (error) {
      console.error('Failed to load notification preferences:', error)
      // Continue with defaults on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const initializeUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user?.id) {
          throw new Error('Failed to get current user')
        }

        setUserId(user.id)
        await loadPreferences(user.id)
      } catch (error) {
        console.error('Failed to initialize user:', error)
        setIsLoading(false)
      }
    }

    initializeUser()
  }, [loadPreferences])

  // Get current timezone display
  const currentTimezoneLabel = TIMEZONES.find(tz => tz.value === timezone)?.label || timezone

  // Handle changes
  const handleChange = () => {
    setHasUnsavedChanges(true)
  }

  // Toggle day in digest schedule
  const toggleDigestDay = (day: string) => {
    setDigestDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
    handleChange()
  }

  // Toggle client mute
  const toggleMuteClient = (clientId: string) => {
    setMutedClients(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    )
    handleChange()
  }

  // Unmute all clients
  const unmuteAllClients = () => {
    setMutedClients([])
    handleChange()
  }

  // Save preferences
  const handleSave = async () => {
    if (!userId) {
      toast({
        title: "Error",
        description: "User ID not loaded. Please refresh the page.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const notifications: NotificationPreferences = {
        email_alerts: emailAlerts,
        email_tickets: emailTickets,
        email_mentions: emailMentions,
        slack_channel_id: slackEnabled ? slackChannel : undefined,
        digest_mode: digestMode,
        digest_time: digestMode ? digestTime : undefined,
        digest_days: digestMode ? digestDays : undefined,
        quiet_hours_start: quietHoursEnabled ? quietStart : undefined,
        quiet_hours_end: quietHoursEnabled ? quietEnd : undefined,
        timezone: quietHoursEnabled ? timezone : undefined,
        muted_clients: mutedClients,
      }

      const response = await fetch(`/api/v1/settings/users/${userId}/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          notifications,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      setHasUnsavedChanges(false)
      toast({
        title: "Settings saved",
        description: "Notification preferences have been updated.",
      })
    } catch (error) {
      console.error('Save preferences error:', error)
      toast({
        title: "Error",
        description: "Failed to save notification preferences.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Test notification (TASK-029)
  const handleTestNotification = async () => {
    setIsTesting(true)

    // Simulate sending test notification
    await new Promise(resolve => setTimeout(resolve, 1500))

    toast({
      title: "Test notification sent",
      description: emailAlerts
        ? "Check your email for the test alert."
        : "Email notifications are disabled. Enable them to receive test alerts.",
    })

    setIsTesting(false)
  }

  // Cancel changes
  const handleCancel = () => {
    setEmailAlerts(true)
    setEmailTickets(true)
    setEmailMentions(true)
    setSlackEnabled(false)
    setSlackChannel("")
    setDigestMode(false)
    setDigestTime("08:00")
    setDigestDays(["monday", "tuesday", "wednesday", "thursday", "friday"])
    setQuietHoursEnabled(false)
    setQuietStart("22:00")
    setQuietEnd("08:00")
    setMutedClients([])
    setHasUnsavedChanges(false)
  }

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-secondary rounded" />
            <div className="h-3 w-48 bg-secondary rounded" />
          </div>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 rounded-lg bg-secondary" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Bell className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">Configure how and when you receive alerts</p>
          </div>
        </div>
      </header>

      {/* Email Notifications */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <SectionHeader
            icon={Mail}
            title="Email Notifications"
            description="Control which events trigger email alerts"
          />
        </div>
        <div className="px-4">
          <SettingRow
            label="Risk Alerts"
            description="Get notified when clients are flagged as at-risk"
          >
            <Switch
              checked={emailAlerts}
              onCheckedChange={(checked) => {
                setEmailAlerts(checked)
                handleChange()
              }}
            />
          </SettingRow>

          <SettingRow
            label="Support Tickets"
            description="Notifications for new and updated tickets"
          >
            <Switch
              checked={emailTickets}
              onCheckedChange={(checked) => {
                setEmailTickets(checked)
                handleChange()
              }}
            />
          </SettingRow>

          <SettingRow
            label="Mentions"
            description="When someone mentions you in a note or comment"
          >
            <Switch
              checked={emailMentions}
              onCheckedChange={(checked) => {
                setEmailMentions(checked)
                handleChange()
              }}
            />
          </SettingRow>
        </div>
      </section>

      {/* Slack Notifications */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <SectionHeader
            icon={MessageSquare}
            title="Slack Notifications"
            description="Send alerts to your connected Slack workspace"
          />
        </div>
        <div className="px-4">
          <SettingRow
            label="Enable Slack"
            description="Send alerts to a Slack channel"
          >
            <Switch
              checked={slackEnabled}
              onCheckedChange={(checked) => {
                setSlackEnabled(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {slackEnabled && (
            <SettingRow
              label="Channel"
              description="Enter the channel name to receive notifications"
            >
              <Input
                value={slackChannel}
                onChange={(e) => {
                  setSlackChannel(e.target.value)
                  handleChange()
                }}
                placeholder="#alerts"
                className="w-40 h-8 text-sm bg-secondary/50 border-border"
              />
            </SettingRow>
          )}
        </div>
      </section>

      {/* Daily Digest - TASK-030 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <SectionHeader
            icon={Clock}
            title="Daily Digest"
            description="Bundle non-urgent notifications into a summary"
          />
        </div>
        <div className="px-4">
          <SettingRow
            label="Enable Digest Mode"
            description="Receive a daily summary instead of real-time alerts"
          >
            <Switch
              checked={digestMode}
              onCheckedChange={(checked) => {
                setDigestMode(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {digestMode && (
            <>
              <SettingRow
                label="Delivery Time"
                description="When to send the daily digest"
              >
                <Input
                  type="time"
                  value={digestTime}
                  onChange={(e) => {
                    setDigestTime(e.target.value)
                    handleChange()
                  }}
                  className="w-28 h-8 text-sm bg-secondary/50 border-border"
                />
              </SettingRow>

              <SettingRow
                label="Delivery Days"
                description="Which days to send the digest"
              >
                <div className="flex gap-1">
                  {weekDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDigestDay(day)}
                      className={cn(
                        "w-7 h-7 rounded text-[10px] font-medium transition-colors",
                        digestDays.includes(day)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                      )}
                    >
                      {day.charAt(0).toUpperCase()}
                    </button>
                  ))}
                </div>
              </SettingRow>
            </>
          )}
        </div>
      </section>

      {/* Quiet Hours - TASK-027 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <SectionHeader
            icon={Moon}
            title="Quiet Hours"
            description="Pause notifications during specific times"
          />
        </div>
        <div className="px-4">
          <SettingRow
            label="Enable Quiet Hours"
            description="No notifications will be sent during these times"
          >
            <Switch
              checked={quietHoursEnabled}
              onCheckedChange={(checked) => {
                setQuietHoursEnabled(checked)
                handleChange()
              }}
            />
          </SettingRow>

          {quietHoursEnabled && (
            <>
              <SettingRow
                label="Timezone"
                description="Your local timezone for quiet hours"
              >
                <select
                  value={timezone}
                  onChange={(e) => {
                    setTimezone(e.target.value)
                    handleChange()
                  }}
                  className="h-8 px-2 text-sm rounded border border-border bg-secondary/50 text-foreground"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </SettingRow>

              <SettingRow
                label="Start Time"
                description="When quiet hours begin"
              >
                <Input
                  type="time"
                  value={quietStart}
                  onChange={(e) => {
                    setQuietStart(e.target.value)
                    handleChange()
                  }}
                  className="w-28 h-8 text-sm bg-secondary/50 border-border"
                />
              </SettingRow>

              <SettingRow
                label="End Time"
                description="When quiet hours end"
              >
                <Input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => {
                    setQuietEnd(e.target.value)
                    handleChange()
                  }}
                  className="w-28 h-8 text-sm bg-secondary/50 border-border"
                />
              </SettingRow>

              {/* Timezone indicator */}
              <div className="py-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Globe className="h-3.5 w-3.5" />
                <span>
                  Quiet hours: {quietStart} - {quietEnd} ({currentTimezoneLabel})
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Client Muting - TASK-028 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div
          className="px-4 py-3 bg-secondary/30 border-b border-border cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={() => setShowMutedClients(!showMutedClients)}
        >
          <div className="flex items-center justify-between">
            <SectionHeader
              icon={Users}
              title="Muted Clients"
              description="Silence notifications from specific clients"
            />
            <div className="flex items-center gap-2">
              {mutedClients.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {mutedClients.length} muted
                </Badge>
              )}
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  showMutedClients && "rotate-90"
                )}
              />
            </div>
          </div>
        </div>

        {showMutedClients && (
          <div className="px-4 py-3">
            {mutedClients.length > 0 && (
              <div className="flex items-center justify-between mb-3 pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground">
                  {mutedClients.length} client{mutedClients.length !== 1 ? 's' : ''} muted
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={unmuteAllClients}
                >
                  Unmute All
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {MOCK_CLIENTS.map((client) => {
                const isMuted = mutedClients.includes(client.id)
                return (
                  <div
                    key={client.id}
                    className={cn(
                      "flex items-center justify-between py-2 px-3 rounded-lg transition-colors",
                      isMuted ? "bg-secondary/50" : "hover:bg-secondary/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          client.health === "green" && "bg-emerald-500",
                          client.health === "yellow" && "bg-yellow-500",
                          client.health === "red" && "bg-red-500"
                        )}
                      />
                      <span className="text-sm text-foreground">{client.name}</span>
                    </div>
                    <Button
                      variant={isMuted ? "secondary" : "ghost"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => toggleMuteClient(client.id)}
                    >
                      {isMuted ? (
                        <>
                          <X className="h-3 w-3 mr-1" />
                          Unmute
                        </>
                      ) : (
                        "Mute"
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Test Notification - TASK-029 */}
      <section className="rounded-lg border border-border overflow-hidden">
        <div className="px-4 py-3 bg-secondary/30 border-b border-border">
          <SectionHeader
            icon={Send}
            title="Test Notifications"
            description="Send a test notification to verify your settings"
          />
        </div>
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Send Test Alert</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We'll send a sample notification to your configured channels
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleTestNotification}
              disabled={isTesting || (!emailAlerts && !slackEnabled)}
            >
              {isTesting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  Send Test
                </>
              )}
            </Button>
          </div>

          {!emailAlerts && !slackEnabled && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Enable at least one notification channel to send a test</span>
            </div>
          )}
        </div>
      </section>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
