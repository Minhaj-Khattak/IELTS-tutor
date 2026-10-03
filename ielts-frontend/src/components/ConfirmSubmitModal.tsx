'use client'

import { useEffect, useRef } from 'react'
import { AlertTriangle, Send, X, BarChart3, PenTool } from 'lucide-react'

interface ConfirmSubmitModalProps {
  isOpen: boolean
  task1Words: number
  task2Words: number
  isTimesUp?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmSubmitModal({
  isOpen,
  task1Words,
  task2Words,
  isTimesUp = false,
  onConfirm,
  onCancel,
}: ConfirmSubmitModalProps) {
  const confirmRef = useRef<HTMLButtonElement>(null)

  // Focus confirm button when modal opens
  useEffect(() => {
    if (isOpen) confirmRef.current?.focus()
  }, [isOpen])

  // Close on Escape, submit on Enter
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
      if (e.key === 'Enter') onConfirm()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onCancel, onConfirm])

  if (!isOpen) return null

  const totalWords = task1Words + task2Words

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      {/* Blur overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal panel */}
      <div
        className="relative glass-strong rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl animate-fade-up border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        {!isTimesUp && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/5"
          >
            <X size={16} />
          </button>
        )}

        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
            isTimesUp ? 'bg-rose-500/20' : 'bg-brand-500/20'
          }`}>
            {isTimesUp
              ? <AlertTriangle size={26} className="text-rose-400" />
              : <Send size={26} className="text-brand-400" />
            }
          </div>
        </div>

        {/* Copy */}
        <div className="text-center space-y-3 mb-6">
          <h3 className="font-display font-bold text-white text-xl">
            {isTimesUp ? "Time's Up!" : 'Submit Complete Writing Test?'}
          </h3>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed font-light">
            {isTimesUp
              ? "Your 60-minute examination period has concluded. Both tasks will now be submitted to the AI examiner for evaluation."
              : "This single test submission includes both Task 1 and Task 2. Both parts will be evaluated according to official Cambridge band criteria."}
          </p>
        </div>

        {/* Task Summary Badges */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Task 1 Card */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <BarChart3 size={13} className="text-brand-400" />
              Task 1 (Visual)
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-bold font-mono ${task1Words >= 150 ? 'text-emerald-400' : task1Words > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {task1Words}
              </span>
              <span className="text-[11px] text-slate-500">/ 150w min</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {task1Words === 0 ? '⚪ Skipped (0 words)' : task1Words < 150 ? '⚠️ Below length' : '✓ Length met'}
            </div>
          </div>

          {/* Task 2 Card */}
          <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/8 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
              <PenTool size={13} className="text-brand-400" />
              Task 2 (Essay)
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-bold font-mono ${task2Words >= 250 ? 'text-emerald-400' : task2Words > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {task2Words}
              </span>
              <span className="text-[11px] text-slate-500">/ 250w min</span>
            </div>
            <div className="text-[11px] text-slate-500">
              {task2Words === 0 ? '⚪ Skipped (0 words)' : task2Words < 250 ? '⚠️ Below length' : '✓ Length met'}
            </div>
          </div>
        </div>

        {/* Note if one task skipped */}
        {(task1Words === 0 || task2Words === 0) && (
          <p className="text-[12px] text-brand-300 bg-brand-500/10 border border-brand-500/20 rounded-xl p-2.5 text-center mb-6">
            💡 <strong>Practicing one part only:</strong> Tasks with 0 words will be treated as skipped, allowing you to focus on your attempted task.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isTimesUp && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all text-xs sm:text-sm font-medium"
            >
              Keep editing
            </button>
          )}
          <button
            ref={confirmRef}
            onClick={onConfirm}
            className={`flex-1 py-3 rounded-2xl font-semibold text-xs sm:text-sm text-white transition-all
              hover:scale-[1.02] active:scale-[0.98]
              ${isTimesUp
                ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400'
                : 'bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-400 hover:to-purple-500'
              }`}
          >
            {isTimesUp ? 'Submit Exam' : 'Submit Complete Exam'}
          </button>
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          {isTimesUp ? '' : 'Press Enter to confirm · Esc to cancel'}
        </p>
      </div>
    </div>
  )
}
