"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
  X,
  Download,
  ExternalLink,
  FileText,
  Clock,
  User,
  Tag,
  BarChart3,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import type { KnowledgeBaseDocument } from "@/types/knowledge-base"
import {
  formatFileSize,
  CATEGORY_LABELS,
  FILE_TYPE_INFO,
  INDEX_STATUS_INFO,
} from "@/types/knowledge-base"
import type { IndexStatus } from "@/types/database"

interface DocumentPreviewModalProps {
  document: KnowledgeBaseDocument
  isOpen: boolean
  onClose: () => void
}

export function DocumentPreviewModal({
  document: doc,
  isOpen,
  onClose,
}: DocumentPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "details" | "analytics">("preview")
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [zoom, setZoom] = useState(100)

  // Simulate loading
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      const timer = setTimeout(() => setIsLoading(false), 800)
      return () => clearTimeout(timer)
    }
  }, [isOpen, doc.id])

  // Reset state when document changes
  useEffect(() => {
    setCurrentPage(1)
    setZoom(100)
  }, [doc.id])

  const fileInfo = FILE_TYPE_INFO[doc.mime_type] || {
    label: "File",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  }

  const indexInfo = INDEX_STATUS_INFO[doc.index_status]

  // Render preview based on file type
  const renderPreview = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )
    }

    // Markdown/Text preview
    if (doc.mime_type === "text/markdown" || doc.mime_type === "text/plain") {
      return (
        <ScrollArea className="h-full">
          <div className="p-6 prose prose-sm dark:prose-invert max-w-none">
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-4 rounded-lg">
              {`# ${doc.title}

${doc.description || "No description available."}

## Document Information
- Category: ${CATEGORY_LABELS[doc.category]}
- File Size: ${formatFileSize(doc.file_size)}
- Word Count: ${doc.word_count || "Unknown"}
- Upload Date: ${new Date(doc.created_at).toLocaleDateString()}

## Tags
${doc.tags.map((tag) => `- ${tag}`).join("\n")}

---

*This is a preview. Download the full document for complete content.*`}
            </pre>
          </div>
        </ScrollArea>
      )
    }

    // PDF preview placeholder
    if (doc.mime_type === "application/pdf") {
      return (
        <div className="flex flex-col h-full">
          {/* PDF Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {currentPage} of {doc.page_count || 1}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCurrentPage((p) => Math.min(doc.page_count || 1, p + 1))}
                disabled={currentPage === (doc.page_count || 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.max(50, z - 25))}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setZoom((z) => Math.min(200, z + 25))}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* PDF Viewer Placeholder */}
          <div className="flex-1 flex items-center justify-center bg-muted/30 p-4">
            <div
              className="bg-white shadow-lg rounded-sm flex items-center justify-center text-muted-foreground"
              style={{
                width: `${(612 * zoom) / 100}px`,
                height: `${(792 * zoom) / 100}px`,
                maxWidth: "100%",
                maxHeight: "100%",
              }}
            >
              <div className="text-center p-8">
                <FileText className="h-16 w-16 mx-auto mb-4 text-red-500/50" />
                <p className="text-sm font-medium text-gray-600">PDF Preview</p>
                <p className="text-xs text-gray-400 mt-1">
                  Page {currentPage} of {doc.page_count || 1}
                </p>
                <p className="text-xs text-gray-400 mt-4">
                  In production, this would render the actual PDF using PDF.js
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // DOCX preview placeholder
    return (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="text-center p-8">
          <FileText className="h-16 w-16 mx-auto mb-4 text-blue-500/50" />
          <p className="text-sm font-medium text-foreground">Document Preview</p>
          <p className="text-xs text-muted-foreground mt-1">{doc.file_name}</p>
          <p className="text-xs text-muted-foreground mt-4">
            {doc.word_count ? `${doc.word_count.toLocaleString()} words` : ""}
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            <Download className="mr-2 h-4 w-4" />
            Download to View
          </Button>
        </div>
      </div>
    )
  }

  // Render details tab
  const renderDetails = () => (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* File Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">File Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">File Name</p>
              <p className="font-medium">{doc.file_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">File Type</p>
              <Badge variant="outline" className={cn(fileInfo.color, fileInfo.bgColor, "border-transparent")}>
                {fileInfo.label}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">File Size</p>
              <p className="font-medium">{formatFileSize(doc.file_size)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pages</p>
              <p className="font-medium">{doc.page_count || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Word Count</p>
              <p className="font-medium">{doc.word_count?.toLocaleString() || "N/A"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Category</p>
              <p className="font-medium">{CATEGORY_LABELS[doc.category]}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {doc.description && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Description</h3>
            <p className="text-sm text-muted-foreground">{doc.description}</p>
          </div>
        )}

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {doc.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="mr-1 h-3 w-3" />
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Client */}
        {doc.client_name && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">Client</h3>
            <Badge variant="outline">{doc.client_name}</Badge>
          </div>
        )}

        {/* Index Status */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Index Status</h3>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(indexInfo.color, indexInfo.bgColor, "border-transparent")}
            >
              {doc.index_status === "indexed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
              {doc.index_status === "indexing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              {doc.index_status === "failed" && <AlertCircle className="mr-1 h-3 w-3" />}
              {indexInfo.label}
            </Badge>
            {doc.index_status === "failed" && (
              <Button variant="outline" size="sm">
                <RefreshCw className="mr-2 h-3 w-3" />
                Re-index
              </Button>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Metadata</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" /> Uploaded By
              </p>
              <p className="font-medium">{doc.uploader_name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Upload Date
              </p>
              <p className="font-medium">{new Date(doc.created_at).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" /> Last Updated
              </p>
              <p className="font-medium">{new Date(doc.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  )

  // Render analytics tab
  const renderAnalytics = () => (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Usage Statistics */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Usage Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-semibold">{doc.usage_count}</p>
              <p className="text-xs text-muted-foreground">AI Citations</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-2xl font-semibold">--</p>
              <p className="text-xs text-muted-foreground">Views This Month</p>
            </div>
          </div>
        </div>

        {/* Usage Trend */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Usage Trend</h3>
          <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Chart available in production</p>
            </div>
          </div>
        </div>

        {/* Recent Citations */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Recent Citations</h3>
          {doc.usage_count > 0 ? (
            <div className="space-y-2">
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground text-xs">Dec 15, 2024</p>
                <p className="mt-1">Referenced in chat about pixel installation</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p className="text-muted-foreground text-xs">Dec 12, 2024</p>
                <p className="mt-1">Used to answer GTM configuration question</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No citations yet</p>
          )}
        </div>
      </div>
    </ScrollArea>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-medium truncate">{doc.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={cn("text-xs", fileInfo.color, fileInfo.bgColor, "border-transparent")}>
                  {fileInfo.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{formatFileSize(doc.file_size)}</span>
                {doc.client_name && (
                  <Badge variant="outline" className="text-xs">{doc.client_name}</Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="shrink-0 mx-6 mt-2 w-fit">
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 m-0 overflow-hidden">
            {renderPreview()}
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
            {renderDetails()}
          </TabsContent>

          <TabsContent value="analytics" className="flex-1 m-0 overflow-hidden">
            {renderAnalytics()}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
