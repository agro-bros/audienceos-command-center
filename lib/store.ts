import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { Database, IntegrationProvider } from '@/types/database'

// Extract table types from Database
type Tables = Database['public']['Tables']
type Agency = Tables['agency']['Row']
type User = Tables['user']['Row']
type Client = Tables['client']['Row']
type Alert = Tables['alert']['Row']
type Ticket = Tables['ticket']['Row']
type Integration = Tables['integration']['Row']

// ============================================================================
// AUTH STORE
// ============================================================================
interface AuthState {
  user: User | null
  agency: Agency | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setAgency: (agency: Agency | null) => void
  setLoading: (loading: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  devtools(
    (set) => ({
      user: null,
      agency: null,
      isLoading: true,
      setUser: (user) => set({ user }),
      setAgency: (agency) => set({ agency }),
      setLoading: (isLoading) => set({ isLoading }),
      clear: () => set({ user: null, agency: null, isLoading: false }),
    }),
    { name: 'auth-store' }
  )
)

// ============================================================================
// CLIENTS STORE (Pipeline)
// ============================================================================
interface ClientsState {
  clients: Client[]
  selectedClientId: string | null
  isLoading: boolean
  setClients: (clients: Client[]) => void
  addClient: (client: Client) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  removeClient: (id: string) => void
  setSelectedClient: (id: string | null) => void
  setLoading: (loading: boolean) => void
}

export const useClientsStore = create<ClientsState>()(
  devtools(
    (set) => ({
      clients: [],
      selectedClientId: null,
      isLoading: false,
      setClients: (clients) => set({ clients }),
      addClient: (client) => set((state) => ({ clients: [...state.clients, client] })),
      updateClient: (id, updates) =>
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      removeClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          selectedClientId: state.selectedClientId === id ? null : state.selectedClientId,
        })),
      setSelectedClient: (selectedClientId) => set({ selectedClientId }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'clients-store' }
  )
)

// ============================================================================
// ALERTS STORE
// ============================================================================
interface AlertsState {
  alerts: Alert[]
  unreadCount: number
  isLoading: boolean
  setAlerts: (alerts: Alert[]) => void
  addAlert: (alert: Alert) => void
  updateAlert: (id: string, updates: Partial<Alert>) => void
  dismissAlert: (id: string) => void
  setLoading: (loading: boolean) => void
}

export const useAlertsStore = create<AlertsState>()(
  devtools(
    (set, get) => ({
      alerts: [],
      unreadCount: 0,
      isLoading: false,
      setAlerts: (alerts) =>
        set({
          alerts,
          unreadCount: alerts.filter((a) => a.status === 'active').length,
        }),
      addAlert: (alert) =>
        set((state) => ({
          alerts: [alert, ...state.alerts],
          unreadCount: state.unreadCount + (alert.status === 'active' ? 1 : 0),
        })),
      updateAlert: (id, updates) =>
        set((state) => {
          const newAlerts = state.alerts.map((a) => (a.id === id ? { ...a, ...updates } : a))
          return {
            alerts: newAlerts,
            unreadCount: newAlerts.filter((a) => a.status === 'active').length,
          }
        }),
      dismissAlert: (id) =>
        set((state) => {
          const newAlerts = state.alerts.map((a) =>
            a.id === id ? { ...a, status: 'dismissed' as const } : a
          )
          return {
            alerts: newAlerts,
            unreadCount: newAlerts.filter((a) => a.status === 'active').length,
          }
        }),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'alerts-store' }
  )
)

// ============================================================================
// TICKETS STORE
// ============================================================================
interface TicketsState {
  tickets: Ticket[]
  selectedTicketId: string | null
  filters: {
    status: string[]
    priority: string[]
    assigneeId: string | null
  }
  isLoading: boolean
  setTickets: (tickets: Ticket[]) => void
  addTicket: (ticket: Ticket) => void
  updateTicket: (id: string, updates: Partial<Ticket>) => void
  setSelectedTicket: (id: string | null) => void
  setFilters: (filters: Partial<TicketsState['filters']>) => void
  setLoading: (loading: boolean) => void
}

export const useTicketsStore = create<TicketsState>()(
  devtools(
    (set) => ({
      tickets: [],
      selectedTicketId: null,
      filters: {
        status: [],
        priority: [],
        assigneeId: null,
      },
      isLoading: false,
      setTickets: (tickets) => set({ tickets }),
      addTicket: (ticket) => set((state) => ({ tickets: [...state.tickets, ticket] })),
      updateTicket: (id, updates) =>
        set((state) => ({
          tickets: state.tickets.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      setSelectedTicket: (selectedTicketId) => set({ selectedTicketId }),
      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
      setLoading: (isLoading) => set({ isLoading }),
    }),
    { name: 'tickets-store' }
  )
)

// ============================================================================
// UI STORE (Global UI State)
// ============================================================================
interface UIState {
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  theme: 'light' | 'dark' | 'system'
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setTheme: (theme: UIState['theme']) => void
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        commandPaletteOpen: false,
        theme: 'system',
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
        setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
        setTheme: (theme) => set({ theme }),
      }),
      { name: 'ui-preferences' }
    ),
    { name: 'ui-store' }
  )
)

