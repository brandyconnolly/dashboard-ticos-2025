import * as React from "react"
import { clsx } from "clsx"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "destructive" | "ghost"
  size?: "sm" | "md" | "lg"
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const sizeClassName = {
      sm: "text-sm px-2 py-1 rounded-md",
      md: "text-base px-4 py-2 rounded-md",
      lg: "text-lg px-6 py-3 rounded-lg",
    }[size]

    const variantClassName = {
      default: "bg-primary text-primary-foreground hover:bg-primary/90",
      outline: "border border-primary text-primary hover:bg-primary/10",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      ghost: "text-primary hover:bg-primary/10",
    }[variant]

    return (
      <button
        className={clsx(className, sizeClassName, variantClassName, "focus:outline-none focus:ring-2 focus:ring-ring")}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    )
  },
)
