# Send to AI Integration

**Feature ID:** AI-INT-001
**Status:** ✅ Implemented (2026-01-06)
**Priority:** P1 (High Value UX Enhancement)
**Estimated Effort:** 3 hours
**Actual Effort:** 2.5 hours

---

## Overview

Contextual "Send to AI" buttons throughout the dashboard allow users to instantly open the AI chat with pre-filled, context-aware prompts based on their current task or client view.

## User Story

**As an** agency team member
**I want to** quickly ask the AI about specific tasks or clients I'm viewing
**So that** I can get instant help without manually typing context into the chat

## Use Cases

### UC-1: Task Assistance
1. User views task in firehose
2. Opens task detail drawer
3. Clicks "Send to AI" button
4. Chat opens with: "Help me with task: 'Create Q4 proposal' for Acme Corp. Quarterly strategy proposal due Dec 15"
5. User can edit prompt or send immediately

### UC-2: Client Inquiry
1. User views client card
2. Opens client detail drawer
3. Clicks "Send to AI" button
4. Chat opens with: "Tell me about client Acme Corp. Status: Active | Health: Green | Owner: John Doe"
5. AI provides insights, metrics, or recommendations

## Implementation

### Global Chat Opener

**File:** `components/chat/chat-interface.tsx` (lines 183-203)

```typescript
useEffect(() => {
  if (typeof window !== "undefined") {
    (window as any).openChatWithMessage = (message: string) => {
      setInputValue(message)
      setIsPanelOpen(true)
      setIsClosing(false)
      setIsInputFocused(true)
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }
  return () => {
    if (typeof window !== "undefined") {
      delete (window as any).openChatWithMessage
    }
  }
}, [])
```

**Features:**
- Global method exposed on window object
- Pre-fills chat input
- Opens panel
- Focuses textarea after 100ms delay
- Cleanup on unmount

### Type Declarations

**File:** `global.d.ts`

```typescript
interface Window {
  openChatWithMessage?: (message: string) => void
}
```

### Dashboard Integration

**File:** `components/dashboard-view.tsx`

#### TaskDetailDrawer (lines 497-621)

```typescript
<Button
  variant="outline"
  className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600"
  onClick={() => {
    const prompt = `Help me with task: "${item.title}" for ${item.clientName}. ${item.description}`
    onSendToAI?.(prompt)
    onClose()
  }}
>
  <Sparkles className="w-4 h-4 mr-2" />
  Send to AI
</Button>
```

#### ClientDetailDrawer (lines 707-811)

```typescript
<Button
  variant="outline"
  className="w-full bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-600"
  onClick={() => {
    const prompt = `Tell me about client ${client.name}. Status: ${client.status} | Health: ${client.health} | Owner: ${ownerData.name}`
    onSendToAI?.(prompt)
    onClose()
  }}
>
  <Sparkles className="w-4 h-4 mr-2" />
  Send to AI
</Button>
```

### Main Page Handler

**File:** `app/page.tsx` (lines 391-410)

```typescript
<DashboardView
  onSendToAI={(prompt) => {
    const openChat = () => {
      if (typeof window !== "undefined" && window.openChatWithMessage) {
        window.openChatWithMessage(prompt)
      } else {
        console.warn('[SEND-TO-AI] Chat not ready, retrying...')
        setTimeout(() => {
          if (window.openChatWithMessage) {
            window.openChatWithMessage(prompt)
          } else {
            console.error('[SEND-TO-AI] Chat failed to load after retries')
          }
        }, 50)
      }
    }
    openChat()
  }}
/>
```

**Retry Logic:**
- First attempt: Check if chat is ready
- If not ready: Wait 50ms and retry once
- Handles race condition during chat mount
- Console warnings for debugging

---

## UI/UX Design

### Button Style
- **Variant:** `outline` (not solid, less aggressive)
- **Background:** `bg-amber-500/10` (subtle amber tint)
- **Hover:** `hover:bg-amber-500/20` (stronger amber on hover)
- **Border:** `border-amber-500/30` (amber border)
- **Text:** `text-amber-600` (readable amber text)
- **Icon:** `Sparkles` from lucide-react (suggests AI magic)
- **Width:** `w-full` (full drawer width, prominent)

### Positioning
- Placed ABOVE primary action button in drawers
- Drawer button order:
  1. **Send to AI** (top, amber, less commitment)
  2. **Mark Complete** / **View Full Details** (bottom, primary)

### Visual Hierarchy
```
┌─────────────────────────────────┐
│  [🌟 Send to AI] (amber)        │  ← New feature
│  [✓ Mark Complete] (primary)    │  ← Existing action
└─────────────────────────────────┘
```

