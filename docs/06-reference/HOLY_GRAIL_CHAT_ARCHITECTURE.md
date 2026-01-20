# Holy Grail Chat - Proposed Architecture Improvements

**Purpose:** Technical reference for Phase 1 & 2 implementation
**Status:** Design document (ready for implementation)
**Last Updated:** 2026-01-16

---

## Current Architecture (Limited)

```
┌─────────────┐
│ User Input  │
└──────┬──────┘
       │
       ▼
┌────────────────────┐
│  Smart Router      │
│ (5-way classify)   │
└────────┬───────────┘
         │
    ┌────┼────┬────┬──────┐
    ▼    ▼    ▼    ▼      ▼
   Dash  RAG  Mem  Web  Casual
    │    │    │    │     │
    └────┴────┴────┴─────┘
         │
         ▼
    ┌─────────────┐
    │  Gemini 3   │  ← NO CONTEXT INJECTED
    │  (no tools) │
    └─────────────┘
         │
         ▼
    ┌─────────────┐
    │  Response   │  ← NO MEMORY STORED
    └─────────────┘
```

**Problems:**
- Context never flows in
- Memory never flows out
- Only 6 functions available

---

## Proposed Architecture (Holy Grail)

```
┌──────────────────────┐
│ SessionContext       │
│ (page, client, etc)  │
└──────────┬───────────┘
           │
┌──────────▼──────────┐
│  User Input +       │
│  SessionContext     │
└──────────┬──────────┘
           │
           ▼
┌────────────────────────┐
│  Smart Router          │
│ (5-way classify)       │
│ + Context Aware        │
└────────┬───────────────┘
         │
    ┌────┼────┬────┬──────┐
    ▼    ▼    ▼    ▼      ▼
   Dash  RAG  Mem  Web  Casual
   (12   (CS)  (R)  (CG)
   funcs)
    │    │    │    │     │
    └────┴────┴────┴─────┘
         │
         ▼
    ┌──────────────────────┐
    │  Context Block       │
    │  (current page, etc) │
    └──────────┬───────────┘
               │
               ▼
    ┌─────────────────────┐
    │  Gemini 3           │
    │ (with context +     │
    │  12 functions)      │
    └────────┬────────────┘
             │
             ▼
    ┌──────────────────────┐
    │  Response            │
    └────────┬─────────────┘
             │
             ▼
    ┌──────────────────────┐
    │  Memory Persistence  │
    │  (store to Mem0)     │
    └──────────────────────┘
```

**Improvements:**
- SessionContext flows through entire chain
- Context injected into Gemini system prompt
- 12 functions instead of 6
- Memory actually stored after each turn
- Client-scoped RAG search

---

## Phase 1: Context Injection & Memory Persistence

### 1.1 Add SessionContext Flow

**File:** `app/api/v1/chat/route.ts`

**Current (Line 1-70):**
```typescript
export async function POST(request: NextRequest) {
  const { message, sessionId, stream } = await request.json()
  const { agencyId, userId } = request.user  // ← comes from JWT
  // No SessionContext passed anywhere
}
```

**Proposed:**
```typescript
export async function POST(request: NextRequest) {
  const { message, sessionId, stream, context } = await request.json()
  const { agencyId, userId } = request.user

  // NEW: Type-safe context object
  const sessionContext: SessionContext = {
    clientId: context?.clientId,
    clientName: context?.clientName,
    currentPage: context?.currentPage,  // e.g., '/clients/123'
    recentAlerts: context?.recentAlerts,
    // ... other context fields
  }

  // NEW: Pass context through router
  return handleChatMessage(message, sessionContext, agencyId, userId, stream)
}
```

**Components that need updating to SET context:**
1. `app/clients/[id]/page.tsx` - Pass `{ clientId, clientName }` to chat
2. `app/dashboard/page.tsx` - Pass `{ currentPage: '/dashboard' }` to chat
3. `app/support/page.tsx` - Pass `{ currentPage: '/support' }` to chat
4. Any page that filters data - Pass active filters to chat

---

### 1.2 Inject Context into Gemini Prompt

**File:** `app/api/v1/chat/route.ts` (Line 200-220)

**Current:**
```typescript
const response = await genai.models.generateContent({
  model: GEMINI_MODEL,
  contents: message,  // ← ONLY message
  config: { temperature: 0, tools: hgcFunctions },
})
```

