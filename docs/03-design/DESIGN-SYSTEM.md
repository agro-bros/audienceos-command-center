# AudienceOS Design System

> **Based on:** Linear's design philosophy
> **Created:** 2025-12-31
> **Verified:** 2026-01-01 (CSS extraction from linear.app + Mobbin audit)
> **Component Library:** shadcn/ui (Radix primitives)

---

## CRITICAL RULE: Line Height = Font Size × 1.25

**All typography uses 125% line height (font size + 25%).** This is non-negotiable across the entire application. No exceptions.

```
line-height = font-size × 1.25
```

---

## Design Philosophy

AudienceOS follows Linear's design philosophy: **minimal, functional, and quietly beautiful.** The interface should feel like a professional tool that gets out of the way and lets users focus on their work.

### Core Principles

1. **Clarity over decoration** - Every element serves a purpose
2. **Subtle depth** - Use shadows and layers sparingly but effectively
3. **Motion with meaning** - Animations communicate state, not impress
4. **Density when needed** - Information-rich without feeling cluttered
5. **Dark mode first** - Designed for extended use

---

## Color Palette

### Semantic Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| `--background` | `#FFFFFF` | `#0A0A0B` | Page background |
| `--foreground` | `#0A0A0B` | `#FAFAFA` | Primary text |
| `--muted` | `#F4F4F5` | `#18181B` | Subtle backgrounds |
| `--muted-foreground` | `#71717A` | `#A1A1AA` | Secondary text |
| `--border` | `#E4E4E7` | `#27272A` | Dividers, card borders |
| `--ring` | `#3B82F6` | `#3B82F6` | Focus states |

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#3B82F6` | Primary actions, links |
| `--primary-foreground` | `#FFFFFF` | Text on primary |
| `--accent` | `#8B5CF6` | AI features, special states |

### Status Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--success` | `#22C55E` | Healthy, connected, success |
| `--warning` | `#F59E0B` | Attention needed, yellow health |
| `--destructive` | `#EF4444` | Critical, at-risk, errors |
| `--info` | `#3B82F6` | Informational |

### Health Indicators

| Status | Color | Dot | Badge |
|--------|-------|-----|-------|
| Healthy | `#22C55E` | Green filled | `bg-green-500/10 text-green-500` |
| Warning | `#F59E0B` | Yellow filled | `bg-yellow-500/10 text-yellow-500` |
| At Risk | `#EF4444` | Red filled | `bg-red-500/10 text-red-500` |

---

## Typography

### Font Stack (Verified from Linear)

```css
/* Primary - Inter Variable for precision weight control */
--font-sans: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;

/* Monospace - for code blocks */
--font-mono: "JetBrains Mono", "Fira Code", monospace;
```

**Note:** Linear uses "Inter Variable" which allows precise font-weight values like 510. If unavailable, fall back to standard Inter.

### Type Scale (125% Line Height Rule Applied)

| Name | Size | Weight | Line Height | Calculation | Usage |
|------|------|--------|-------------|-------------|-------|
| `text-xs` | 11px | 400 | 14px | 11 × 1.25 = 13.75 → 14 | Badges, timestamps |
| `text-sm` | 13px | 510 | 16px | 13 × 1.25 = 16.25 → 16 | Buttons, nav items, labels |
| `text-base` | 14px | 400 | 18px | 14 × 1.25 = 17.5 → 18 | Body text (default) |
| `text-lg` | 16px | 500 | 20px | 16 × 1.25 = 20 | Card titles |
| `text-xl` | 18px | 600 | 22px | 18 × 1.25 = 22.5 → 22 | Section headers |
| `text-2xl` | 24px | 600 | 30px | 24 × 1.25 = 30 | Page titles |
| `text-3xl` | 30px | 700 | 38px | 30 × 1.25 = 37.5 → 38 | Dashboard KPIs |
| `text-4xl` | 48px | 510 | 60px | 48 × 1.25 = 60 | Hero headlines |
| `text-5xl` | 80px | 510 | 100px | 80 × 1.25 = 100 | Marketing hero (Linear style) |

### Letter Spacing (Verified from Linear)

| Size | Letter Spacing | Note |
|------|---------------|------|
| `text-5xl` (80px) | -1.76px | Tight for large headlines |
| `text-4xl` (48px) | -1px | Slightly tight |
| `text-3xl` and below | 0 | Normal tracking |

