import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as Crypto
}
global.crypto.randomUUID = (() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)) as () => `${string}-${string}-${string}-${string}-${string}`