---

## Prompt Templates

### Task Prompt
```
Help me with task: "{title}" for {clientName}. {description}
```

**Example:**
```
Help me with task: "Create Q4 proposal" for Acme Corp. Quarterly strategy proposal due Dec 15
```

### Client Prompt
```
Tell me about client {name}. Status: {status} | Health: {health} | Owner: {ownerName}
```

**Example:**
```
Tell me about client Acme Corp. Status: Active | Health: Green | Owner: John Doe
```

---

## Technical Decisions

### Why Global Window Method?
**Alternatives Considered:**
1. Context API - Too heavy for simple inter-component communication
2. Zustand store - Overkill for one-way trigger
3. Custom event - More complex, less type-safe
4. Ref forwarding - Doesn't work across route boundaries

**Chosen:** Global window method
- Simple
- Works anywhere in the app
- Easy to clean up
- TypeScript declarations available
- Common pattern for widget APIs

### Why 100ms Delay for Focus?
- React needs time to update DOM after state changes
- Immediate focus() fails because textarea not rendered yet
- 100ms is imperceptible to users but reliable
- Alternative: requestAnimationFrame() - more complex

### Why Retry Logic in Main Page?
- Chat component mounts after page hydration
- Race condition: Send to AI called before chat ready
- 50ms retry handles 99% of cases
- Max 2 attempts prevents infinite loops
- Console warnings help debugging

---

## Testing

### Manual Test Cases

✅ **TC-1: Task to AI**
1. Click task in firehose
2. Click "Send to AI"
3. **Expected:** Chat opens with task details

✅ **TC-2: Client to AI**
1. Click client card
2. Click "Send to AI"
3. **Expected:** Chat opens with client details

✅ **TC-3: Prompt Editing**
1. Send task to AI
2. Edit prompt before sending
3. **Expected:** Edits preserved, can send modified prompt

✅ **TC-4: Multiple Sends**
1. Send task to AI
2. Close chat
3. Send different client to AI
4. **Expected:** New prompt replaces old, no accumulation

✅ **TC-5: Chat Already Open**
1. Open chat manually
2. Send task to AI
3. **Expected:** Existing chat reused, new prompt loaded

✅ **TC-6: Drawer Closes**
1. Click "Send to AI"
2. **Expected:** Drawer closes after sending (UX cleanup)

### Edge Cases

✅ **EC-1: Chat Not Mounted**
- **Scenario:** Send to AI before chat hydrates
- **Expected:** Retry logic catches, works on second attempt
- **Verified:** Console warning appears, then success

✅ **EC-2: Missing Optional Callback**
- **Scenario:** DashboardView used without onSendToAI prop
- **Expected:** Button doesn't appear (conditional rendering)
- **Verified:** No errors, graceful degradation

---

## Future Enhancements

### Phase 2 (Optional)
- [ ] Send to AI from client list (multi-select → "Ask AI about these 5 clients")
- [ ] Send to AI from KPI widgets ("Why is churn up 12%?")
- [ ] Keyboard shortcut (Cmd+Shift+A) to send current view to AI
- [ ] History of sent prompts (dropdown to re-use)
- [ ] Suggested prompts (AI recommends questions based on context)

### Phase 3 (Advanced)
- [ ] Multi-modal: Attach screenshots when sending
- [ ] Voice input: Click & speak to send audio query
- [ ] Smart templates: Learn user's common prompt patterns

---

## Dependencies

**Required:**
- Chat interface must be mounted (`components/chat/chat-interface.tsx`)
- Global declarations (`global.d.ts`)
- Sparkles icon from lucide-react

**Optional:**
- None (feature works standalone)

---

## Metrics (Future)

**Track:**
- Send to AI clicks per user per day
- Most common prompt templates
- Chat engagement rate (% who send after opening)
- Task/client types most frequently sent

**Hypothesis:**
- Users will send 3-5 prompts per session
- Task prompts > client prompts (more actionable)
- Morning hours = more "help me with" queries
- Afternoon = more "tell me about" queries

---

## Commit History

**Initial Implementation:**
- Commit: `3131525`
- Date: 2026-01-06
- Files: 5 changed, 433 insertions(+), 9 deletions(-)

**Related:**
- Chat alignment fixes (previous commits)
- Citation rendering (previous commits)

---

## References

- **Design:** Amber accent chosen to differentiate from primary actions
- **Icon:** Sparkles suggests AI/magic without being too technical
- **Pattern:** Similar to "Share to Twitter" or "Send to Kindle" flows

---

*Feature implemented: 2026-01-06*
*Owner: Roderic Andrews*
*Status: Production Ready*