### Weight Guidelines (Linear Uses 510 for UI)

- **400 (Regular):** Body text, descriptions
- **500 (Medium):** Labels, card titles
- **510 (Linear Medium):** Buttons, navigation - LINEAR'S SIGNATURE WEIGHT
- **600 (Semibold):** Section headers, page titles
- **700 (Bold):** Dashboard metrics, emphasis

---

## Spacing

### Base Unit

All spacing uses a 4px base unit.

| Token | Value | Usage |
|-------|-------|-------|
| `space-0` | 0px | - |
| `space-1` | 4px | Tight inline spacing |
| `space-2` | 8px | Default inline spacing |
| `space-3` | 12px | Between related elements |
| `space-4` | 16px | Standard padding |
| `space-5` | 20px | Section spacing |
| `space-6` | 24px | Card padding |
| `space-8` | 32px | Large gaps |
| `space-10` | 40px | Section dividers |
| `space-12` | 48px | Major section breaks |

### Component Spacing

| Component | Padding | Gap |
|-----------|---------|-----|
| Button | `8px 16px` | - |
| Card | `16px` | - |
| Modal | `24px` | - |
| Table cell | `12px 16px` | - |
| Form field | `8px 12px` | `8px` (stacked) |

---

## Shadows

### Elevation System

Linear uses subtle shadows for depth without harsh drop shadows.

| Level | CSS | Usage |
|-------|-----|-------|
| `shadow-none` | `none` | Flat elements |
| `shadow-xs` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `shadow-sm` | `0 1px 3px rgba(0,0,0,0.1)` | Cards, buttons |
| `shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Dropdowns, popovers |
| `shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, drawers |

### Dark Mode Shadows

In dark mode, shadows are less visible. Use subtle glows or border emphasis instead:

```css
/* Dark mode card */
.card-dark {
  background: #18181B;
  border: 1px solid #27272A;
  box-shadow: 0 0 0 1px rgba(255,255,255,0.05);
}
```

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-none` | 0px | - |
| `rounded-sm` | 4px | Buttons, inputs |
| `rounded` | 6px | Cards, badges |
| `rounded-md` | 8px | Modals, large cards |
| `rounded-lg` | 12px | Large containers |
| `rounded-full` | 9999px | Avatars, pills |

---

## Components

### Buttons (Verified from Linear CSS)

#### Button Specifications

| Property | Value | Note |
|----------|-------|------|
| Font Size | 13px | `text-sm` |
| Font Weight | 510 | Linear's signature weight |
| Height | 32px | Standard button height |
| Padding | 0px 12px | Horizontal only |
| Border Radius | 8px | `rounded-md` |
| Line Height | 16px | 13 × 1.25 = 16.25 → 16 |

#### Button Colors (Dark Mode - Primary)

| State | Background | Text Color |
|-------|------------|------------|
| Default | `rgb(230, 230, 230)` / `#E6E6E6` | `rgb(8, 9, 10)` / `#08090A` |
| Hover | `rgb(255, 255, 255)` / `#FFFFFF` | `rgb(8, 9, 10)` / `#08090A` |

#### Button Colors (Ghost/Nav)

| State | Background | Text Color |
|-------|------------|------------|
| Default | `transparent` | `rgb(138, 143, 152)` / `#8A8F98` |
| Hover | `rgba(255, 255, 255, 0.05)` | `rgb(255, 255, 255)` |

```tsx
// Primary - main actions
<Button>Create Client</Button>

// Secondary - alternative actions
<Button variant="secondary">Cancel</Button>

// Ghost - tertiary actions (nav items)
<Button variant="ghost">View Details</Button>

// Destructive - dangerous actions
<Button variant="destructive">Delete</Button>

// Icon button
<Button size="icon" variant="ghost">
  <MoreHorizontal className="h-4 w-4" />
</Button>
```

#### Button States

| State | Style |
|-------|-------|
| Default | Solid background |
| Hover | Slightly lighter/darker |
| Active | Pressed effect (translateY 1px) |
| Disabled | 50% opacity, no pointer |
| Loading | Spinner replaces text |

### Cards

