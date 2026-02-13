/**
 * Memory System Types
 *
 * Types for cross-session memory using Mem0.
 */

/**
 * Memory entry from Mem0
 */
export interface Memory {
  id: string;
  content: string;
  metadata: MemoryMetadata;
  score?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Memory metadata for scoping
 *
 * 3-PART SCOPING: agencyId::clientId::userId
 *   - agencyId: Required - tenant isolation
 *   - clientId: Optional - client-specific memories
 *   - userId: Required - user attribution
 */
export interface MemoryMetadata {
  agencyId: string;
  clientId?: string;
  userId: string;
  sessionId?: string;
  type: MemoryType;
  topic?: string;
  entities?: string[];
  importance?: 'low' | 'medium' | 'high';
}

/**
 * Memory types
 */
export type MemoryType =
  | 'conversation' // General conversation context
  | 'decision' // Decisions made
  | 'preference' // User preferences
  | 'project' // Ongoing project context
  | 'insight' // Learned insights about the user/agency
  | 'task'; // Tasks or action items

/**
 * Memory search request
 */
export interface MemorySearchRequest {
  query: string;
  agencyId: string;
  clientId?: string;
  userId: string;
  limit?: number;
  minScore?: number;
  types?: MemoryType[];
}

/**
 * Memory search result
 */
export interface MemorySearchResult {
  memories: Memory[];
  totalFound: number;
  searchTimeMs: number;
}

/**
 * Memory add request
 */
export interface MemoryAddRequest {
  content: string;
  agencyId: string;
  clientId?: string;
  userId: string;
  sessionId?: string;
  type: MemoryType;
  topic?: string;
  entities?: string[];
  importance?: 'low' | 'medium' | 'high';
}

/**
 * Memory injection for system prompt
 */
export interface MemoryInjection {
  contextBlock: string;
  memories: Memory[];
  relevanceExplanation: string;
}

/**
 * Memory recall detection result
 */
export interface RecallDetection {
  isRecallQuery: boolean;
  confidence: number;
  extractedTopic?: string;
  timeReference?: string;
  suggestedSearchQuery: string;
}

/**
 * Memory statistics
 */
export interface MemoryStats {
  totalMemories: number;
  byType: Record<MemoryType, number>;
  byImportance: Record<string, number>;
  oldestMemory?: Date;
  newestMemory?: Date;
}

/**
 * Memory management action
 */
export type MemoryAction = 'delete' | 'archive' | 'update_importance';

/**
 * Memory update request
 */
export interface MemoryUpdateRequest {
  memoryId: string;
  content: string;
  metadata?: Partial<MemoryMetadata>;
}

/**
 * Memory history entry — tracks how a memory evolved over time
 */
export interface MemoryHistoryEntry {
  id: string;
  memoryId: string;
  oldContent: string;
  newContent: string;
  event: 'created' | 'updated' | 'deleted';
  timestamp: Date;
}

/**
 * Mem0 entity (user, agent, app)
 */
export interface MemoryEntity {
  type: 'user' | 'agent' | 'app';
  id: string;
  name?: string;
  memoryCount?: number;
}

/**
 * Paginated memory list response
 */
export interface MemoryListResponse {
  memories: Memory[];
  page: number;
  pageSize: number;
  total: number;
}
