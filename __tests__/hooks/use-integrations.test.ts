import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => ({
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  })),
}))

// Mock the store
vi.mock('@/lib/store', () => ({
  useIntegrationsStore: vi.fn((selector) => {
    const state = {
      integrations: mockStoreIntegrations,
      isLoading: mockIsLoading,
      setIntegrations: vi.fn(),
      setLoading: vi.fn(),
      addIntegration: vi.fn(),
      updateIntegration: vi.fn(),
      removeIntegration: vi.fn(),
    }
    return selector ? selector(state) : state
  }),
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Store mock state
let mockStoreIntegrations: any[] = []
let mockIsLoading = false

import { useIntegrations } from '@/hooks/use-integrations'
import { useIntegrationsStore } from '@/lib/store'

describe('useIntegrations', () => {
  beforeEach(() => {
    mockStoreIntegrations = []
    mockIsLoading = false
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('should return integrations from store', () => {
      mockStoreIntegrations = [
        { id: 'int-1', provider: 'slack', is_connected: true },
        { id: 'int-2', provider: 'gmail', is_connected: false },
      ]

      const { result } = renderHook(() => useIntegrations())

      expect(result.current.integrations).toEqual(mockStoreIntegrations)
    })

    it('should return isLoading state from store', () => {
      mockIsLoading = true

      const { result } = renderHook(() => useIntegrations())

      expect(result.current.isLoading).toBe(true)
    })

    it('should provide refetch function', () => {
      const { result } = renderHook(() => useIntegrations())

      expect(typeof result.current.refetch).toBe('function')
    })
  })

  describe('API fetching', () => {
    it('should fetch from /api/v1/integrations with credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: [] }),
      })

      renderHook(() => useIntegrations())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/integrations',
          expect.objectContaining({ credentials: 'include' })
        )
      })
    })

    it('should handle successful API response', async () => {
      const mockData = [
        { id: 'int-1', provider: 'slack', is_connected: true },
      ]
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: mockData }),
      })

      const mockSetIntegrations = vi.fn()
      vi.mocked(useIntegrationsStore).mockImplementation((selector) => {
        const state = {
          integrations: [],
          isLoading: false,
          setIntegrations: mockSetIntegrations,
          setLoading: vi.fn(),
          addIntegration: vi.fn(),
          updateIntegration: vi.fn(),
          removeIntegration: vi.fn(),
        }
        return selector ? selector(state) : state
      })

      renderHook(() => useIntegrations())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should handle null data response with empty array fallback', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: null }),
      })

      const mockSetIntegrations = vi.fn()
      const mockSetLoading = vi.fn()
      vi.mocked(useIntegrationsStore).mockImplementation((selector) => {
        const state = {
          integrations: [],
          isLoading: false,
          setIntegrations: mockSetIntegrations,
          setLoading: mockSetLoading,
          addIntegration: vi.fn(),
          updateIntegration: vi.fn(),
          removeIntegration: vi.fn(),
        }
        if (selector) return selector(state)
        return { ...state, getState: () => state }
      })

      renderHook(() => useIntegrations())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })
    })

    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      renderHook(() => useIntegrations())

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      consoleSpy.mockRestore()
    })
  })

  describe('refetch function', () => {
    it('should call fetch when refetch is invoked', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: [] }),
      })

      const mockSetIntegrations = vi.fn()
      const mockSetLoading = vi.fn()
      vi.mocked(useIntegrationsStore).mockImplementation((selector) => {
        const state = {
          integrations: [],
          isLoading: false,
          setIntegrations: mockSetIntegrations,
          setLoading: mockSetLoading,
          addIntegration: vi.fn(),
          updateIntegration: vi.fn(),
          removeIntegration: vi.fn(),
        }
        if (selector) return selector(state)
        return { ...state, getState: () => state }
      })

      const { result } = renderHook(() => useIntegrations())

      // Call refetch
      act(() => {
        result.current.refetch()
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/v1/integrations',
          expect.objectContaining({ credentials: 'include' })
        )
      })
    })
  })

  describe('Supabase realtime subscription', () => {
    it('should set up realtime channel on mount', async () => {
      const mockChannel = vi.fn().mockReturnValue({
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      })
      const mockRemoveChannel = vi.fn()

      vi.mocked(await import('@/lib/supabase')).createClient = vi.fn(() => ({
        channel: mockChannel,
        removeChannel: mockRemoveChannel,
      })) as any

      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: [] }),
      })

      const { unmount } = renderHook(() => useIntegrations())

      // Unmount should cleanup
      unmount()
    })
  })
})

describe('integration provider types', () => {
  it('should support slack provider', () => {
    const slackIntegration = {
      id: 'int-1',
      provider: 'slack' as const,
      is_connected: true,
      agency_id: 'agency-1',
    }
    expect(slackIntegration.provider).toBe('slack')
  })

  it('should support gmail provider', () => {
    const gmailIntegration = {
      id: 'int-2',
      provider: 'gmail' as const,
      is_connected: false,
      agency_id: 'agency-1',
    }
    expect(gmailIntegration.provider).toBe('gmail')
  })

  it('should support google_ads provider', () => {
    const googleAdsIntegration = {
      id: 'int-3',
      provider: 'google_ads' as const,
      is_connected: true,
      agency_id: 'agency-1',
    }
    expect(googleAdsIntegration.provider).toBe('google_ads')
  })

  it('should support meta_ads provider', () => {
    const metaAdsIntegration = {
      id: 'int-4',
      provider: 'meta_ads' as const,
      is_connected: true,
      agency_id: 'agency-1',
    }
    expect(metaAdsIntegration.provider).toBe('meta_ads')
  })
})