**Proposed:**
```typescript
// NEW: Create context block
const contextBlock = assembleContextBlock(sessionContext)
// Example output:
// "User Context:
//  - Current Page: Client Dashboard (Acme Corp - ID: acme-123)
//  - Current Client: Acme Corp
//  - User Role: Account Manager
//  - Active Filters: Health=good, Stage=negotiation"

const enhancedMessage = contextBlock ? `${contextBlock}\n\nUser Question: ${message}` : message

const response = await genai.models.generateContent({
  model: GEMINI_MODEL,
  contents: enhancedMessage,  // ← Message WITH context
  config: { temperature: 0, tools: hgcFunctions },
})
```

**New Function:**
```typescript
function assembleContextBlock(context: SessionContext): string {
  if (!context || !Object.keys(context).length) return ''

  const parts = []

  if (context.currentPage) {
    parts.push(`User is currently viewing: ${context.currentPage}`)
  }

  if (context.clientId && context.clientName) {
    parts.push(`Current Client: ${context.clientName} (ID: ${context.clientId})`)
  }

  if (context.recentAlerts?.length) {
    parts.push(`Recent Alerts: ${context.recentAlerts.join(', ')}`)
  }

  return `User Context:\n${parts.map(p => `- ${p}`).join('\n')}\n`
}
```

---

### 1.3 Persist Memories to Mem0

**File:** `app/api/v1/chat/route.ts` (after response is generated)

**Current (Line 280-350):**
```typescript
// Response sent to user
return new Response(...)
// Memory is NEVER stored
```

**Proposed:**
```typescript
// NEW: After response is generated, store memory
try {
  const memories = extractMemoriesFromInteraction(userMessage, assistantResponse)

  for (const memory of memories) {
    await mem0.storeMemory({
      content: memory.content,
      type: memory.type,  // 'decision' | 'preference' | 'task' | 'learning'
      agencyId,
      userId,
      importance: memory.importance,  // 'high' | 'medium' | 'low'
    })
  }
} catch (error) {
  console.error('Memory storage error:', error)
  // Don't block response on memory errors
}

return response
```

**New Function:**
```typescript
function extractMemoriesFromInteraction(
  userMessage: string,
  assistantResponse: string
): Memory[] {
  const memories: Memory[] = []

  // Pattern 1: User states preference
  if (userMessage.includes('prefer') || userMessage.includes('like to')) {
    memories.push({
      content: `User prefers: [extracted from context]`,
      type: 'preference',
      importance: 'high',
    })
  }

  // Pattern 2: User makes decision
  if (userMessage.includes('decide') || userMessage.includes('will')) {
    memories.push({
      content: `User decided: [extracted from context]`,
      type: 'decision',
      importance: 'high',
    })
  }

  // Pattern 3: Complex exchange (learning opportunity)
  if (userMessage.length > 100 && assistantResponse.length > 200) {
    memories.push({
      content: `Learning: [summarized exchange]`,
      type: 'learning',
      importance: 'medium',
    })
  }

  return memories
}
```

---

## Phase 2: Function Expansion

### 2.1 Add Missing Functions

**Current Registry:** 6 functions (clients, alerts, communications, stats, navigate)

**New Functions to Add:**

#### Function #7: `search_support_tickets`
```typescript
{
  name: 'search_support_tickets',
  description: 'Search and retrieve support tickets for a client',
  parameters: {
    type: 'object',
    properties: {
      client_id: {
        type: 'string',
        description: 'Client ID to filter tickets for',
      },
      status: {
        type: 'string',
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        description: 'Filter by status',
      },
      priority: {
        type: 'string',
        enum: ['low', 'medium', 'high', 'critical'],
        description: 'Filter by priority',
      },
      limit: {
        type: 'number',
        description: 'Max results to return',
        default: 10,
      },
    },
    required: ['client_id'],
  },
}
```

**Executor Implementation:**
```typescript
// lib/chat/functions/search-support-tickets.ts
export async function searchSupportTickets(
  { agencyId, userId, supabase }: ExecutionContext,
  { client_id, status, priority, limit = 10 }
): Promise<SupportTicket[]> {
  let query = supabase
    .from('support_tickets')
    .select('id, title, description, status, priority, created_at, assignee_name')
    .eq('agency_id', agencyId)
    .eq('client_id', client_id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query

  if (error) throw new Error(`Failed to fetch tickets: ${error.message}`)

  return data || []
}
```

