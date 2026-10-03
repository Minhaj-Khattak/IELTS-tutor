'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onDismiss: () => void
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="animate-fade-up flex items-start gap-4 rounded-2xl border border-rose-500/20 bg-rose-500/8 p-5">
      <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-rose-500/15 flex items-center justify-center">
        <AlertTriangle size={18} className="text-rose-400" />
      </div>
      <div className="flex-1">
        <div className="text-rose-300 font-semibold text-sm">Grading Failed</div>
        <div className="text-rose-400/80 text-xs mt-0.5 leading-5">{message}</div>
        <div className="text-slate-500 text-xs mt-2">
          Please check your API key and server logs, then try again.
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-slate-500 hover:text-rose-400 transition-colors"
        aria-label="Dismiss error"
      >
        <X size={16} />
      </button>
    </div>
  )
}
