import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'topic'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"

  const variants = {
    default: "bg-blue-600 text-white shadow-xs",
    secondary: "bg-slate-100 text-slate-800",
    outline: "border border-slate-300 text-slate-700",
    noun: "bg-sky-50 text-sky-700 border border-sky-200",
    verb: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    adjective: "bg-amber-50 text-amber-700 border border-amber-200",
    adverb: "bg-purple-50 text-purple-700 border border-purple-200",
    topic: "bg-indigo-50 text-indigo-700 border border-indigo-200/60 font-medium",
  }

  return (
    <div className={cn(base, variants[variant], className)} {...props} />
  )
}
