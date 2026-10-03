'use client'

import { useState } from 'react'
import type { ChartData } from '@/types/grading'
import { TYPE_LABELS, validateQuestion } from '@/lib/questions'
import Task1VisualRenderer from './Task1VisualRenderer'
import {
  Shuffle,
  BookOpen,
  Tag,
  Loader2,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

interface QuestionCardProps {
  question: string
  type?: string
  topic?: string
  isMock?: boolean
  chartData?: ChartData | null
  taskType: 'task1' | 'task2'
  isLoading: boolean
  onShuffle: () => void
  onSetCustomQuestion: (formattedQuestion: string) => void
  disabled?: boolean
}

const TYPE_COLORS: Record<string, string> = {
  agree_disagree:           'text-violet-300 bg-violet-500/10 border-violet-500/25',
  discuss_both:             'text-sky-300    bg-sky-500/10    border-sky-500/25',
  problem_solution:         'text-rose-300   bg-rose-500/10   border-rose-500/25',
  advantages_disadvantages: 'text-amber-300  bg-amber-500/10  border-amber-500/25',
  two_part:                 'text-teal-300   bg-teal-500/10   border-teal-500/25',
}

export default function QuestionCard({
  question,
  type,
  topic,
  isMock,
  chartData,
  taskType,
  isLoading,
  onShuffle,
  onSetCustomQuestion,
  disabled,
}: QuestionCardProps) {
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null)

  const handleValidateCustom = async () => {
    if (!customInput.trim()) return
    setValidating(true)
    setValidationError(null)
    setValidationSuccess(null)

    try {
      const res = await validateQuestion(customInput, taskType)
      if (res.is_valid) {
        setValidationSuccess(res.feedback || 'Question validated successfully!')
        setTimeout(() => {
          onSetCustomQuestion(res.formatted_question)
          setShowCustomModal(false)
          setCustomInput('')
          setValidationSuccess(null)
        }, 1200)
      } else {
        setValidationError(res.feedback || 'This question does not match official IELTS guidelines.')
      }
    } catch (err: any) {
      setValidationError(err.message || 'Validation request failed. Please check your connection.')
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="glass rounded-3xl p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <BookOpen size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-semibold text-white text-base">
              {taskType === 'task1' ? 'Task 1 Academic Visual Prompt' : 'Task 2 Essay Question'}
            </h2>
            <p className="text-slate-500 text-xs">
              {taskType === 'task1'
                ? 'Official Cambridge format · Data interpretation'
                : 'Official Cambridge format · Discursive essay'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Custom Question Toggle (Only available for Task 2 discursive essays) */}
          {taskType === 'task2' && (
            <button
              onClick={() => setShowCustomModal(true)}
              disabled={disabled || isLoading}
              className={clsx(
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all flex-shrink-0',
                'text-slate-400 border-white/8 hover:text-white hover:bg-white/5 hover:border-white/15',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              title="Type or paste your own Task 2 question"
            >
              <Edit3 size={13} className="text-brand-400" />
              Use my own question
            </button>
          )}

          {/* Shuffle / New AI question button */}
          <button
            onClick={onShuffle}
            disabled={disabled || isLoading}
            title="Generate a different AI question"
            className={clsx(
              'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all flex-shrink-0',
              'text-slate-400 border-white/8 hover:text-white hover:bg-white/5 hover:border-white/15',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Shuffle size={13} />}
            {isLoading ? 'Generating…' : 'New prompt'}
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <div className="flex gap-2">
            <div className="h-6 w-32 rounded-full bg-white/5" />
            <div className="h-6 w-24 rounded-full bg-white/5" />
          </div>
          <div className="pl-4 border-l-2 border-brand-500/20 space-y-2">
            <div className="h-4 bg-white/5 rounded-lg w-full" />
            <div className="h-4 bg-white/5 rounded-lg w-5/6" />
            <div className="h-4 bg-white/5 rounded-lg w-4/6" />
          </div>
        </div>
      )}

      {/* Content */}
      {!isLoading && question && (
        <div className="space-y-5">
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {type && (
              <span className={clsx(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                TYPE_COLORS[type] ?? TYPE_COLORS.agree_disagree,
              )}>
                <Tag size={10} />
                {TYPE_LABELS[type as keyof typeof TYPE_LABELS] ?? type}
              </span>
            )}
            {topic && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-white/8 text-slate-400 bg-white/[0.03] capitalize">
                {topic}
              </span>
            )}
            {isMock && (
              <span className="px-2.5 py-1 rounded-full text-xs font-medium border border-amber-500/25 text-amber-400 bg-amber-500/8">
                mock
              </span>
            )}
          </div>

          {/* Visual Chart if Task 1 */}
          {taskType === 'task1' && chartData && (
            <Task1VisualRenderer chartData={chartData} question={question} />
          )}

          {/* Question Text */}
          <div className="pl-4 border-l-2 border-brand-500/40">
            <p className="text-slate-200 text-sm sm:text-base leading-8 font-light whitespace-pre-line">
              {question}
            </p>
          </div>
        </div>
      )}

      {/* Tip footer */}
      <p className="text-slate-500 text-xs flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0" />
        {taskType === 'task1'
          ? 'Task 1 requires at least 150 words · Recommend ~20 minutes'
          : 'Task 2 requires at least 250 words · Recommend ~40 minutes'}
      </p>

      {/* Custom Question Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-up"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="relative glass-strong rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center text-brand-400">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-white text-base">
                  Use Your Own Task 2 Question
                </h3>
                <p className="text-slate-400 text-xs">
                  Validated against official Cambridge IELTS criteria
                </p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed mb-4">
              Enter your practice essay prompt below. Our AI examiner will verify that it represents a valid
              academic question and format it with official Cambridge test rubrics.
            </p>

            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="e.g. Some people think that universities should provide graduates with the knowledge and skills needed in the workplace. Others think that the true function of a university should be to give access to knowledge for its own sake..."
              rows={5}
              className="w-full resize-none rounded-2xl bg-white/[0.04] border border-white/10 text-slate-200 placeholder-slate-600 text-xs sm:text-sm p-4 focus:border-brand-500/50 focus:bg-white/[0.06] transition-all mb-3"
            />

            {validationError && (
              <div className="flex items-start gap-2 text-rose-400 text-xs bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 mb-4">
                <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {validationSuccess && (
              <div className="flex items-start gap-2 text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4">
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0" />
                <span>{validationSuccess}</span>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleValidateCustom}
                disabled={validating || !customInput.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 text-white text-xs font-semibold hover:from-brand-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    Validating…
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} />
                    Validate & Use Question
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