```tsx
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-lg font-medium">Client Name</CardTitle>
    <CardDescription>Added 3 days ago</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>
```

#### Card Variants

| Variant | Border | Background | Usage |
|---------|--------|------------|-------|
| Default | `border-border` | `bg-card` | Standard cards |
| Elevated | `border-transparent` | `bg-card shadow-sm` | Floating cards |
| Interactive | `hover:border-primary` | `bg-card` | Clickable cards |
| Kanban | `border-border` | `bg-muted/50` | Pipeline cards |

### Badges

```tsx
// Status badges
<Badge variant="success">Healthy</Badge>
<Badge variant="warning">At Risk</Badge>
<Badge variant="destructive">Critical</Badge>

// Info badges
<Badge variant="secondary">5 clients</Badge>
<Badge variant="outline">New</Badge>
```

### Form Elements

```tsx
// Input
<Input placeholder="Search clients..." />

// Select
<Select>
  <SelectTrigger>
    <SelectValue placeholder="Select stage" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="onboarding">Onboarding</SelectItem>
  </SelectContent>
</Select>

// Checkbox
<Checkbox id="terms" />
<Label htmlFor="terms">Accept terms</Label>
```

---

## Layout Patterns

### Sidebar Navigation

```
┌─────────────────────────────────────────────┐
│ ┌────┐  AudienceOS                          │
│ │Logo│                                      │
│ └────┘                                      │
├─────────────────────────────────────────────┤
│ ▫ Dashboard                                  │
│ ▫ Pipeline                                   │
│ ▪ Clients                    [selected]      │
│ ▫ Intelligence                               │
│ ▫ Tickets                                    │
│ ▫ Knowledge Base                             │
│ ▫ Automations                                │
│ ▫ Integrations                               │
├─────────────────────────────────────────────┤
│ ▫ Settings                                   │
│                                              │
│ ┌──────────────────────┐                     │
│ │ 👤 User Name         │                     │
│ │    user@agency.com   │                     │
│ └──────────────────────┘                     │
└─────────────────────────────────────────────┘
```

- Width: `240px` (collapsible to `64px`)
- Background: `bg-muted` (light) / `bg-zinc-900` (dark)
- Active item: `bg-primary/10 text-primary`

### Content Area

```
┌─────────────────────────────────────────────────┐
│ Page Title                        [Action Btn]  │
├─────────────────────────────────────────────────┤
│ Filter chips: [All] [Active] [At Risk] [+]      │
├─────────────────────────────────────────────────┤
│                                                 │
│   [ Main Content Area ]                         │
│                                                 │
│   - Cards, tables, Kanban boards               │
│   - Max width: 1440px                          │
│   - Padding: 24px                              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Drawer/Slide-Over

- Width: `480px` (client details) or `640px` (forms)
- Overlay: `bg-black/50`
- Animation: Slide from right, 200ms
- Close: X button + click outside + Escape key

### Modal/Dialog

- Max width: `sm` (400px), `md` (500px), `lg` (640px)
- Overlay: `bg-black/50`
- Animation: Fade + scale up, 150ms
- Center vertically with max-height constraint

---

## Properties Panel Pattern (CRITICAL)

> **Reference:** Mobbin's Properties panel pattern
> **This pattern is frequently misimplemented. Follow exactly.**

### The Pattern

A Properties panel displays key-value metadata in a structured grid format.

```
┌─────────────────────────────────────────────────────────┐
│  Label1      Value1           Label2      Value2        │
│  Label3      Value3           Label4      Value4        │
│  Label5      Value5           Label6      Value6        │
└─────────────────────────────────────────────────────────┘
```

### CRITICAL RULES

1. **ALL text is LEFT-aligned** - Labels AND values are left-aligned
2. **Fixed-width label columns** - Labels use fixed width (e.g., 80px) for consistency
3. **Values start at consistent position** - Like tab stops, not right-aligned
4. **NO text-right on values** - This is the most common mistake

### Correct Implementation

```tsx
// ✅ CORRECT - 4-column grid, all left-aligned
<div className="grid grid-cols-[80px_1fr_80px_1fr] gap-x-3 gap-y-1.5 items-center">
  <span className="text-xs text-muted-foreground">Category</span>
  <span className="text-xs text-foreground">{category}</span>
  <span className="text-xs text-muted-foreground">Size</span>
  <span className="text-xs text-foreground">{size}</span>

  <span className="text-xs text-muted-foreground">Views</span>
  <span className="text-xs text-foreground">{views}</span>
  <span className="text-xs text-muted-foreground">Downloads</span>
  <span className="text-xs text-foreground">{downloads}</span>
