import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-soft hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-red-500 text-white shadow-soft hover:bg-red-600",
        outline: 
          "text-foreground border-border bg-background hover:bg-accent",
        success:
          "border-transparent bg-emerald-500 text-white shadow-soft hover:bg-emerald-600",
        warning:
          "border-transparent bg-amber-500 text-white shadow-soft hover:bg-amber-600",
        info:
          "border-transparent bg-blue-500 text-white shadow-soft hover:bg-blue-600",
        ghost:
          "border-transparent hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "px-2.5 py-1 text-xs",
        sm: "px-2 py-0.5 text-2xs rounded-md",
        lg: "px-3 py-1.5 text-sm rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
  pulse?: boolean
}

function Badge({ 
  className, 
  variant, 
  size, 
  dot = false, 
  pulse = false,
  children,
  ...props 
}: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props}>
      {dot && (
        <span 
          className={cn(
            "w-1.5 h-1.5 rounded-full bg-current",
            pulse && "animate-pulse-subtle"
          )} 
        />
      )}
      {children}
    </div>
  )
}

export { Badge, badgeVariants }