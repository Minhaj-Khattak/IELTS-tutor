'use client'

import { FileText, Sparkles } from 'lucide-react'
import clsx from 'clsx'

interface EssayInputProps {
  value: string
  onChange: (v: string) => void
  onGrade: () => void
  isLoading: boolean
  disabled: boolean
  canSubmit?: boolean
  taskType?: 'task1' | 'task2'
}

export default function EssayInput({
  value,
  onChange,
  onGrade,
  isLoading,
  disabled,
  canSubmit = true,
  taskType = 'task2',
}: EssayInputProps) {
  const minRequired = taskType === 'task1' ? 150 : 250
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0
  const charCount = value.length
  const isGoodLength = wordCount >= minRequired

  const placeholderText =
    taskType === 'task1'
      ? "Begin your Task 1 academic report here…\n\nRemember to:\n• Write an introduction paraphrasing the prompt\n• Provide a clear, comprehensive overview of main trends or features\n• Detail key figures and make relevant comparisons in specific paragraphs\n• Aim for at least 150 words.\n(You may leave this blank if practicing Task 2 only)"
      : "Begin your Task 2 essay here…\n\nRemember to:\n• Introduce the topic with background context and state your thesis\n• Develop body paragraphs with clear arguments and supporting evidence\n• Provide a balanced evaluation and decisive conclusion\n• Aim for at least 250 words.\n(You may leave this blank if practicing Task 1 only)"

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-5 glow-brand-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <FileText size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-base">
              {taskType === 'task1' ? 'Task 1 Response' : 'Task 2 Essay'}
            </h2>
            <p className="text-slate-500 text-xs">
              {taskType === 'task1' ? 'Target: 150+ words · ~20 mins recommended' : 'Target: 250+ words · ~40 mins recommended'}
            </p>
          </div>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          id="essay-textarea"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholderText}
          rows={15}
          className="w-full resize-none rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/12 text-slate-200 placeholder-slate-600 text-sm leading-7 p-5 transition-all duration-300 font-light focus:bg-white/[0.05] disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {/* Word count badge */}
        <div className="absolute bottom-4 right-4 pointer-events-none select-none">
          <span className={clsx(
            'text-xs font-mono px-2.5 py-1 rounded-lg border backdrop-blur-md',
            isGoodLength
              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
              : wordCount > 0
                ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                : 'text-slate-500 bg-slate-800/40 border-white/5',
          )}>
            {wordCount} / {minRequired}+ words
          </span>
        </div>
      </div>

      {/* Length advisory */}
      {wordCount > 0 && !isGoodLength && (
        <p className="text-xs text-amber-400/80">
          IELTS {taskType === 'task1' ? 'Task 1' : 'Task 2'} requires a minimum of {minRequired} words ({minRequired - wordCount} more recommended to avoid penalty).
        </p>
      )}

      {/* Footer: stats + submit button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
        <div className="text-xs text-slate-500 space-x-4">
          <span>{charCount} characters</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 180))} min read</span>
        </div>

        <button
          id="grade-essay-btn"
          onClick={onGrade}
          disabled={disabled || !canSubmit || isLoading}
          className={clsx(
            'group relative flex items-center gap-2.5 px-6 py-3 rounded-2xl font-semibold text-xs sm:text-sm',
            'bg-gradient-to-r from-brand-500 to-purple-600 text-white overflow-hidden',
            'transition-all duration-300',
            'hover:from-brand-400 hover:to-purple-500 hover:scale-[1.02] hover:shadow-lg hover:shadow-brand-500/30',
            'active:scale-[0.98]',
            'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none',
          )}
        >
          <span className="absolute inset-0 shimmer-bg opacity-0 group-hover:opacity-100 transition-opacity" />
          {isLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Assessing Both Tasks…
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Submit
            </>
          )}
        </button>
      </div>
    </div>
  )
}
