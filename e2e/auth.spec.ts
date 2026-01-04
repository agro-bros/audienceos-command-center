import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('login page renders correctly', async ({ page }) => {
    await page.goto('/login')

    // Check page title
    await expect(page.locator('h1, h2').filter({ hasText: /AudienceOS/i })).toBeVisible()

    // Check form elements
    await expect(page.locator('input[type="email"], input[placeholder*="email" i]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"], button:has-text("Sign in")')).toBeVisible()
  })

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Fill in invalid credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'invalid@test.com')
    await page.fill('input[type="password"]', 'wrongpassword')

    // Submit form
    await page.click('button[type="submit"], button:has-text("Sign in")')

    // Should show error message
    await expect(page.locator('text=/invalid|error|incorrect/i')).toBeVisible({ timeout: 10000 })
  })

  // FIXME: Test credentials don't work with mock auth - needs Supabase test user
  test.skip('redirects to home after successful login', async ({ page }) => {
    await page.goto('/login')

    // Fill in test credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'test@audienceos.com')
    await page.fill('input[type="password"]', 'TestPassword123!')

    // Submit form
    await page.click('button[type="submit"], button:has-text("Sign in")')

    // Should redirect to home (pipeline view) or stay logged in
    await expect(page).toHaveURL('/', { timeout: 10000 })

    // Should show authenticated UI - sidebar with navigation items
    await expect(page.locator('text=Pipeline').or(page.locator('text=Dashboard'))).toBeVisible({ timeout: 10000 })
  })
})