#### Function #8: `get_automations_status`
```typescript
{
  name: 'get_automations_status',
  description: 'Get status of automations and workflow runs',
  parameters: {
    type: 'object',
    properties: {
      automation_id: {
        type: 'string',
        description: 'Filter by automation ID (optional)',
      },
      status: {
        type: 'string',
        enum: ['active', 'paused', 'error', 'idle'],
        description: 'Filter by status',
      },
      limit: {
        type: 'number',
        description: 'Max automations to return',
        default: 10,
      },
    },
  },
}
```

#### Function #9: `search_client_documents`
```typescript
{
  name: 'search_client_documents',
  description: 'Search documents/files attached to a specific client',
  parameters: {
    type: 'object',
    properties: {
      client_id: {
        type: 'string',
        description: 'Client ID to search documents for',
      },
      query: {
        type: 'string',
        description: 'Search query (optional - returns all if not provided)',
      },
      max_documents: {
        type: 'number',
        description: 'Max documents to return',
        default: 10,
      },
    },
    required: ['client_id'],
  },
}
```

#### Function #10: `get_client_timeline`
```typescript
{
  name: 'get_client_timeline',
  description: 'Get unified timeline of all activity for a client (emails, calls, notes, updates)',
  parameters: {
    type: 'object',
    properties: {
      client_id: {
        type: 'string',
        description: 'Client ID',
      },
      days_back: {
        type: 'number',
        description: 'How many days to look back',
        default: 30,
      },
      limit: {
        type: 'number',
        description: 'Max items to return',
        default: 20,
      },
    },
    required: ['client_id'],
  },
}
```

#### Function #11: `search_kb_documents`
```typescript
{
  name: 'search_kb_documents',
  description: 'Search all knowledge base documents across the agency',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query',
      },
      category: {
        type: 'string',
        description: 'Filter by category',
      },
      limit: {
        type: 'number',
        description: 'Max documents to return',
        default: 10,
      },
    },
    required: ['query'],
  },
}
```

#### Function #12: `get_training_cartridges`
```typescript
{
  name: 'get_training_cartridges',
  description: 'Get training cartridges and materials',
  parameters: {
    type: 'object',
    properties: {
      client_id: {
        type: 'string',
        description: 'Filter by client (optional)',
      },
      category: {
        type: 'string',
        description: 'Filter by category (brand, voice, style, etc)',
      },
      limit: {
        type: 'number',
        description: 'Max cartridges to return',
        default: 10,
      },
    },
  },
}
```

---

### 2.2 Client-Scoped RAG Search

**File:** `lib/rag/gemini-rag.ts`

**Current (Line 580-620):**
```typescript
async search(
  query: string,
  agencyId: string
): Promise<RagResult> {
  // Searches all documents for agency
  // No client filtering
}
```

**Proposed:**
```typescript
async search(
  query: string,
  agencyId: string,
  clientId?: string  // ← NEW parameter
): Promise<RagResult> {
  // If clientId provided, only search that client's documents
  // Falls back to agency-wide if no client-specific docs found

  const relevantDocs = this.documents.values().filter(doc => {
    const matchesAgency = doc.agencyId === agencyId
    const matchesClientScope = !clientId || doc.clientId === clientId
    return matchesAgency && matchesClientScope
  })

  // Search only filtered docs...
}
```

**Update Router (line 75-85):**
```typescript
if (route === 'rag') {
  // NEW: Include clientId in RAG search
  const clientId = sessionContext?.clientId
  const ragResults = await ragService.search(message, agencyId, clientId)
  // ... rest of RAG handling
}
```

---

## Phase 3: Advanced Features (Optional)

### 3.1 Memory Consolidation

Prevent duplicate memories:

```typescript
async storeMemory(memory: Memory) {
  // Check if similar memory already exists
  const similar = await mem0.search(memory.content, {
    threshold: 0.85,  // 85% similarity = probable duplicate
  })

  if (similar.length > 0) {
    // Update existing instead of creating new
    await mem0.update(similar[0].id, {
      ...similar[0],
      updatedAt: new Date(),
      importance: Math.max(similar[0].importance, memory.importance),
    })
  } else {
    // New memory
    await mem0.add(memory)
  }
}
```

