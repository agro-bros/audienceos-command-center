"use client"

import React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  X,
  Download,
  ExternalLink,
  MoreHorizontal,
  Star,
  Share2,
  Trash2,
  Copy,
  Clock,
  User,
  Folder,
  Tag,
  FileText,
  Eye,
  Edit,
  History,
  FolderInput,
  BrainCircuit,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type DocumentType, type DocumentCategory, categoryLabels, categoryColors } from "./document-card"

interface Document {
  id: string
  name: string
  type: DocumentType
  category?: DocumentCategory
  description?: string
  thumbnail?: string
  content?: string
  updatedAt: string
  createdAt: string
  updatedBy?: string
  createdBy?: string
  size?: string
  shared?: boolean
  starred?: boolean
  useForTraining?: boolean
  tags?: string[]
  clientName?: string
  viewCount?: number
  downloadCount?: number
}

interface DocumentPreviewPanelProps {
  document: Document
  onClose: () => void
  onStar?: () => void
  onDownload?: () => void
  onShare?: () => void
  onDelete?: () => void
  onToggleTraining?: () => void
  className?: string
}

export function DocumentPreviewPanel({
  document,
  onClose,
  onStar,
  onDownload,
  onShare,
  onDelete,
  onToggleTraining,
  className,
}: DocumentPreviewPanelProps) {
  return (
    <div
      className={cn(
        "flex flex-col h-full bg-background border-l border-border",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {document.name}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onStar}
            className={cn(
              "p-1.5 rounded transition-colors cursor-pointer",
              document.starred
                ? "text-yellow-500"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            <Star className={cn("w-4 h-4", document.starred && "fill-yellow-500")} />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer">
            <ExternalLink className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Copy className="w-4 h-4 mr-2" />
                Make a copy
              </DropdownMenuItem>
              <DropdownMenuItem>
                <FolderInput className="w-4 h-4 mr-2" />
                Move to folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <History className="w-4 h-4 mr-2" />
                Version history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={onClose}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preview area - fills available space */}
      <div className="flex-1 bg-secondary/50 flex items-center justify-center min-h-0">
        {document.thumbnail ? (
          <div className="relative w-full h-full">
            <Image
              src={document.thumbnail}
              alt={document.name}
              fill
              className="object-contain"
            />
          </div>
        ) : (
          <div className="text-center text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Preview not available</p>
          </div>
        )}
      </div>

      {/* Document info + Metadata - anchored to bottom */}
      <div className="border-t border-border">
        {/* Document title and description */}
        <div className="px-3 py-2 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            {document.name}
          </h2>
          {document.description && (
            <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{document.description}</p>
          )}
        </div>

        {/* Metadata - compact */}
        <div className="px-3 py-2 space-y-1.5 max-h-[200px] overflow-y-auto">
          {/* Category */}
          {document.category && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Folder className="w-3 h-3" />
                <span>Category</span>
              </div>
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  categoryColors[document.category]
                )}
              >
                {categoryLabels[document.category]}
              </span>
            </div>
          )}

          {/* Client */}
          {document.clientName && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span>Client</span>
              </div>
              <span className="text-xs text-foreground">{document.clientName}</span>
            </div>
          )}

          {/* Size */}
          {document.size && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileText className="w-3 h-3" />
                <span>Size</span>
              </div>
              <span className="text-xs text-foreground">{document.size}</span>
            </div>
          )}

          {/* Created */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Created</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-foreground">{document.createdAt}</span>
              {document.createdBy && (
                <p className="text-[10px] text-muted-foreground">by {document.createdBy}</p>
              )}
            </div>
          </div>

          {/* Updated */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>Updated</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-foreground">{document.updatedAt}</span>
              {document.updatedBy && (
                <p className="text-[10px] text-muted-foreground">by {document.updatedBy}</p>
              )}
            </div>
          </div>

          {/* Views */}
          {document.viewCount !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="w-3 h-3" />
                <span>Views</span>
              </div>
              <span className="text-xs text-foreground">{document.viewCount}</span>
            </div>
          )}

          {/* Downloads */}
          {document.downloadCount !== undefined && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Download className="w-3 h-3" />
                <span>Downloads</span>
              </div>
              <span className="text-xs text-foreground">{document.downloadCount}</span>
            </div>
          )}

          {/* Tags */}
          {document.tags && document.tags.length > 0 && (
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Tag className="w-3 h-3" />
                <span>Tags</span>
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end max-w-[65%]">
                {document.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI Training */}
          {onToggleTraining && (
            <div className="flex items-center justify-between pt-1.5 border-t border-border mt-1.5">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BrainCircuit className="w-3 h-3" />
                <span>Use for AI Training</span>
              </div>
              <button
                onClick={onToggleTraining}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors cursor-pointer",
                  document.useForTraining
                    ? "bg-foreground text-background"
                    : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                )}
              >
                {document.useForTraining ? (
                  <>
                    <Check className="w-3 h-3" />
                    Enabled
                  </>
                ) : (
                  "Enable"
                )}
              </button>
            </div>
          )}
        </div>

        {/* Actions - inside bottom section */}
        <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <button
            onClick={onShare}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-secondary text-foreground rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
        <button
          onClick={onDelete}
          className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 text-red-500 border border-red-500/30 hover:bg-red-500/10 rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
        </div>
      </div>
    </div>
  )
}

export type { Document }
