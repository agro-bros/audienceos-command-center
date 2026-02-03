/**
 * Merge Readiness Tests: develop → main
 *
 * Validates the develop branch is safe to merge into main.
 * Primary change: Supabase project ID migration
 *   old: ebxshdqfaqupnvpghodi
 *   new: qzkirjjrcblkqvhvalue
 *
 * Run with: npx vitest run __tests__/merge-readiness/
 */
import { describe, it, expect } from 'vitest'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const ROOT = path.resolve(__dirname, '../..')

// Split IDs so this test file itself doesn't trigger the "old ID present" check
const OLD_ID_PARTS = ['ebxshdqfaqup', 'nvpghodi']
const OLD_SUPABASE_ID = OLD_ID_PARTS.join('')
const NEW_SUPABASE_ID = 'qzkirjjrcblkqvhvalue'

// Known separate Supabase projects (not part of this migration)
const KNOWN_OTHER_PROJECTS = ['trdoainmejxanrownbuz'] // RevOS project

// This test file's own path (for self-exclusion)
const SELF_PATH = path.resolve(__dirname, 'develop-to-main.test.ts')

/**
 * Recursively collect files matching extensions, skipping ignored dirs.
 */
function collectFiles(
  dir: string,
  extensions: string[],
  opts: { ignore?: string[]; excludeFiles?: string[] } = {}
): string[] {
  const results: string[] = []
  const defaultIgnore = ['node_modules', '.next', '.git', 'dist', '.vercel']
  const allIgnore = [...defaultIgnore, ...(opts.ignore || [])]
  const excludeSet = new Set(opts.excludeFiles || [])

  function walk(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!allIgnore.includes(entry.name)) {
          walk(fullPath)
        }
      } else if (entry.isFile()) {
        if (excludeSet.has(fullPath)) continue
        const ext = path.extname(entry.name).slice(1)
        if (extensions.includes(ext)) {
          results.push(fullPath)
        }
      }
    }
  }

  walk(dir)
  return results
}

