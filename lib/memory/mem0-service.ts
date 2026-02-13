/**
 * Mem0 Service
 *
 * Integrates with Mem0 MCP for cross-session memory.
 * Provides tenant + user scoped memory operations.
 * Full CRUD: add, search, list, get, update, delete, history, entities.
 */

import type {
  Memory,
  MemoryMetadata,
  MemoryType,
  MemorySearchRequest,
  MemorySearchResult,
  MemoryAddRequest,
  MemoryStats,
  MemoryListResponse,
  MemoryHistoryEntry,
  MemoryEntity,
} from './types';

/**
 * Mem0 MCP interface (matches diiiploy-gateway's 9 MCP tools)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
interface Mem0MCPClient {
  addMemory: (params: { content: string; userId: string }) => Promise<{ id: string }>;
  searchMemories: (params: {
    query: string;
    userId: string;
    topK?: number;
  }) => Promise<Array<{ id: string; content: string; score?: number }>>;
  getMemory: (params: { memoryId: string }) => Promise<{
    id: string; memory: string; user_id?: string; created_at?: string; updated_at?: string;
  }>;
  listMemories: (params: {
    userId?: string; page?: number; pageSize?: number;
  }) => Promise<{ results: Array<{ id: string; memory: string; user_id?: string; created_at?: string; updated_at?: string }>; count?: number }>;
  updateMemory: (params: { memoryId: string; content: string }) => Promise<{
    id: string; memory: string;
  }>;
  deleteMemory: (params: { memoryId: string }) => Promise<{ success: boolean; deleted: string }>;
  deleteAllMemories: (params: { userId: string }) => Promise<{ success: boolean; userId: string }>;
  getMemoryHistory: (params: { memoryId: string }) => Promise<Array<{
    id: string; memory_id: string; old_memory?: string; new_memory?: string; event: string; created_at?: string;
  }>>;
  getEntities: () => Promise<Array<{ type: string; id: string; name?: string; count?: number }>>;
}

/**
 * Build scoped user ID for multi-tenant support
 *
 * 3-PART FORMAT: agencyId::clientId::userId
 *
 * Supports 3 scoping levels:
 *   1. Agency-wide:  agencyId::_::_
 *   2. Client-level: agencyId::clientId::_
 *   3. User-level:   agencyId::clientId::userId
 *
 * Using '::' as separator and '_' for wildcards ensures:
 *   - Clear visual separation
 *   - Safe for Mem0 userId field
 *   - Query patterns work (can search by prefix)
 */
function buildScopedUserId(
  agencyId: string,
  userId: string,
  clientId?: string | null
): string {
  const client = clientId || '_';
  const user = userId || '_';
  return `${agencyId}::${client}::${user}`;
}

/**
 * Build agency-level scope (for agency-wide memories)
 */
function buildAgencyScopedId(agencyId: string): string {
  return `${agencyId}::_::_`;
}

/**
 * Build client-level scope (for client-specific memories)
 */
function buildClientScopedId(agencyId: string, clientId: string): string {
  return `${agencyId}::${clientId}::_`;
}

/**
 * Parse memory content that includes metadata
 */
function parseMemoryContent(rawContent: string): { content: string; metadata: Partial<MemoryMetadata> } {
  try {
    // Check if content has embedded metadata (JSON prefix)
    if (rawContent.startsWith('{') && rawContent.includes('"content":')) {
      const parsed = JSON.parse(rawContent);
      return {
        content: parsed.content || rawContent,
        metadata: parsed.metadata || {},
      };
    }
  } catch {
    // Not JSON, use raw content
  }
  return { content: rawContent, metadata: {} };
}

/**
 * Encode content with metadata for storage
 */
function encodeMemoryContent(content: string, metadata: Partial<MemoryMetadata>): string {
  return JSON.stringify({ content, metadata });
}

/**
 * Mem0Service - Cross-session memory with tenant scoping
 */
export class Mem0Service {
  private mcpClient: Mem0MCPClient;
  private memoryCache: Map<string, Memory[]> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(mcpClient: Mem0MCPClient) {
    this.mcpClient = mcpClient;
  }

