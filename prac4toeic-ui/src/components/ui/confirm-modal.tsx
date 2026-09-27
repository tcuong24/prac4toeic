import * as React from "react"
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  HelpCircle,
  Loader2,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "./alert-dialog"
import { cn } from "@/lib/utils"

export type ConfirmVariant = "default" | "destructive" | "warning" | "info" | "success"

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: React.ReactNode
  description?: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  children?: React.ReactNode
  closeOnOverlayClick?: boolean
  className?: string
}

const variantStyles: Record<
  ConfirmVariant,
  {
    iconBg: string
    iconColor: string
    defaultIcon: React.ReactNode
    actionClass: string
  }
> = {
  default: {
    iconBg: "bg-slate-100 border-slate-200",
    iconColor: "text-slate-700",
    defaultIcon: <HelpCircle className="w-6 h-6 text-slate-700" />,
    actionClass: "bg-slate-900 hover:bg-slate-800 text-white focus:ring-slate-400",
  },
  destructive: {
    iconBg: "bg-rose-50 border-rose-100",
    iconColor: "text-rose-600",
    defaultIcon: <AlertCircle className="w-6 h-6 text-rose-600" />,
    actionClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20 focus:ring-rose-400",
  },
  warning: {
    iconBg: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600",
    defaultIcon: <AlertTriangle className="w-6 h-6 text-amber-600" />,
    actionClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20 focus:ring-amber-400",
  },
  info: {
    iconBg: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600",
    defaultIcon: <Info className="w-6 h-6 text-blue-600" />,
    actionClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20 focus:ring-blue-400",
  },
  success: {
    iconBg: "bg-emerald-50 border-emerald-100",
    iconColor: "text-emerald-600",
    defaultIcon: <CheckCircle2 className="w-6 h-6 text-emerald-600" />,
    actionClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 focus:ring-emerald-400",
  },
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  variant = "default",
  isLoading = false,
  loadingText,
  icon,
  children,
  closeOnOverlayClick = false,
  className,
}: ConfirmModalProps) {
  const currentVariant = variantStyles[variant] || variantStyles.default
  const displayIcon = icon === undefined ? currentVariant.defaultIcon : icon

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (isLoading) return
    await onConfirm()
  }

  return (
    <AlertDialog open={open} onOpenChange={(val) => !val && !isLoading && onClose()}>
      <AlertDialogContent
        className={cn("max-w-md p-6 sm:p-7", className)}
        closeOnOverlayClick={closeOnOverlayClick && !isLoading}
      >
        <div className="flex items-start gap-4">
          {displayIcon && (
            <div
              className={cn(
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-xs",
                currentVariant.iconBg
              )}
            >
              {displayIcon}
            </div>
          )}

          <div className="flex-1 space-y-1 pt-0.5">
            <AlertDialogHeader className="text-left space-y-1">
              <AlertDialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                {title}
              </AlertDialogTitle>
              {description && (
                <AlertDialogDescription className="text-sm text-slate-500 leading-relaxed">
                  {description}
                </AlertDialogDescription>
              )}
            </AlertDialogHeader>

            {children && <div className="pt-3">{children}</div>}
          </div>
        </div>

        <AlertDialogFooter className="mt-6 pt-3 border-t border-slate-100">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={onClose}
            className="rounded-xl px-4 text-sm font-medium"
          >
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isLoading}
            onClick={handleConfirm}
            className={cn("rounded-xl px-5 text-sm font-medium gap-2", currentVariant.actionClass)}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? loadingText || "Đang xử lý..." : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
