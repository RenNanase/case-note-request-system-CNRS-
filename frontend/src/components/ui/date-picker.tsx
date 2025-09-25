"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
  className?: string;
  placeholder?: string;
  label?: string;
}

export function DatePicker({ date, onDateChange, className, placeholder = "Pick a date", label }: DatePickerProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal h-10 px-3 py-2 border-2 border-gray-300 rounded-md shadow-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900",
              !date && "text-gray-500",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-gray-600" />
            {date ? format(date, "MMM dd, yyyy") : <span className="text-gray-500">{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white border-2 border-gray-200 shadow-lg" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onDateChange}
            initialFocus
            className="rounded-md border-0 bg-white"
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