</div>
```

### WRONG Implementation

```tsx
// ❌ WRONG - values right-aligned
<div className="flex items-center justify-between">
  <span>Category</span>
  <span className="text-right">{category}</span>  // DON'T DO THIS
</div>

// ❌ WRONG - auto-width labels (inconsistent tab stops)
<div className="grid grid-cols-[auto_1fr_auto_1fr]">  // DON'T DO THIS
```

### Visual Comparison

```
❌ WRONG (right-aligned values):
Category                              Onboarding
Size                                       48 KB
Views                                        342

✅ CORRECT (left-aligned values at consistent position):
Category    Onboarding      Size        48 KB
Views       342             Downloads   89
```

### Single Column Variant

For narrow panels, use single column with same left-aligned pattern:

```tsx
<div className="grid grid-cols-[80px_1fr] gap-x-3 gap-y-1.5">
  <span className="text-xs text-muted-foreground">Status</span>
  <span className="text-xs text-foreground">{status}</span>

  <span className="text-xs text-muted-foreground">Lead</span>
  <span className="text-xs text-foreground">{lead}</span>
</div>
```

### Specifications

| Property | Value |
|----------|-------|
| Label Width | 80px (fixed) |
| Gap X | 12px (`gap-x-3`) |
| Gap Y | 6px (`gap-y-1.5`) |
| Label Color | `text-muted-foreground` |
| Value Color | `text-foreground` |
| Font Size | 12px (`text-xs`) |
| Alignment | ALL LEFT |

---

## Iconography

### Icon Library

Use **Lucide React** for all icons.

```tsx
import {
  Users,
  LayoutDashboard,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
```

### Icon Sizes

| Context | Size | Class |
|---------|------|-------|
| Inline text | 14px | `h-3.5 w-3.5` |
| Buttons | 16px | `h-4 w-4` |
| Navigation | 18px | `h-[18px] w-[18px]` |
| Empty states | 48px | `h-12 w-12` |

### Icon + Text Alignment

Always use `inline-flex items-center gap-2` for icon-text combinations.

---

## Animation

### Timing Functions

```css
--ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Duration

| Type | Duration | Usage |
|------|----------|-------|
| Micro | 100ms | Hover states |
| Fast | 150ms | Buttons, toggles |
| Normal | 200ms | Modals, drawers |
| Slow | 300ms | Page transitions |

### Common Animations

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from { transform: translateY(10px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Progressive reveal for AI chat */
@keyframes typewriter {
  from { width: 0; }
  to { width: 100%; }
}
```

---

## Dark Mode

### Implementation

```tsx
// tailwind.config.ts
module.exports = {
  darkMode: "class",
  // ...
}

// Toggle in <html> element
<html className="dark">
```

### Dark Mode Adjustments

| Element | Light | Dark |
|---------|-------|------|
| Background | White | Near-black (#0A0A0B) |
| Cards | White | Zinc-900 |
| Borders | Gray-200 | Zinc-800 |
| Text | Black | White |
| Shadows | Visible | Reduced/glow |

---

## Responsive Breakpoints

| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablets |
| `lg` | 1024px | Small laptops |
| `xl` | 1280px | Desktops |
| `2xl` | 1536px | Large screens |

### Mobile Considerations

- Sidebar collapses to bottom nav on mobile
- Kanban columns stack vertically
- Drawers become full-screen modals
- Touch targets minimum 44x44px

---

## Accessibility

### WCAG 2.1 AA Compliance

- **Contrast:** All text meets 4.5:1 ratio (7:1 for AAA)
- **Focus:** Visible focus rings on all interactive elements
- **Keyboard:** Full keyboard navigation support
- **Screen readers:** Proper ARIA labels and roles

### Focus States

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

---

## Implementation with shadcn/ui

### Installation

```bash
npx shadcn@latest init
npx shadcn@latest add button card badge input select
```

### Theme Configuration

```ts
// tailwind.config.ts
const config = {
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // ... rest of tokens
      },
    },
  },
}
```

---

## Login & Authentication Screens (Verified from Mobbin)

### Login Page Layout

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                    ┌─────────┐                         │
│                    │  Logo   │                         │
│                    └─────────┘                         │
│                                                        │
│              Log in to AudienceOS                      │
│           (text-2xl, 600 weight, centered)             │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │ Continue with Google          │               │
│         └──────────────────────────────┘               │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │ Continue with SAML SSO        │               │
│         └──────────────────────────────┘               │
│                                                        │
│                    ───── or ─────                      │
│                                                        │
│         Email address                                  │
│         ┌──────────────────────────────┐               │
│         │                              │               │
│         └──────────────────────────────┘               │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │     Continue with email       │               │
│         └──────────────────────────────┘               │
│                                                        │
│         Don't have an account? Sign up                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Login Specifications

| Element | Specs |
|---------|-------|
| Container | Max-width 400px, centered, 24px padding |
| Logo | 48px height, centered |
| Heading | 24px, 600 weight, centered, 16px margin-bottom |
| OAuth Buttons | Full width, 40px height, 8px border-radius |
| Divider | `──── or ────` with muted text |
| Input | Full width, 40px height, 8px border-radius |
| Submit Button | Full width, 40px height, primary color |
| Links | text-sm, muted color, hover: primary |

### Email Verification Screen

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│                    ┌─────────┐                         │
│                    │  ✉️ Icon │                         │
│                    └─────────┘                         │
│                                                        │
│              Check your email                          │
│                                                        │
│     We sent a login link to user@example.com           │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │     Open email app            │               │
│         └──────────────────────────────┘               │
│                                                        │
│         Didn't receive it? Resend email                │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Toast Notifications (Verified from Mobbin)

### Toast Types

| Type | Icon | Background | Border |
|------|------|------------|--------|
| Success | ✓ CheckCircle | `bg-green-500/10` | `border-green-500/20` |
| Error | ✕ XCircle | `bg-red-500/10` | `border-red-500/20` |
| Warning | ⚠ AlertTriangle | `bg-yellow-500/10` | `border-yellow-500/20` |
| Info | ℹ Info | `bg-blue-500/10` | `border-blue-500/20` |

### Toast Layout

```
┌─────────────────────────────────────────────────┐
│  ✓  Issue ENG-135 assigned to you               │
│     Refactor sonic crawler                  ✕   │
└─────────────────────────────────────────────────┘
```

### Toast Specifications

| Property | Value |
|----------|-------|
| Position | Bottom-right, 16px from edges |
| Width | Min 300px, max 420px |
| Padding | 12px 16px |
| Border Radius | 8px |
| Shadow | `shadow-lg` |
| Icon Size | 16px |
| Title | 14px, 500 weight |
| Description | 13px, 400 weight, muted color |
| Duration | 5000ms default, infinite for errors |
| Animation | Slide in from right, 200ms |
| Stack | Max 3 visible, older toasts fade |

### Toast Actions

```tsx
<Toast>
  <ToastTitle>Issue assigned</ToastTitle>
  <ToastDescription>ENG-135: Refactor sonic crawler</ToastDescription>
  <ToastAction altText="View">View</ToastAction>
  <ToastClose />
</Toast>
```

---

## Modals & Dialogs (Verified from Mobbin)

### Modal Types

| Type | Max Width | Use Case |
|------|-----------|----------|
| Alert | 400px | Confirmations, warnings |
| Form | 500px | Create/edit forms |
| Detail | 640px | View details, previews |
| Full | 90vw | Complex workflows |

### Quick Add Modal (Linear's Signature)

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Issue title...                                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Add description...                              │   │
│  │                                                  │   │
│  │                                                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐       │
│  │ Status │ │ Priority │ │ Assign │ │ Project │       │
│  └────────┘ └──────────┘ └────────┘ └─────────┘       │
│                                                         │
│                              Cancel    Create Issue     │
└─────────────────────────────────────────────────────────┘
```

### Modal Specifications

| Property | Value |
|----------|-------|
| Overlay | `bg-black/50`, backdrop-blur: none |
| Background | `bg-card` / `bg-zinc-900` (dark) |
| Border | `border-border` / `border-zinc-800` (dark) |
| Border Radius | 12px |
| Padding | 24px |
| Shadow | `shadow-xl` |
| Animation | Fade in + scale from 95% to 100%, 150ms |
| Close | X button top-right, ESC key, click outside |

### Confirmation Dialog

```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete client?</AlertDialogTitle>
      <AlertDialogDescription>
        This action cannot be undone. This will permanently delete
        the client and all associated data.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

---

## Popovers & Dropdowns (Verified from Mobbin)

### Popover Specifications

| Property | Value |
|----------|-------|
| Background | `bg-popover` / `bg-zinc-900` (dark) |
| Border | `border-border` |
| Border Radius | 8px |
| Shadow | `shadow-md` |
| Padding | 4px (menu) / 12px (content) |
| Animation | Fade in + slight translateY, 100ms |

### Dropdown Menu Item

| Property | Value |
|----------|-------|
| Height | 32px |
| Padding | 8px 12px |
| Font Size | 13px |
| Font Weight | 400 |
| Line Height | 16px (13 × 1.25) |
| Icon Size | 16px, 8px gap from text |
| Hover | `bg-accent` / `bg-zinc-800` |
| Active | `bg-accent` with checkmark |

### Command Palette (⌘K)

```
┌─────────────────────────────────────────────────────────┐
│  🔍 Search or type a command...                         │
├─────────────────────────────────────────────────────────┤
│  Recent                                                 │
│  ─────────────────────────────────────────────────────  │
│  ▸ Open client: Acme Corp                              │
│  ▸ View pipeline                                        │
│  ▸ Create new ticket                                    │
├─────────────────────────────────────────────────────────┤
│  Actions                                                │
│  ─────────────────────────────────────────────────────  │
│  ▸ Create client                              ⌘N       │
│  ▸ Create ticket                              ⌘T       │
│  ▸ Search everything                          ⌘K       │
└─────────────────────────────────────────────────────────┘
```

---

## Inbox & Notifications Panel (Verified from Mobbin)

### Inbox Layout

```
┌────────────────────────────────────────┐
│  Inbox                            ✓ ⋮  │
├────────────────────────────────────────┤
│  ┌──────────────────────────────────┐  │
│  │ 🟣 ENG-135 Refactor sonic...  2h │  │
│  │    nan assigned you              │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 🤖 LLM Chatbot                8h │  │
│  │    New project update by raisa  │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 🔴 ENG-159 Error uploading   1d │  │
│  │    SLA breached                 │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Notification Item Specifications

