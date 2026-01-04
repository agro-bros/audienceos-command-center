"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { ChevronDown, X } from "lucide-react"

export interface MultiSelectOption {
  value: string
  label: string
  metadata?: Record<string, unknown>
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchable?: boolean
  selectAllOption?: boolean
  maxHeight?: string
  disabled?: boolean
}

export function MultiSelectDropdown({
  options,
  selected,
  onChange,
  placeholder = "Select options...",
  searchable = true,
  selectAllOption = true,
  maxHeight = "300px",
  disabled = false,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [options, searchQuery])

  // Handle toggle of a single option
  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  // Handle select all
  const handleSelectAll = () => {
    if (selected.length === options.length) {
      onChange([])
    } else {
      onChange(options.map((opt) => opt.value))
    }
  }

  // Get selected labels for display
  const selectedLabels = selected
    .map((val) => options.find((opt) => opt.value === val)?.label)
    .filter(Boolean) as string[]

  // Check if all options are selected
  const allSelected = selected.length === options.length && options.length > 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between bg-secondary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-sm truncate">
                {placeholder}
              </span>
            ) : (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Badge variant="secondary" className="shrink-0">
                  {selected.length} selected
                </Badge>
                <span className="text-sm text-muted-foreground truncate">
                  {selectedLabels.slice(0, 2).join(", ")}
                  {selectedLabels.length > 2 && ` +${selectedLabels.length - 2}`}
                </span>
              </div>
            )}
          </div>
          <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="space-y-2 p-4">
          {/* Search Input */}
          {searchable && (
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
          )}

          {/* Select All / Clear All */}
          {selectAllOption && options.length > 0 && (
            <div className="flex items-center justify-between py-2 px-2 border-b border-border">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all"
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  {allSelected ? "Deselect All" : "Select All"}
                </label>
              </div>
              {selected.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-destructive hover:text-destructive"
                  onClick={() => onChange([])}
                >
                  Clear
                </Button>
              )}
            </div>
          )}

          {/* Options List */}
          <div
            className="space-y-1 overflow-y-auto"
            style={{ maxHeight }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "No options found" : "No options available"}
                </p>
              </div>
            ) : (
              filteredOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-secondary/50 cursor-pointer"
                  onClick={() => toggleOption(option.value)}
                >
                  <Checkbox
                    id={option.value}
                    checked={selected.includes(option.value)}
                    onCheckedChange={() => toggleOption(option.value)}
                  />
                  <label
                    htmlFor={option.value}
                    className="flex-1 text-sm cursor-pointer"
                  >
                    {option.label}
                  </label>
                </div>
              ))
            )}
          </div>

          {/* Footer with count */}
          {selected.length > 0 && (
            <div className="pt-2 border-t border-border text-xs text-muted-foreground">
              {selected.length} of {options.length} selected
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
