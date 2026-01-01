"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus,
  LayoutGrid,
  List,
  Filter,
  Search,
  Sparkles,
  Brain,
  Send,
  MessageSquare,
  AlertTriangle,
  GripVertical,
  RefreshCw,
  CheckCircle,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useTicketStore,
  TICKET_STATUSES,
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type Ticket,
  type TicketStatus,
  type TicketPriority,
  type TicketCategory,
} from "@/stores/ticket-store"
import { useTicketSubscription, useTicketNotesSubscription } from "@/hooks/use-ticket-subscription"
import { toast } from "sonner"

// Priority styling
function getPriorityColor(priority: TicketPriority) {
  switch (priority) {
    case "critical":
      return "bg-rose-500/20 text-rose-400 border-rose-500/30"
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30"
    case "medium":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "low":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// Status styling
function getStatusColor(status: TicketStatus) {
  switch (status) {
    case "new":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30"
    case "in_progress":
      return "bg-amber-500/20 text-amber-400 border-amber-500/30"
    case "waiting_client":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30"
    case "resolved":
      return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
    default:
      return "bg-muted text-muted-foreground"
  }
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// Draggable Ticket Card
interface DraggableTicketCardProps {
  ticket: Ticket
  onClick: () => void
  isDragOverlay?: boolean
}

function DraggableTicketCard({ ticket, onClick, isDragOverlay = false }: DraggableTicketCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: ticket.id,
    data: { ticket },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  if (isDragOverlay) {
    return (
      <div className="bg-card border border-border rounded-lg p-4 cursor-grabbing transition-all shadow-xl ring-2 ring-primary/50 scale-105">
        <TicketCardContent ticket={ticket} />
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card border border-border rounded-lg p-4 cursor-grab transition-all hover:border-primary/50 hover:bg-card/80 touch-none",
        isDragging && "opacity-30"
      )}
      onClick={(e) => {
        if (!isDragging) onClick()
      }}
    >
      <div className="flex items-start gap-2" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <TicketCardContent ticket={ticket} />
        </div>
      </div>
    </div>
  )
}

// Shared ticket card content
function TicketCardContent({ ticket }: { ticket: Ticket }) {
  const assigneeName = ticket.assignee
    ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}`
    : "Unassigned"
  const assigneeInitials = ticket.assignee
    ? `${ticket.assignee.first_name[0]}${ticket.assignee.last_name[0]}`
    : "?"

  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-mono">#{ticket.number}</span>
        </div>
        <Badge variant="outline" className={cn("text-xs shrink-0", getPriorityColor(ticket.priority))}>
          {TICKET_PRIORITY_LABELS[ticket.priority]}
        </Badge>
      </div>

      <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">{ticket.title}</h4>

      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-secondary flex items-center justify-center shrink-0">
          <span className="text-xs font-medium text-secondary-foreground">
            {ticket.client?.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <span className="text-xs text-muted-foreground truncate">{ticket.client?.name}</span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="h-5 w-5 bg-primary">
            <AvatarFallback className="text-[10px] text-primary-foreground bg-primary">
              {assigneeInitials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{formatRelativeTime(ticket.created_at)}</span>
        </div>
        <Badge variant="outline" className={cn("text-[10px]", getStatusColor(ticket.status))}>
          {TICKET_STATUS_LABELS[ticket.status]}
        </Badge>
      </div>
    </>
  )
}

// Droppable Column
interface DroppableColumnProps {
  status: TicketStatus
  tickets: Ticket[]
  onTicketClick: (ticket: Ticket) => void
}

function DroppableColumn({ status, tickets, onTicketClick }: DroppableColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  })

  return (
    <div className="w-full md:flex-shrink-0 md:w-72">
      <Card
        className={cn(
          "bg-secondary/30 border-border transition-colors duration-200",
          isOver && "border-primary bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium flex items-center justify-between">
            <span className="text-foreground">{TICKET_STATUS_LABELS[status]}</span>
            <Badge variant="secondary" className="bg-muted text-muted-foreground">
              {tickets.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent ref={setNodeRef} className="p-2 space-y-2 min-h-[400px]">
          {tickets.map((ticket) => (
            <DraggableTicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))}
          {tickets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">No tickets</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Ticket Detail Sheet
interface TicketDetailSheetProps {
  ticket: Ticket | null
  isOpen: boolean
  onClose: () => void
}

function TicketDetailSheet({ ticket, isOpen, onClose }: TicketDetailSheetProps) {
  const [noteInput, setNoteInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { notes, isLoadingNotes, fetchNotes, addNote, resolveTicket, reopenTicket } = useTicketStore()
  const [showResolveDialog, setShowResolveDialog] = useState(false)
  const [resolutionNotes, setResolutionNotes] = useState("")
  const [timeSpent, setTimeSpent] = useState("")

  useEffect(() => {
    if (ticket?.id) {
      fetchNotes(ticket.id)
    }
  }, [ticket?.id, fetchNotes])

  // Subscribe to realtime note updates
  useTicketNotesSubscription(ticket?.id ?? null)

  if (!ticket) return null

  const handleAddNote = async () => {
    if (!noteInput.trim()) return

    setIsSubmitting(true)
    const result = await addNote(ticket.id, noteInput, true)
    setIsSubmitting(false)

    if (result) {
      setNoteInput("")
      toast.success("Note added")
    } else {
      toast.error("Failed to add note")
    }
  }

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast.error("Resolution notes are required")
      return
    }

    setIsSubmitting(true)
    const success = await resolveTicket(ticket.id, {
      resolution_notes: resolutionNotes,
      time_spent_minutes: timeSpent ? parseInt(timeSpent) : undefined,
    })
    setIsSubmitting(false)

    if (success) {
      setShowResolveDialog(false)
      setResolutionNotes("")
      setTimeSpent("")
      toast.success("Ticket resolved")
      onClose()
    } else {
      toast.error("Failed to resolve ticket")
    }
  }

  const handleReopen = async () => {
    setIsSubmitting(true)
    const success = await reopenTicket(ticket.id)
    setIsSubmitting(false)

    if (success) {
      toast.success("Ticket reopened")
    } else {
      toast.error("Failed to reopen ticket")
    }
  }

  const assigneeName = ticket.assignee
    ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}`
    : "Unassigned"

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="bg-card border-border w-full sm:max-w-[600px] overflow-y-auto p-0">
          <div className="p-6">
            <SheetHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground font-mono">#{ticket.number}</span>
                <Badge variant="outline" className={cn("text-xs", getStatusColor(ticket.status))}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </div>
              <SheetTitle className="text-foreground text-left text-lg">{ticket.title}</SheetTitle>
              <SheetDescription className="text-left">
                {ticket.client?.name} • Assigned to {assigneeName}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Client Context */}
              <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">Client Context</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="text-sm font-medium text-foreground">
                      {TICKET_CATEGORY_LABELS[ticket.category]}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {ticket.due_date && (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Due Date</p>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(ticket.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  {ticket.time_spent_minutes && (
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Time Spent</p>
                      <p className="text-sm font-medium text-foreground">
                        {Math.floor(ticket.time_spent_minutes / 60)}h {ticket.time_spent_minutes % 60}m
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground">Issue Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{ticket.description}</p>
              </div>

              {/* Resolution Notes (if resolved) */}
              {ticket.status === "resolved" && ticket.resolution_notes && (
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm font-medium text-foreground">Resolution</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{ticket.resolution_notes}</p>
                  {ticket.resolved_at && (
                    <p className="text-xs text-muted-foreground">
                      Resolved on {new Date(ticket.resolved_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}

              {/* AI Suggestion Panel */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium text-foreground">AI Assistance</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI-powered suggestions require Knowledge Base integration.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" className="text-xs h-8 bg-transparent" disabled>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Suggest Solution
                  </Button>
                  <Button size="sm" variant="outline" className="text-xs h-8 bg-transparent" disabled>
                    Draft Response
                  </Button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium text-foreground">Internal Notes</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{notes.length} notes</span>
                </div>

                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {isLoadingNotes ? (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ) : notes.length > 0 ? (
                    notes.map((note) => {
                      const authorName = note.author
                        ? `${note.author.first_name} ${note.author.last_name}`
                        : "Unknown"
                      const authorInitials = note.author
                        ? `${note.author.first_name[0]}${note.author.last_name[0]}`
                        : "?"

                      return (
                        <div key={note.id} className="flex gap-3">
                          <Avatar className="h-7 w-7 shrink-0 bg-primary">
                            <AvatarFallback className="text-xs text-primary-foreground bg-primary">
                              {authorInitials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-foreground">{authorName}</span>
                              <span className="text-xs text-muted-foreground">
                                {formatRelativeTime(note.created_at)}
                              </span>
                              {!note.is_internal && (
                                <Badge variant="outline" className="text-[10px]">
                                  Client-facing
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5 break-words">
                              {note.content}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No notes yet</p>
                  )}
                </div>

                {/* Note input */}
                <div className="flex gap-2 pt-2">
                  <Input
                    placeholder="Add an internal note..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    className="flex-1 bg-secondary border-border h-9"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleAddNote()
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    className="h-9 bg-primary text-primary-foreground shrink-0"
                    onClick={handleAddNote}
                    disabled={isSubmitting || !noteInput.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4 border-t border-border">
                {ticket.status === "resolved" ? (
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={handleReopen}
                    disabled={isSubmitting}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reopen Ticket
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 bg-transparent">
                      Escalate
                    </Button>
                    <Button
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => setShowResolveDialog(true)}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark Resolved
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Resolution Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Resolve Ticket #{ticket.number}</DialogTitle>
            <DialogDescription>
              Please provide resolution notes. This will be recorded in the ticket history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="resolution" className="text-foreground">
                Resolution Notes <span className="text-rose-500">*</span>
              </Label>
              <Textarea
                id="resolution"
                placeholder="Describe how the issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="bg-secondary border-border min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time" className="text-foreground">
                Time Spent (minutes)
              </Label>
              <Input
                id="time"
                type="number"
                placeholder="Optional"
                value={timeSpent}
                onChange={(e) => setTimeSpent(e.target.value)}
                className="bg-secondary border-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleResolve}
              disabled={isSubmitting || !resolutionNotes.trim()}
            >
              {isSubmitting ? "Resolving..." : "Resolve Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Create Ticket Modal
interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  clients: Array<{ id: string; name: string }>
  users: Array<{ id: string; name: string }>
}

function CreateTicketModal({ isOpen, onClose, clients, users }: CreateTicketModalProps) {
  const { createTicket } = useTicketStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    description: "",
    category: "general" as TicketCategory,
    priority: "medium" as TicketPriority,
    assignee_id: "",
  })

  const handleSubmit = async () => {
    if (!formData.client_id || !formData.title || !formData.description) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    const result = await createTicket({
      ...formData,
      assignee_id: formData.assignee_id || null,
    })
    setIsSubmitting(false)

    if (result) {
      toast.success(`Ticket #${result.number} created`)
      setFormData({
        client_id: "",
        title: "",
        description: "",
        category: "general",
        priority: "medium",
        assignee_id: "",
      })
      onClose()
    } else {
      toast.error("Failed to create ticket")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Create New Ticket</DialogTitle>
          <DialogDescription>Add a new support ticket</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-foreground">
              Title <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Describe the issue..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">
                Client <span className="text-rose-500">*</span>
              </Label>
              <Select
                value={formData.client_id}
                onValueChange={(value) => setFormData({ ...formData, client_id: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as TicketPriority })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-foreground">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as TicketCategory })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="campaign">Campaign</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="escalation">Escalation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Assignee</Label>
              <Select
                value={formData.assignee_id}
                onValueChange={(value) => setFormData({ ...formData, assignee_id: value })}
              >
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground">
              Description <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Provide more details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-secondary border-border min-h-[100px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="bg-primary text-primary-foreground"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Main View Component
export function SupportTicketsView() {
  const {
    tickets,
    isLoading,
    error,
    viewMode,
    filters,
    selectedTicket,
    fetchTickets,
    getFilteredTickets,
    getTicketsByStatus,
    changeStatus,
    setViewMode,
    setFilter,
    selectTicket,
    getNewTicketCount,
  } = useTicketStore()

  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false)
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false)
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)

  // Mock clients and users - in production, fetch from API
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([])
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([])

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  // Subscribe to realtime ticket updates
  useTicketSubscription()

  // Fetch tickets on mount
  useEffect(() => {
    fetchTickets()

    // TODO: Fetch clients and users from API
    // For now, extract unique clients from tickets
  }, [fetchTickets])

  // Extract unique clients from tickets for the create modal
  useEffect(() => {
    const uniqueClients = tickets.reduce((acc, ticket) => {
      if (ticket.client && !acc.find((c) => c.id === ticket.client?.id)) {
        acc.push({ id: ticket.client.id, name: ticket.client.name })
      }
      return acc
    }, [] as Array<{ id: string; name: string }>)
    setClients(uniqueClients)

    const uniqueUsers = tickets.reduce((acc, ticket) => {
      if (ticket.assignee && !acc.find((u) => u.id === ticket.assignee?.id)) {
        acc.push({
          id: ticket.assignee.id,
          name: `${ticket.assignee.first_name} ${ticket.assignee.last_name}`,
        })
      }
      return acc
    }, [] as Array<{ id: string; name: string }>)
    setUsers(uniqueUsers)
  }, [tickets])

  const filteredTickets = getFilteredTickets()

  const handleTicketClick = (ticket: Ticket) => {
    selectTicket(ticket)
    setIsDetailSheetOpen(true)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = tickets.find((t) => t.id === event.active.id)
    if (ticket) {
      setActiveTicket(ticket)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)

    if (!over) return

    const ticketId = active.id as string
    const newStatus = over.id as TicketStatus

    const draggedTicket = tickets.find((t) => t.id === ticketId)
    if (!draggedTicket || draggedTicket.status === newStatus) return

    // Special handling for resolved status
    if (newStatus === "resolved") {
      selectTicket(draggedTicket)
      setIsDetailSheetOpen(true)
      toast.info("Use the resolve button to add resolution notes")
      return
    }

    const success = await changeStatus(ticketId, newStatus)
    if (success) {
      toast.success(`Ticket moved to ${TICKET_STATUS_LABELS[newStatus]}`)
    } else {
      toast.error("Failed to update ticket status")
    }
  }

  if (isLoading && tickets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="flex flex-col gap-4 md:flex-row">
          {TICKET_STATUSES.map((status) => (
            <div key={status} className="w-full md:flex-shrink-0 md:w-72">
              <Card className="bg-secondary/30 border-border">
                <CardHeader className="py-3 px-4">
                  <Skeleton className="h-5 w-24" />
                </CardHeader>
                <CardContent className="p-2 space-y-2 min-h-[400px]">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Failed to load tickets</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={() => fetchTickets()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Tickets</h1>
          <p className="text-muted-foreground">Track and resolve client issues</p>
        </div>

        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setIsNewTicketOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-secondary rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-3", viewMode === "kanban" && "bg-background")}
              onClick={() => setViewMode("kanban")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 px-3", viewMode === "list" && "bg-background")}
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter by Priority */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilter("priority", value as TicketPriority | "all")}
            >
              <SelectTrigger className="w-[140px] bg-secondary border-border h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
            className="pl-9 bg-secondary border-border h-9"
          />
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === "kanban" && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col gap-4 md:flex-row md:overflow-x-auto md:pb-4">
            {TICKET_STATUSES.map((status) => {
              const statusTickets = filteredTickets.filter((t) => t.status === status)
              return (
                <DroppableColumn
                  key={status}
                  status={status}
                  tickets={statusTickets}
                  onTicketClick={handleTicketClick}
                />
              )
            })}
          </div>

          <DragOverlay
            dropAnimation={{
              duration: 200,
              easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
            }}
          >
            {activeTicket ? (
              <DraggableTicketCard ticket={activeTicket} onClick={() => {}} isDragOverlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* List View */}
      {viewMode === "list" && (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">#</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Ticket</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Client</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Priority</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Assignee</th>
                    <th className="text-left p-4 text-xs font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => {
                    const assigneeName = ticket.assignee
                      ? `${ticket.assignee.first_name} ${ticket.assignee.last_name}`
                      : "Unassigned"
                    const assigneeInitials = ticket.assignee
                      ? `${ticket.assignee.first_name[0]}${ticket.assignee.last_name[0]}`
                      : "?"

                    return (
                      <tr
                        key={ticket.id}
                        className="border-b border-border hover:bg-secondary/50 cursor-pointer transition-colors"
                        onClick={() => handleTicketClick(ticket)}
                      >
                        <td className="p-4">
                          <span className="text-xs text-muted-foreground font-mono">#{ticket.number}</span>
                        </td>
                        <td className="p-4">
                          <p className="text-sm font-medium text-foreground line-clamp-1">{ticket.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {TICKET_CATEGORY_LABELS[ticket.category]}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-foreground">{ticket.client?.name}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={cn("text-xs", getStatusColor(ticket.status))}>
                            {TICKET_STATUS_LABELS[ticket.status]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className={cn("text-xs", getPriorityColor(ticket.priority))}>
                            {TICKET_PRIORITY_LABELS[ticket.priority]}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5 bg-primary">
                              <AvatarFallback className="text-[10px] text-primary-foreground bg-primary">
                                {assigneeInitials}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm text-foreground">{assigneeName}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-muted-foreground">
                            {formatRelativeTime(ticket.created_at)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No tickets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Detail Sheet */}
      <TicketDetailSheet
        ticket={selectedTicket}
        isOpen={isDetailSheetOpen}
        onClose={() => {
          setIsDetailSheetOpen(false)
          selectTicket(null)
        }}
      />

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isNewTicketOpen}
        onClose={() => setIsNewTicketOpen(false)}
        clients={clients}
        users={users}
      />
    </div>
  )
}
