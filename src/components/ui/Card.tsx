import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "../../lib/utils"

const cardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground shadow-soft transition-all duration-200",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "shadow-medium hover:shadow-strong",
        interactive: "hover:shadow-medium hover:-translate-y-1 cursor-pointer",
        glass: "bg-white/80 backdrop-blur-xl border-white/20",
        gradient: "bg-gradient-to-br from-white to-gray-50/50",
      },
      padding: {
        none: "",
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      padding: "default",
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, padding, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, padding, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divided?: boolean
  }
>(({ className, divided = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex flex-col space-y-2",
      divided && "border-b border-border pb-6 mb-6",
      className
    )} 
    {...props} 
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & {
    size?: "sm" | "default" | "lg"
  }
>(({ className, size = "default", ...props }, ref) => {
  const sizeClasses = {
    sm: "text-lg",
    default: "text-xl",
    lg: "text-2xl"
  }
  
  return (
    <h3
      ref={ref}
      className={cn(
        "font-semibold leading-none tracking-tight text-foreground",
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
})
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p 
    ref={ref} 
    className={cn("text-sm text-muted-foreground leading-relaxed", className)} 
    {...props} 
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    divided?: boolean
  }
>(({ className, divided = false, ...props }, ref) => (
  <div 
    ref={ref} 
    className={cn(
      "flex items-center",
      divided && "border-t border-border pt-6 mt-6",
      className
    )} 
    {...props} 
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants }