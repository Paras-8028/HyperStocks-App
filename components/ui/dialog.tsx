"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Render a Dialog root element with a standard `data-slot="dialog"` attribute and forwarded props.
 *
 * @param props - Props forwarded to the Dialog root element.
 * @returns The Dialog root element with `data-slot="dialog"` applied.
 */
function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

/**
 * Renders a dialog trigger element with standardized slot attribute and forwarded props.
 *
 * @returns A DialogPrimitive.Trigger element with data-slot="dialog-trigger" and all provided props forwarded.
 */
function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

/**
 * Renders a Radix Dialog Portal with a standardized slot attribute and forwards all props.
 *
 * @param props - Props forwarded to the underlying Radix Dialog Portal.
 * @returns The portal element with `data-slot="dialog-portal"`.
 */
function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

/**
 * Render a dialog close trigger element with a standardized `data-slot="dialog-close"` attribute.
 *
 * @returns A React element that closes the dialog when activated and includes `data-slot="dialog-close"`.
 */
function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

/**
 * Renders a full-viewport dialog overlay with a semi-opaque backdrop and state-driven open/close animations.
 *
 * @param className - Additional CSS classes to merge with the overlay's default classes
 * @returns A DialogPrimitive.Overlay element positioned to cover the viewport with backdrop and animation classes applied
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className
      )}
      {...props}
    />
  )
}

/**
 * Renders dialog content inside a portal with an overlay and an optional close button.
 *
 * @param className - Additional CSS classes to apply to the content container.
 * @param children - Elements rendered inside the dialog content.
 * @param showCloseButton - When `true`, renders a close button in the top-right corner; defaults to `true`.
 * @returns The dialog content React element, including portal and overlay wrappers.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 outline-none sm:max-w-lg",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/**
 * Renders the dialog header container with standard layout and slot metadata.
 *
 * @param className - Additional CSS classes to merge with the component's base layout classes
 * @param props - Additional attributes passed to the underlying `div` element
 * @returns A `div` element with `data-slot="dialog-header"` and preset layout classes for header content
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
      {...props}
    />
  )
}

/**
 * Container for dialog footer actions with responsive stacking and alignment.
 *
 * Renders a `div` with `data-slot="dialog-footer"` that stacks children vertically in reverse order on small screens and arranges them in a row aligned to the end on larger screens. Accepts `className` and any other `div` props which are merged onto the element.
 *
 * @returns The rendered footer `div` element with responsive layout classes and `data-slot="dialog-footer"`.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  )
}

/**
 * Renders a styled dialog title element.
 *
 * @returns A DialogPrimitive.Title element with `data-slot="dialog-title"` and composed typography classes applied.
 */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-lg leading-none font-semibold", className)}
      {...props}
    />
  )
}

/**
 * Renders the dialog description element with standardized styling and a `data-slot` attribute.
 *
 * @param className - Additional CSS classes to merge with the component's base styles
 * @param props - All other props are forwarded to the underlying description element
 * @returns The rendered dialog description element
 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}