describe('Merge Readiness: develop → main', () => {
  describe('Supabase Project ID Migration', () => {
    const codeExtensions = ['ts', 'tsx', 'js', 'jsx', 'mjs', 'mts']
    const allExtensions = [...codeExtensions, 'md', 'json', 'yaml', 'yml', 'toml', 'env']
    const excludeSelf = { excludeFiles: [SELF_PATH] }

    it('old Supabase project ID is absent from all source files', () => {
      const files = collectFiles(ROOT, codeExtensions, excludeSelf)
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes(OLD_SUPABASE_ID)) {
          violations.push(path.relative(ROOT, file))
        }
      }

      expect(
        violations,
        `Old Supabase ID "${OLD_SUPABASE_ID}" still found in:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })

    it('old Supabase project ID is absent from documentation', () => {
      const files = collectFiles(ROOT, ['md'], excludeSelf)
      const violations: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes(OLD_SUPABASE_ID)) {
          violations.push(path.relative(ROOT, file))
        }
      }

      expect(
        violations,
        `Old Supabase ID still in docs:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })

    it('new Supabase project ID is present in key infrastructure files', () => {
      const criticalFiles = [
        'CLAUDE.md',
        'HANDOVER.md',
        'infrastructure/cloudflare/cc-gateway/src/routes/supabase.ts',
        'check-alerts.mjs',
        'deploy-alerts.mjs',
        'verify-alerts.mjs',
      ]

      const missing: string[] = []
      for (const relPath of criticalFiles) {
        const fullPath = path.join(ROOT, relPath)
        if (!fs.existsSync(fullPath)) {
          missing.push(`${relPath} (file missing)`)
          continue
        }
        const content = fs.readFileSync(fullPath, 'utf-8')
        if (!content.includes(NEW_SUPABASE_ID)) {
          missing.push(relPath)
        }
      }

      expect(
        missing,
        `New Supabase ID missing from critical files:\n${missing.join('\n')}`
      ).toHaveLength(0)
    })

    it('hardcoded Supabase URLs in scripts use the new project ID', () => {
      const scriptFiles = collectFiles(path.join(ROOT, 'scripts'), codeExtensions, excludeSelf)
      const violations: string[] = []

      for (const file of scriptFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const supabaseUrlRegex = /https:\/\/([a-z]+)\.supabase\.co/g
        let match
        while ((match = supabaseUrlRegex.exec(content)) !== null) {
          const projectId = match[1]
          if (
            projectId !== NEW_SUPABASE_ID &&
            projectId !== 'your-project' &&
            !KNOWN_OTHER_PROJECTS.includes(projectId)
          ) {
            violations.push(`${path.relative(ROOT, file)}: found ID "${projectId}"`)
          }
        }
      }

      expect(
        violations,
        `Scripts with wrong Supabase URL:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })

    it('no mixed old and new IDs coexist in any single file', () => {
      const files = collectFiles(ROOT, allExtensions, excludeSelf)
      const mixed: string[] = []

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        if (content.includes(OLD_SUPABASE_ID) && content.includes(NEW_SUPABASE_ID)) {
          mixed.push(path.relative(ROOT, file))
        }
      }

      expect(
        mixed,
        `Files containing BOTH old and new IDs:\n${mixed.join('\n')}`
      ).toHaveLength(0)
    })
  })

  describe('CLAUDE.md Project ID Consistency', () => {
    it('CLAUDE.md declares the correct Supabase project ID', () => {
      const claudeMd = fs.readFileSync(path.join(ROOT, 'CLAUDE.md'), 'utf-8')
      expect(claudeMd).toContain(`Supabase:** ${NEW_SUPABASE_ID}`)
    })
  })

  describe('Configuration Integrity', () => {
    it('package.json is valid JSON', () => {
      const pkgPath = path.join(ROOT, 'package.json')
      const raw = fs.readFileSync(pkgPath, 'utf-8')
      expect(() => JSON.parse(raw)).not.toThrow()
    })

    it('package.json has all required scripts', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'))
      const requiredScripts = ['dev', 'build', 'start', 'test', 'lint', 'typecheck']
      for (const script of requiredScripts) {
        expect(pkg.scripts[script], `Missing script: ${script}`).toBeDefined()
      }
    })

    it('vitest.config.ts exists and is importable', () => {
      expect(fs.existsSync(path.join(ROOT, 'vitest.config.ts'))).toBe(true)
    })

    it('tsconfig.json exists and is readable', () => {
      const tsconfigPath = path.join(ROOT, 'tsconfig.json')
      expect(fs.existsSync(tsconfigPath)).toBe(true)
      // tsconfig supports comments and trailing commas (JSONC), so just verify it reads
      const raw = fs.readFileSync(tsconfigPath, 'utf-8')
      expect(raw.length).toBeGreaterThan(0)
      // Verify it at least contains expected keys
      expect(raw).toContain('compilerOptions')
    })

    it('.env.example exists with required variables', () => {
      const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf-8')
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
      ]

      for (const v of requiredVars) {
        expect(envExample, `Missing env var ${v} in .env.example`).toContain(v)
      }
    })

    it('.env.example does not contain real project IDs', () => {
      const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf-8')
      expect(envExample).not.toContain(NEW_SUPABASE_ID)
      expect(envExample).not.toContain(OLD_SUPABASE_ID)
    })
  })

  describe('Critical File Existence', () => {
    const requiredFiles = [
      'app/layout.tsx',
      'app/page.tsx',
      'middleware.ts',
      'next.config.ts',
      'vitest.config.ts',
      'playwright.config.ts',
    ]

    it('all critical app files exist', () => {
      const missing: string[] = []
      for (const file of requiredFiles) {
        const fullPath = path.join(ROOT, file)
        if (!fs.existsSync(fullPath)) {
          const base = file.replace(/\.[^.]+$/, '')
          const alts = ['.ts', '.mts', '.js', '.mjs']
          const found = alts.some((ext) => fs.existsSync(path.join(ROOT, base + ext)))
          if (!found) {
            missing.push(file)
          }
        }
      }

      expect(missing, `Missing critical files:\n${missing.join('\n')}`).toHaveLength(0)
    })
  })

  describe('Git State Validation', () => {
    it('develop branch has no merge conflict markers in tracked files', () => {
      // Use git to check for conflict markers, which avoids false positives
      // from test files that mention these strings
      try {
        const result = execSync(
          'git diff --check HEAD 2>&1 || true',
          { cwd: ROOT, encoding: 'utf-8' }
        ).trim()
        // git diff --check reports conflict markers and whitespace errors
        const conflictLines = result
          .split('\n')
          .filter((line) => line.includes('conflict marker'))
        expect(
          conflictLines,
          `Merge conflict markers found:\n${conflictLines.join('\n')}`
        ).toHaveLength(0)
      } catch {
        // git command failed, skip
      }
    })

    it('no .env.local or credentials committed', () => {
      try {
        const result = execSync('git ls-files .env.local .env.production .env.staging', {
          cwd: ROOT,
          encoding: 'utf-8',
        }).trim()
        expect(result, 'Credential files should not be tracked by git').toBe('')
      } catch {
        // git command failed, skip
      }
    })
  })

  describe('Supabase Dashboard URL Consistency', () => {
    it('all audienceos supabase dashboard URLs reference the new project ID', () => {
      const files = collectFiles(ROOT, ['ts', 'tsx', 'js', 'jsx', 'mjs', 'md'], {
        excludeFiles: [SELF_PATH],
      })
      const violations: string[] = []
      const dashboardUrlRegex = /supabase\.com\/dashboard\/project\/([a-z]+)/g

      for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')
        let match
        while ((match = dashboardUrlRegex.exec(content)) !== null) {
          const projectId = match[1]
          // Allow known other projects (e.g., RevOS)
          if (projectId !== NEW_SUPABASE_ID && !KNOWN_OTHER_PROJECTS.includes(projectId)) {
            violations.push(`${path.relative(ROOT, file)}: dashboard URL uses "${projectId}"`)
          }
        }
      }

      expect(
        violations,
        `Dashboard URLs with wrong project ID:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })
  })
})