// ============================================================================
// INTEGRATIONS STORE
// ============================================================================
export type IntegrationStatus = 'connected' | 'disconnected' | 'syncing' | 'error'
export type IntegrationSyncStatus = 'idle' | 'syncing' | 'success' | 'failed'

export interface IntegrationWithMeta extends Integration {
  // Computed/UI state
  status: IntegrationStatus
  syncStatus: IntegrationSyncStatus
  healthScore?: number // 0-100
  errorMessage?: string
}

interface IntegrationsState {
  integrations: IntegrationWithMeta[]
  selectedIntegrationId: string | null
  isLoading: boolean
  isTesting: { [key: string]: boolean } // Track test connection status per integration
  isSyncing: { [key: string]: boolean } // Track sync status per integration

  // Actions
  setIntegrations: (integrations: Integration[]) => void
  addIntegration: (integration: Integration) => void
  updateIntegration: (id: string, updates: Partial<Integration>) => void
  removeIntegration: (id: string) => void
  setSelectedIntegration: (id: string | null) => void
  setLoading: (loading: boolean) => void
  setTesting: (id: string, testing: boolean) => void
  setSyncing: (id: string, syncing: boolean) => void
  setIntegrationStatus: (id: string, status: IntegrationStatus, errorMessage?: string) => void
  setSyncStatus: (id: string, syncStatus: IntegrationSyncStatus) => void
  setHealthScore: (id: string, score: number) => void
}

function mapIntegrationToMeta(integration: Integration): IntegrationWithMeta {
  return {
    ...integration,
    status: integration.is_connected ? 'connected' : 'disconnected',
    syncStatus: 'idle',
  }
}

export const useIntegrationsStore = create<IntegrationsState>()(
  devtools(
    (set) => ({
      integrations: [],
      selectedIntegrationId: null,
      isLoading: false,
      isTesting: {},
      isSyncing: {},

      setIntegrations: (integrations) =>
        set({
          integrations: integrations.map(mapIntegrationToMeta),
        }),

      addIntegration: (integration) =>
        set((state) => ({
          integrations: [...state.integrations, mapIntegrationToMeta(integration)],
        })),

      updateIntegration: (id, updates) =>
        set((state) => ({
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, ...updates } : i
          ),
        })),

      removeIntegration: (id) =>
        set((state) => ({
          integrations: state.integrations.filter((i) => i.id !== id),
          selectedIntegrationId:
            state.selectedIntegrationId === id ? null : state.selectedIntegrationId,
        })),

      setSelectedIntegration: (selectedIntegrationId) => set({ selectedIntegrationId }),

      setLoading: (isLoading) => set({ isLoading }),

      setTesting: (id, testing) =>
        set((state) => ({
          isTesting: { ...state.isTesting, [id]: testing },
        })),

      setSyncing: (id, syncing) =>
        set((state) => ({
          isSyncing: { ...state.isSyncing, [id]: syncing },
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, syncStatus: syncing ? 'syncing' : 'idle' } : i
          ),
        })),

      setIntegrationStatus: (id, status, errorMessage) =>
        set((state) => ({
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, status, errorMessage } : i
          ),
        })),

      setSyncStatus: (id, syncStatus) =>
        set((state) => ({
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, syncStatus } : i
          ),
        })),

      setHealthScore: (id, healthScore) =>
        set((state) => ({
          integrations: state.integrations.map((i) =>
            i.id === id ? { ...i, healthScore } : i
          ),
        })),
    }),
    { name: 'integrations-store' }
  )
)
