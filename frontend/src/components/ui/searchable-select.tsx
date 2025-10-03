import * as React from "react"
import { Check, ChevronsDown, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SearchableSelectOption {
  value: string
  label: string
  department?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  required?: boolean
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  label,
  className,
  disabled = false,
  required = false
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const selectedOption = options.find((option) => option.value === value)

  // Handle click outside to close dropdown
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
        setSearchTerm("")
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Filter options based on search term
  const filteredOptions = React.useMemo(() => {
    if (!searchTerm.trim()) return options

    return options.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (option.department && option.department.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [options, searchTerm])

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue === value ? "" : optionValue)
    setOpen(false)
    setSearchTerm("")
  }

  const handleClear = () => {
    onValueChange?.("")
    setSearchTerm("")
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className={cn("text-sm font-medium", required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
          {label}
        </Label>
      )}

      <div className="relative" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 px-3 py-2",
            !selectedOption && "text-muted-foreground"
          )}
          onClick={() => setOpen(!open)}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption ? (
              <div className="flex flex-col items-start">
                <span className="font-medium">{selectedOption.label}</span>
                {selectedOption.department && (
                  <span className="text-xs text-muted-foreground">{selectedOption.department}</span>
                )}
              </div>
            ) : (
              placeholder
            )}
          </span>
          <div className="flex items-center gap-1">
            {selectedOption && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  handleClear()
                }}
              />
            )}
            <ChevronsDown className="h-4 w-4 shrink-0 opacity-50" />
          </div>
        </Button>

        {open && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={`Search ${label?.toLowerCase() || 'options'}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 text-sm"
                  autoFocus
                />
              </div>
            </div>

            {/* Dropdown List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">
                  No {label?.toLowerCase() || 'option'} found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option.value}
                    className={cn(
                      "relative flex flex-col items-start px-3 py-2 text-sm cursor-pointer hover:bg-gray-50",
                      value === option.value && "bg-blue-50"
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="flex items-center w-full">
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100 text-blue-600" : "opacity-0"
                        )}
                      />
                      <span className="font-medium">{option.label}</span>
                    </div>
                    {option.department && (
                      <span className="text-xs text-muted-foreground ml-6">{option.department}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
