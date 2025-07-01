import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "../../lib/utils"
import { Button } from "./Button"

const inputVariants = cva(
  "flex w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "shadow-soft hover:shadow-medium focus-visible:shadow-medium",
        ghost: "border-transparent bg-transparent hover:bg-accent focus-visible:bg-background focus-visible:border-input",
        filled: "bg-muted border-transparent focus-visible:bg-background focus-visible:border-primary",
      },
      inputSize: {
        default: "h-10 px-4 py-2.5",
        sm: "h-8 px-3 py-2 text-xs rounded-lg",
        lg: "h-12 px-5 py-3 text-base rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "default",
    },
  }
)

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  error?: boolean
  helperText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    variant, 
    inputSize, 
    type, 
    leftIcon, 
    rightIcon, 
    error = false,
    helperText,
    ...props 
  }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const isPassword = type === "password"
    const inputType = isPassword && showPassword ? "text" : type

    const inputElement = (
      <input
        type={inputType}
        className={cn(
          inputVariants({ variant, inputSize }),
          leftIcon && "pl-10",
          (rightIcon || isPassword) && "pr-10",
          error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )

    if (leftIcon || rightIcon || isPassword) {
      return (
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}
          {inputElement}
          {(rightIcon || isPassword) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isPassword ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowPassword(!showPassword)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              ) : (
                <div className="text-muted-foreground">{rightIcon}</div>
              )}
            </div>
          )}
          {helperText && (
            <p className={cn(
              "mt-1.5 text-xs",
              error ? "text-red-500" : "text-muted-foreground"
            )}>
              {helperText}
            </p>
          )}
        </div>
      )
    }

    return (
      <div>
        {inputElement}
        {helperText && (
          <p className={cn(
            "mt-1.5 text-xs",
            error ? "text-red-500" : "text-muted-foreground"
          )}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input, inputVariants }