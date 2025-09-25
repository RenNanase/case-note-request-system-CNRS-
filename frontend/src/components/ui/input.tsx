import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm transition-colors",
        "placeholder:text-gray-500 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
        "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50",
        "aria-invalid:border-red-500 aria-invalid:focus:border-red-500 aria-invalid:focus:ring-red-500/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