### 3.2 Adaptive Routing

Smart selection of strategy based on query complexity:

```typescript
async routeQuery(message: string): Promise<RoutingDecision> {
  const complexity = analyzeQueryComplexity(message)

  if (complexity === 'simple') {
    // Direct function calling
    return { strategy: 'direct', routes: ['dashboard'] }
  } else if (complexity === 'moderate') {
    // Try function calling, fallback to RAG
    return { strategy: 'hybrid', routes: ['dashboard', 'rag'] }
  } else {
    // Complex query - use RAG + memory + function calling
    return { strategy: 'comprehensive', routes: ['memory', 'rag', 'dashboard'] }
  }
}
```

---

## Data Models

### SessionContext
```typescript
interface SessionContext {
  clientId?: string          // Current client being viewed
  clientName?: string        // Client display name
  currentPage?: string       // App route (e.g., '/clients/123')
  activeFilters?: {
    [key: string]: string | string[]  // e.g., { status: 'open', priority: ['high', 'critical'] }
  }
  recentAlerts?: string[]    // Alert summaries user recently saw
  userRole?: string          // 'admin' | 'manager' | 'agent'
  timestamp?: number         // When context was set
}
```

### Memory
```typescript
interface Memory {
  id?: string
  content: string                           // What to remember
  type: 'decision' | 'preference' | 'task' | 'learning'
  agencyId: string
  userId: string
  importance: 'high' | 'medium' | 'low'
  createdAt?: Date
  updatedAt?: Date
  expiresAt?: Date                          // Optional: auto-delete old memories
}
```

---

## Performance Considerations

### Context Injection
- **Cost:** Minimal (adds ~100-200 chars to prompt)
- **Latency:** < 100ms to assemble context block
- **Benefit:** Dramatically better response relevance

### Memory Storage
- **Cost:** One Mem0 API call per chat turn
- **Latency:** ~200-300ms (async, non-blocking)
- **Benefit:** Persistent learning across sessions

### Function Expansion
- **Cost:** Each function = one more option for Gemini to consider
- **Latency:** Depends on function complexity (100-500ms)
- **Benefit:** 2x more app features accessible to chat

---

## Testing Strategy

### Unit Tests
- `assembleContextBlock()` - Verify context formatting
- `extractMemoriesFromInteraction()` - Verify memory extraction
- Each new function executor - Verify correct DB queries

### Integration Tests
- End-to-end chat flow with context
- Memory persistence across sessions
- Function calling with real data

### Browser Tests
- Chat responds with client-specific data when context set
- Memories appear in follow-up conversations
- Drag-drop upload still works

---

## Rollout Plan

### Day 1-2: Context Injection
- Add SessionContext type + flow
- Update components to pass context
- Inject into Gemini prompt
- Test with real app state

### Day 3: Memory Persistence
- Add memory storage calls
- Test memory recall
- Verify no duplicates

### Day 4-5: Functions #7-8 (Support + Automations)
- Implement functions
- Add to registry
- End-to-end test

### Day 6-7: Functions #9-12 (Documents + Timeline + Training + KB)
- Implement remaining functions
- Add to registry
- Integration testing

### Day 8: Polish + Testing
- Fix any UX issues discovered
- Performance tuning
- Browser testing

---

## Success Metrics

- [ ] SessionContext flows to Gemini (verify in logs)
- [ ] Memories stored on every turn (check Mem0 dashboard)
- [ ] 12 functions available in registry (count in code)
- [ ] Client-scoped RAG returns only that client's docs
- [ ] Response time < 2s (measure in browser)
- [ ] Zero context bleed between agencies (multi-tenant test)
- [ ] Drag-drop works in all scenarios
- [ ] User can ask about tickets/automations/training (functional test)

---

## Known Risks

| Risk | Mitigation |
|------|-----------|
| Context injection breaks existing queries | Test each route separately before deploying |
| Memory storage slows down response | Make async, add timeout |
| New functions cause latency spike | Profile function execution times |
| Drag-drop fix breaks Safari | Test on iOS + macOS |

---

**This architecture design is ready for implementation. All technical decisions are documented. Proceed to Phase 1 when approved.**
