import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Renders a styled native input element with standardized utility classes.
 *
 * The component forwards the provided `type` and all other native input props, adds
 * a `data-slot="input"` attribute, and merges the given `className` with the
 * component's base styling classes.
 *
 * @param className - Optional additional CSS classes to append to the base styles
 * @param type - Input `type` attribute value (e.g., "text", "email", "password")
 * @param props - Any other props accepted by a native `input` element
 * @returns The rendered input element
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }