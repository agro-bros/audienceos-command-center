/**
 * Knowledge Base Store
 * Zustand state management for knowledge base feature
 */

import { create } from 'zustand'
import type { KnowledgeBaseDocument, DocumentSortField, SortDirection, CategoryWithCount } from '@/types/knowledge-base'
import type { DocumentCategory, IndexStatus } from '@/types/database'
import { mockDocuments, getCategoryCounts, filterDocuments, sortDocuments } from '@/lib/mock-knowledge-base'

interface DocumentFilters {
  query: string
  category: DocumentCategory | 'all'
  indexStatus: IndexStatus | 'all'
  clientId: string | 'global' | 'all'
}

interface DocumentSort {
  field: DocumentSortField
  direction: SortDirection
}

type ViewMode = 'grid' | 'list'

interface KnowledgeBaseState {
  // Documents
  documents: KnowledgeBaseDocument[]
  filteredDocuments: KnowledgeBaseDocument[]
  selectedDocument: KnowledgeBaseDocument | null
  isLoading: boolean
  error: string | null

  // Categories
  categories: CategoryWithCount[]

  // Filters
  filters: DocumentFilters
  sort: DocumentSort
  viewMode: ViewMode

  // Modals
  isUploadModalOpen: boolean
  isPreviewModalOpen: boolean

  // Actions
  setDocuments: (documents: KnowledgeBaseDocument[]) => void
  setSelectedDocument: (document: KnowledgeBaseDocument | null) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void

  // Filter actions
  setSearchQuery: (query: string) => void
  setCategory: (category: DocumentCategory | 'all') => void
  setIndexStatus: (status: IndexStatus | 'all') => void
  setClientFilter: (clientId: string | 'global' | 'all') => void
  clearFilters: () => void

  // Sort actions
  setSortField: (field: DocumentSortField) => void
  setSortDirection: (direction: SortDirection) => void
  toggleSortDirection: () => void

  // View actions
  setViewMode: (mode: ViewMode) => void

  // Modal actions
  openUploadModal: () => void
  closeUploadModal: () => void
  openPreviewModal: (document: KnowledgeBaseDocument) => void
  closePreviewModal: () => void

  // Document actions
  addDocument: (document: KnowledgeBaseDocument) => void
  updateDocument: (id: string, updates: Partial<KnowledgeBaseDocument>) => void
  deleteDocument: (id: string) => void
  reindexDocument: (id: string) => void

  // Refresh
  applyFiltersAndSort: () => void
  refreshDocuments: () => Promise<void>
}

const defaultFilters: DocumentFilters = {
  query: '',
  category: 'all',
  indexStatus: 'all',
  clientId: 'all',
}

const defaultSort: DocumentSort = {
  field: 'updated_at',
  direction: 'desc',
}

export const useKnowledgeBaseStore = create<KnowledgeBaseState>((set, get) => ({
  // Initial state
  documents: mockDocuments,
  filteredDocuments: sortDocuments(mockDocuments, 'updated_at', 'desc'),
  selectedDocument: null,
  isLoading: false,
  error: null,
  categories: getCategoryCounts(mockDocuments),
  filters: defaultFilters,
  sort: defaultSort,
  viewMode: 'grid',
  isUploadModalOpen: false,
  isPreviewModalOpen: false,

  // Document setters
  setDocuments: (documents) => {
    set({ documents })
    get().applyFiltersAndSort()
  },

  setSelectedDocument: (selectedDocument) => set({ selectedDocument }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),

  // Filter setters
  setSearchQuery: (query) => {
    set((state) => ({
      filters: { ...state.filters, query },
    }))
    get().applyFiltersAndSort()
  },

  setCategory: (category) => {
    set((state) => ({
      filters: { ...state.filters, category },
    }))
    get().applyFiltersAndSort()
  },

  setIndexStatus: (indexStatus) => {
    set((state) => ({
      filters: { ...state.filters, indexStatus },
    }))
    get().applyFiltersAndSort()
  },

  setClientFilter: (clientId) => {
    set((state) => ({
      filters: { ...state.filters, clientId },
    }))
    get().applyFiltersAndSort()
  },

  clearFilters: () => {
    set({ filters: defaultFilters })
    get().applyFiltersAndSort()
  },

  // Sort setters
  setSortField: (field) => {
    set((state) => ({
      sort: { ...state.sort, field },
    }))
    get().applyFiltersAndSort()
  },

  setSortDirection: (direction) => {
    set((state) => ({
      sort: { ...state.sort, direction },
    }))
    get().applyFiltersAndSort()
  },

  toggleSortDirection: () => {
    set((state) => ({
      sort: {
        ...state.sort,
        direction: state.sort.direction === 'asc' ? 'desc' : 'asc',
      },
    }))
    get().applyFiltersAndSort()
  },

  // View mode
  setViewMode: (viewMode) => set({ viewMode }),

  // Modal actions
  openUploadModal: () => set({ isUploadModalOpen: true }),
  closeUploadModal: () => set({ isUploadModalOpen: false }),

  openPreviewModal: (document) =>
    set({
      selectedDocument: document,
      isPreviewModalOpen: true,
    }),

  closePreviewModal: () =>
    set({
      isPreviewModalOpen: false,
      // Keep selectedDocument for animation, clear after modal closes
    }),

  // Document mutations
  addDocument: (document) => {
    set((state) => ({
      documents: [document, ...state.documents],
    }))
    get().applyFiltersAndSort()
    set((state) => ({
      categories: getCategoryCounts(state.documents),
    }))
  },

  updateDocument: (id, updates) => {
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates } : doc
      ),
    }))
    get().applyFiltersAndSort()
    set((state) => ({
      categories: getCategoryCounts(state.documents),
    }))
  },

  deleteDocument: (id) => {
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
      selectedDocument: state.selectedDocument?.id === id ? null : state.selectedDocument,
    }))
    get().applyFiltersAndSort()
    set((state) => ({
      categories: getCategoryCounts(state.documents),
    }))
  },

  reindexDocument: (id) => {
    // Set status to indexing
    get().updateDocument(id, { index_status: 'indexing', gemini_file_id: null })

    // Simulate indexing (in production, this would call the API)
    setTimeout(() => {
      get().updateDocument(id, {
        index_status: 'indexed',
        gemini_file_id: `gemini-${Date.now()}`,
        updated_at: new Date().toISOString(),
      })
    }, 3000)
  },

  // Apply filters and sort
  applyFiltersAndSort: () => {
    const { documents, filters, sort } = get()

    let filtered = filterDocuments(documents, {
      query: filters.query,
      category: filters.category,
      indexStatus: filters.indexStatus,
      clientId: filters.clientId,
    })

    filtered = sortDocuments(filtered, sort.field, sort.direction)

    set({ filteredDocuments: filtered })
  },

  // Refresh from API
  refreshDocuments: async () => {
    set({ isLoading: true, error: null })

    try {
      // In production, this would fetch from API
      await new Promise((resolve) => setTimeout(resolve, 500))

      set({
        documents: mockDocuments,
        isLoading: false,
      })
      get().applyFiltersAndSort()
      set((state) => ({
        categories: getCategoryCounts(state.documents),
      }))
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load documents',
        isLoading: false,
      })
    }
  },
}))
