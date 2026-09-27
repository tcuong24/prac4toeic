import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'subtle' | 'destructive'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const base = "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer active:scale-95 select-none"

    const variants = {
      default: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30",
      destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20 hover:shadow-md hover:shadow-rose-500/30",
      outline: "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 ",
      secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
      ghost: "hover:bg-slate-100 text-slate-700 hover:text-slate-900",
      link: "text-blue-600 underline-offset-4 hover:underline",
      subtle: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    }

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-lg px-3 text-xs",
      lg: "h-12 rounded-xl px-6 text-base",
      icon: "h-9 w-9 rounded-lg",
    }

    return (
      <button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"