  /**
   * Add a memory
   *
   * 3-PART SCOPING:
   *   - User memories: agencyId::clientId::userId (most specific)
   *   - Client memories: agencyId::clientId::_ (client-wide)
   *   - Agency memories: agencyId::_::_ (agency-wide)
   */
  async addMemory(request: MemoryAddRequest): Promise<Memory> {
    const scopedUserId = buildScopedUserId(
      request.agencyId,
      request.userId,
      request.clientId
    );

    const metadata: MemoryMetadata = {
      agencyId: request.agencyId,
      clientId: request.clientId,
      userId: request.userId,
      sessionId: request.sessionId,
      type: request.type,
      topic: request.topic,
      entities: request.entities,
      importance: request.importance || 'medium',
    };

    const encodedContent = encodeMemoryContent(request.content, metadata);

    const result = await this.mcpClient.addMemory({
      content: encodedContent,
      userId: scopedUserId,
    });

    const memory: Memory = {
      id: result.id,
      content: request.content,
      metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Invalidate cache
    this.invalidateCache(scopedUserId);

    return memory;
  }

  /**
   * Search memories
   *
   * 3-PART SCOPING: Searches at the most specific level provided:
   *   - With clientId: searches agencyId::clientId::userId
   *   - Without clientId: searches agencyId::_::userId
   */
  async searchMemories(request: MemorySearchRequest): Promise<MemorySearchResult> {
    const startTime = Date.now();
    const scopedUserId = buildScopedUserId(
      request.agencyId,
      request.userId,
      request.clientId
    );

    const results = await this.mcpClient.searchMemories({
      query: request.query,
      userId: scopedUserId,
    });

    // Parse and filter results
    let memories: Memory[] = results.map((result) => {
      const { content, metadata } = parseMemoryContent(result.content);
      return {
        id: result.id,
        content,
        metadata: {
          agencyId: request.agencyId,
          clientId: request.clientId || metadata.clientId,
          userId: request.userId,
          type: (metadata.type as MemoryType) || 'conversation',
          ...metadata,
        },
        score: result.score,
        createdAt: new Date(), // Mem0 doesn't return dates
        updatedAt: new Date(),
      };
    });

    // Apply filters
    if (request.minScore !== undefined) {
      memories = memories.filter((m) => (m.score ?? 0) >= request.minScore!);
    }

    if (request.types && request.types.length > 0) {
      memories = memories.filter((m) => request.types!.includes(m.metadata.type));
    }

    // Limit results
    const limit = request.limit || 5;
    memories = memories.slice(0, limit);

    return {
      memories,
      totalFound: results.length,
      searchTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Get a single memory by ID
   */
  async getMemory(memoryId: string): Promise<Memory | null> {
    try {
      const result = await this.mcpClient.getMemory({ memoryId });
      const { content, metadata } = parseMemoryContent(result.memory);
      return {
        id: result.id,
        content,
        metadata: {
          agencyId: metadata.agencyId || '',
          userId: metadata.userId || result.user_id || '',
          type: (metadata.type as MemoryType) || 'conversation',
          ...metadata,
        },
        createdAt: result.created_at ? new Date(result.created_at) : new Date(),
        updatedAt: result.updated_at ? new Date(result.updated_at) : new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * List all memories for a user (paginated)
   */
  async listMemories(
    agencyId: string,
    userId: string,
    page: number = 1,
    pageSize: number = 50,
    clientId?: string
  ): Promise<MemoryListResponse> {
    const scopedUserId = buildScopedUserId(agencyId, userId, clientId);

    const result = await this.mcpClient.listMemories({
      userId: scopedUserId,
      page,
      pageSize,
    });

    const results = result.results || [];
    const memories: Memory[] = results.map((r) => {
      const { content, metadata } = parseMemoryContent(r.memory);
      return {
        id: r.id,
        content,
        metadata: {
          agencyId: metadata.agencyId || agencyId,
          clientId: metadata.clientId || clientId,
          userId: metadata.userId || userId,
          type: (metadata.type as MemoryType) || 'conversation',
          ...metadata,
        },
        createdAt: r.created_at ? new Date(r.created_at) : new Date(),
        updatedAt: r.updated_at ? new Date(r.updated_at) : new Date(),
      };
    });

    return {
      memories,
      page,
      pageSize,
      total: result.count || memories.length,
    };
  }

  /**
   * Update a memory's content
   */
  async updateMemory(memoryId: string, content: string, metadata?: Partial<MemoryMetadata>): Promise<Memory | null> {
    try {
      const encodedContent = metadata
        ? encodeMemoryContent(content, metadata)
        : content;

      const result = await this.mcpClient.updateMemory({
        memoryId,
        content: encodedContent,
      });

      const parsed = parseMemoryContent(result.memory);
      return {
        id: result.id,
        content: parsed.content,
        metadata: {
          agencyId: parsed.metadata.agencyId || '',
          userId: parsed.metadata.userId || '',
          type: (parsed.metadata.type as MemoryType) || 'conversation',
          ...parsed.metadata,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Delete a single memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      const result = await this.mcpClient.deleteMemory({ memoryId });
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Delete all memories for a scope (user/agency/client)
   */
  async clearMemories(agencyId: string, userId: string, clientId?: string): Promise<boolean> {
    const scopedUserId = buildScopedUserId(agencyId, userId, clientId);
    try {
      const result = await this.mcpClient.deleteAllMemories({ userId: scopedUserId });
      this.invalidateCache(scopedUserId);
      return result.success;
    } catch {
      return false;
    }
  }

  /**
   * Get memory change history
   */
  async getMemoryHistory(memoryId: string): Promise<MemoryHistoryEntry[]> {
    try {
      const results = await this.mcpClient.getMemoryHistory({ memoryId });
      return results.map((r) => ({
        id: r.id,
        memoryId: r.memory_id,
        oldContent: r.old_memory || '',
        newContent: r.new_memory || '',
        event: r.event as 'created' | 'updated' | 'deleted',
        timestamp: r.created_at ? new Date(r.created_at) : new Date(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * List Mem0 entities
   */
  async getEntities(): Promise<MemoryEntity[]> {
    try {
      const results = await this.mcpClient.getEntities();
      return results.map((r) => ({
        type: r.type as 'user' | 'agent' | 'app',
        id: r.id,
        name: r.name,
        memoryCount: r.count,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get recent memories for a user
   */
  async getRecentMemories(
    agencyId: string,
    userId: string,
    limit: number = 10,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'recent conversations and decisions',
      agencyId,
      clientId,
      userId,
      limit,
    });
    return result.memories;
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(
    agencyId: string,
    userId: string,
    type: MemoryType,
    limit: number = 10,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: `${type} memory`,
      agencyId,
      clientId,
      userId,
      limit,
      types: [type],
    });
    return result.memories;
  }

  /**
   * Get high importance memories
   */
  async getImportantMemories(
    agencyId: string,
    userId: string,
    limit: number = 5,
    clientId?: string
  ): Promise<Memory[]> {
    const result = await this.searchMemories({
      query: 'important decisions and preferences',
      agencyId,
      clientId,
      userId,
      limit,
    });

    // Filter to high importance
    return result.memories.filter(
      (m) => m.metadata.importance === 'high'
    );
  }

  /**
   * Store a conversation summary
   */
  async storeConversationSummary(
    agencyId: string,
    userId: string,
    sessionId: string,
    summary: string,
    topics: string[],
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: summary,
      agencyId,
      clientId,
      userId,
      sessionId,
      type: 'conversation',
      topic: topics.join(', '),
      entities: topics,
      importance: 'medium',
    });
  }

  /**
   * Store a decision
   */
  async storeDecision(
    agencyId: string,
    userId: string,
    decision: string,
    context: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Decision: ${decision}. Context: ${context}`,
      agencyId,
      clientId,
      userId,
      type: 'decision',
      importance: 'high',
    });
  }

  /**
   * Store a user preference
   */
  async storePreference(
    agencyId: string,
    userId: string,
    preference: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Preference: ${preference}`,
      agencyId,
      clientId,
      userId,
      type: 'preference',
      importance: 'high',
    });
  }

  /**
   * Store a task/action item
   */
  async storeTask(
    agencyId: string,
    userId: string,
    task: string,
    dueContext?: string,
    clientId?: string
  ): Promise<Memory> {
    return this.addMemory({
      content: `Task: ${task}${dueContext ? `. Due: ${dueContext}` : ''}`,
      agencyId,
      clientId,
      userId,
      type: 'task',
      importance: 'medium',
    });
  }

  /**
   * Get memory statistics (estimate)
   */
  async getStats(agencyId: string, userId: string, clientId?: string): Promise<MemoryStats> {
    // Search for all types to estimate counts
    const types: MemoryType[] = [
      'conversation',
      'decision',
      'preference',
      'project',
      'insight',
      'task',
    ];

    const byType: Record<MemoryType, number> = {
      conversation: 0,
      decision: 0,
      preference: 0,
      project: 0,
      insight: 0,
      task: 0,
    };

    let totalMemories = 0;

    for (const type of types) {
      const result = await this.searchMemories({
        query: type,
        agencyId,
        clientId,
        userId,
        limit: 100,
        types: [type],
      });
      byType[type] = result.memories.length;
      totalMemories += result.memories.length;
    }

    return {
      totalMemories,
      byType,
      byImportance: { low: 0, medium: 0, high: 0 }, // Would need full scan
    };
  }

  /**
   * Invalidate cache for a user
   */
  private invalidateCache(scopedUserId: string): void {
    this.memoryCache.delete(scopedUserId);
  }
}

// Factory for creating Mem0Service
let mem0ServiceInstance: Mem0Service | null = null;

/**
 * Create Mem0Service with MCP client
 */
export function createMem0Service(mcpClient: Mem0MCPClient): Mem0Service {
  mem0ServiceInstance = new Mem0Service(mcpClient);
  return mem0ServiceInstance;
}

/**
 * Get existing Mem0Service instance
 */
export function getMem0Service(): Mem0Service | null {
  return mem0ServiceInstance;
}

/**
 * Reset the service (for testing)
 */
export function resetMem0Service(): void {
  mem0ServiceInstance = null;
}

/**
 * Diiiploy-gateway HTTP client for Mem0
 * Calls diiiploy-gateway's 9 mem0_* MCP tools via JSON-RPC
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
function createDiiiplopyGatewayMem0Client(): Mem0MCPClient {
  const gatewayUrl = process.env.DIIIPLOY_GATEWAY_URL || 'https://diiiploy-gateway.diiiploy.workers.dev';
  const apiKey = process.env.DIIIPLOY_GATEWAY_API_KEY || '';

  async function callTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    // MCP handler lives at /mcp on the gateway
    const mcpUrl = gatewayUrl.replace(/\/$/, '') + '/mcp';
    const response = await fetch(mcpUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: { name: toolName, arguments: args },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Diiiploy-gateway error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.result?.content?.[0]?.text;
    if (text) {
      return JSON.parse(text);
    }
    return data.result || {};
  }

  return {
    addMemory: async (params) => {
      const result = await callTool('mem0_add', params);
      return { id: result.id || crypto.randomUUID() };
    },

    searchMemories: async (params) => {
      const result = await callTool('mem0_search', params);
      // Mem0 returns { results: [...] } or array directly
      const results = result.results || result || [];
      return results.map((r: { id?: string; memory_id?: string; memory?: string; content?: string; score?: number }) => ({
        id: r.id || r.memory_id || crypto.randomUUID(),
        content: r.memory || r.content || '',
        score: r.score,
      }));
    },

    getMemory: async (params) => {
      return callTool('mem0_get', params);
    },

    listMemories: async (params) => {
      const result = await callTool('mem0_list', params);
      return { results: result.results || result || [], count: result.count };
    },

    updateMemory: async (params) => {
      return callTool('mem0_update', params);
    },

    deleteMemory: async (params) => {
      return callTool('mem0_delete', params);
    },

    deleteAllMemories: async (params) => {
      return callTool('mem0_delete_all', params);
    },

    getMemoryHistory: async (params) => {
      const result = await callTool('mem0_history', params);
      return result || [];
    },

    getEntities: async () => {
      const result = await callTool('mem0_entities', {});
      return result.results || result || [];
    },
  };
}

/**
 * Initialize Mem0Service with diiiploy-gateway (lazy init)
 * CRITICAL: AudienceOS uses DIIIPLOY-GATEWAY, NOT chi-gateway!
 */
export function initializeMem0Service(): Mem0Service {
  if (!mem0ServiceInstance) {
    const client = createDiiiplopyGatewayMem0Client();
    mem0ServiceInstance = new Mem0Service(client);
  }
  return mem0ServiceInstance;
}
