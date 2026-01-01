# AudienceOS Command Center

> Single-tenant SaaS for marketing agencies - centralized client lifecycle, communications, ad performance, and AI workflows.

## Quick Start

```bash
git clone https://github.com/growthpigs/audienceos-command-center.git
cd audienceos-command-center
npm install
cp .env.example .env.local
# Fill in environment variables
npm run dev
```

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, Tailwind CSS v4, shadcn/ui
- **Database:** Supabase (Postgres + Auth + Storage)
- **State:** Zustand
- **AI:** Anthropic Claude, Google Gemini

## Documentation

- [RUNBOOK.md](./RUNBOOK.md) - Full setup, deployment, troubleshooting
- [docs/](./docs/) - Product specs, technical docs, design system

## Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
npm run test     # Vitest (when tests exist)
```

## Status

**Phase:** D (Technical Specs Complete) - Ready for Sprint 1

---

*Built with [Claude Code](https://claude.ai/claude-code)*
# Test comment from racer 1