| Property | Value |
|----------|-------|
| Padding | 12px 16px |
| Background (unread) | `bg-primary/5` |
| Background (read) | `bg-transparent` |
| Title | 14px, 500 weight, truncate |
| Subtitle | 13px, 400 weight, muted color |
| Timestamp | 12px, muted color, right-aligned |
| Status Dot | 8px, positioned left |
| Hover | `bg-muted` |

---

## Onboarding Flow (Verified from Mobbin)

### Welcome Screen

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              Welcome to AudienceOS                     │
│                                                        │
│        The command center for your agency              │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │       Get started             │               │
│         └──────────────────────────────┘               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Workspace Setup

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│              Create your workspace                     │
│                                                        │
│        Company or team name                            │
│        ┌──────────────────────────────┐               │
│        │ Acme Agency                   │               │
│        └──────────────────────────────┘               │
│                                                        │
│        Workspace URL                                   │
│        ┌──────────────────────────────┐               │
│        │ acme-agency                   │               │
│        └──────────────────────────────┘               │
│        .audienceos.app                                 │
│                                                        │
│         ┌──────────────────────────────┐               │
│         │       Create workspace        │               │
│         └──────────────────────────────┘               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-01 | Verified with Mobbin + CSS extraction: typography, buttons, modals, notifications, login |
| 2026-01-01 | Added 125% line-height rule (font size + 25%) |
| 2026-01-01 | Added Inter Variable font, 510 weight for buttons |
| 2026-01-01 | Added Login, Toast, Modal, Popover, Inbox, Onboarding specs |
| 2025-12-31 | Created design system based on Linear philosophy |

---

*Living Document - Located at docs/03-design/DESIGN-SYSTEM.md*
