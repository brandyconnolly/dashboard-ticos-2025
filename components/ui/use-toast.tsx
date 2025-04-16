// Simplified version of the toast component
import { toast as sonnerToast } from "sonner"

type ToastProps = {
  title?: string
  description?: string
  variant?: "default" | "destructive"
}

export function toast({ title, description, variant = "default" }: ToastProps) {
  const isDestructive = variant === "destructive"

  sonnerToast[isDestructive ? "error" : "success"](title, {
    description,
  })
}
