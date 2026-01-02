"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Brain, Send, X, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

const promptChips = [
  "Show stuck clients",
  "Draft email to RTA Outdoor",
  "How do I troubleshoot pixel?",
  "Summarize at-risk clients",
]

export function AIBar() {
  const [query, setQuery] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const { toast } = useToast()

  const handleSendQuery = () => {
    if (!query.trim()) return
    toast({
      title: "AI Intelligence",
      description: "AI-powered insights coming soon! We're training on your client data.",
    })
    setQuery("")
  }

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90"
      >
        <Brain className="h-4 w-4 mr-2" />
        Open Intelligence
      </Button>
    )
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-64 right-0 bg-card border-t border-border transition-all duration-300",
        isExpanded ? "h-80" : "h-auto",
      )}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium text-foreground">AudienceOS Intelligence</span>
            <Badge variant="secondary" className="text-xs bg-primary/20 text-primary">
              AI
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mb-3 h-48 overflow-y-auto bg-secondary/30 rounded-lg p-4 border border-border">
            <p className="text-sm text-muted-foreground text-center py-16">
              Ask me anything about your clients, or let me help draft communications.
            </p>
          </div>
        )}

        {/* Prompt Chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {promptChips.map((chip) => (
            <button
              key={chip}
              onClick={() => setQuery(chip)}
              className="px-3 py-1.5 text-xs rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors border border-border"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Ask about client status or draft a support response..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            className="flex-1 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
          <Button
            onClick={handleSendQuery}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
