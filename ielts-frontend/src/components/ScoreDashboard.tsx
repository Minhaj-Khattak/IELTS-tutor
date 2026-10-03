'use client'

import React, { useState } from 'react'
import type { GradingResult } from '@/types/grading'
import ModelAnswer from './ModelAnswer'
import {
  Award,
  Target,
  Link2,
  BookOpen,
  AlignLeft,
  ArrowRight,
  RotateCcw,
  TrendingUp,
  MessageSquare,
  HelpCircle,
  BarChart3,
  PenTool,
} from 'lucide-react'
import clsx from 'clsx'

interface ScoreDashboardProps {
  task1Result?: GradingResult | null
  task2Result?: GradingResult | null
  task1Prompt?: string
  task2Prompt?: string
  task1Words?: number
  task2Words?: number
  result?: GradingResult // backward compatibility
  onReset: () => void
  taskTitle?: string
}

const BAND_COLOR = (band: number) => {
  if (band >= 8) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', ring: '#10b981' }
  if (band >= 7) return { text: 'text-sky-400',     bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     ring: '#0ea5e9' }
  if (band >= 6) return { text: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   ring: '#f59e0b' }
  return              { text: 'text-rose-400',    bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    ring: '#f43f5e' }
}

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  grammar:          { label: 'Grammar',        icon: <AlignLeft size={12} />,  color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  vocabulary:       { label: 'Vocabulary',     icon: <BookOpen size={12} />,   color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  coherence:        { label: 'Coherence',      icon: <Link2 size={12} />,      color: 'text-teal-400 bg-teal-500/10 border-teal-500/30' },
  task_achievement: { label: 'Task Ach.',      icon: <Target size={12} />,     color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
}

const SUB_SCORE_META = [
  { key: 'task_achievement',               label: 'Task Achievement / Response',   icon: <Target size={16} />,   desc: 'Addresses all task requirements' },
  { key: 'coherence_and_cohesion',         label: 'Coherence & Cohesion',          icon: <Link2 size={16} />,    desc: 'Logical structure and linking devices' },
  { key: 'lexical_resource',               label: 'Lexical Resource',              icon: <BookOpen size={16} />, desc: 'Vocabulary range and precision' },
  { key: 'grammatical_range_and_accuracy', label: 'Grammatical Range & Accuracy',  icon: <AlignLeft size={16} />,desc: 'Sentence structures and accuracy' },
] as const

function roundIELTS(raw: number): number {
  const integerPart = Math.floor(raw)
  const frac = raw - integerPart
  if (frac < 0.25) return integerPart
  if (frac < 0.75) return integerPart + 0.5
  return integerPart + 1.0
}

function BandGauge({ band, size = 'lg' }: { band: number; size?: 'sm' | 'lg' }) {
  const pct = Math.min(100, (band / 9) * 100)
  const col = BAND_COLOR(band)
  const dim = size === 'lg' ? 'w-36 h-36' : 'w-20 h-20'
  const txtSize = size === 'lg' ? 'text-4xl' : 'text-xl'

  return (
    <div
      className={clsx('relative rounded-full flex items-center justify-center band-ring glass-strong', dim)}
      style={{ '--band-pct': pct, '--ring-color': col.ring } as React.CSSProperties}
    >
      <div className="text-center">
        <div className={clsx('font-display font-bold leading-none', txtSize, col.text)}>
          {band.toFixed(1)}
        </div>
        {size === 'lg' && (
          <div className="text-slate-500 text-xs mt-1 font-medium">/ 9.0</div>
        )}
      </div>
    </div>
  )
}

function BandLabel({ band }: { band: number }) {
  const labels: Record<number, string> = {
    9: 'Expert User',
    8: 'Very Good User',
    7: 'Good User',
    6: 'Competent User',
    5: 'Modest User',
    4: 'Limited User',
    0: 'Unattempted',
  }
  const rounded = Math.round(band)
  return (
    <span className={clsx('text-sm font-medium', BAND_COLOR(band).text)}>
      {labels[rounded] ?? 'Limited User'}
    </span>
  )
}

export default function ScoreDashboard({
  task1Result,
  task2Result,
  task1Prompt = '',
  task2Prompt = '',
  task1Words = 0,
  task2Words = 0,
  result,
  onReset,
  taskTitle,
}: ScoreDashboardProps) {
  // If single result provided (fallback)
  const t1 = task1Result ?? null
  const t2 = task2Result ?? (result ?? null)

  const hasBoth = Boolean(t1 && t2)
  const [selectedTaskTab, setSelectedTaskTab] = useState<'task1' | 'task2'>(
    t2 && task2Words > 0 ? 'task2' : 'task1'
  )

  // Calculate Combined Band
  let combinedBand = 0
  let combinedExplanation = ''

  if (t1 && t2) {
    if (task1Words > 0 && task2Words > 0) {
      // Official IELTS weighting: (Task 1 * 1 + Task 2 * 2) / 3
      const raw = (t1.overall_band * 1 + t2.overall_band * 2) / 3
      combinedBand = roundIELTS(raw)
      combinedExplanation = 'Official Cambridge weighting: Task 1 carries 1/3 weight, Task 2 carries 2/3 weight.'
    } else if (task2Words > 0 && task1Words === 0) {
      combinedBand = t2.overall_band
      combinedExplanation = 'Calculated from Task 2 only (Task 1 was skipped).'
    } else if (task1Words > 0 && task2Words === 0) {
      combinedBand = t1.overall_band
      combinedExplanation = 'Calculated from Task 1 only (Task 2 was skipped).'
    } else {
      combinedBand = 0
      combinedExplanation = 'Neither task was attempted.'
    }
  } else if (result) {
    combinedBand = result.overall_band
    combinedExplanation = 'Single task assessment.'
  }

  const activeResult = selectedTaskTab === 'task1' ? (t1 ?? result) : (t2 ?? result)
  const activePrompt = selectedTaskTab === 'task1' ? task1Prompt : task2Prompt

  if (!activeResult) return null

  return (
    <div className="space-y-8 animate-fade-up">
      {/* ── Results Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <TrendingUp size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="font-display font-bold text-white text-lg">
              {hasBoth ? 'IELTS Academic Writing Test Results' : (taskTitle ?? 'Your Assessment')}
            </h2>
            <p className="text-slate-500 text-xs">Official Cambridge IELTS Assessment Standards</p>
          </div>
        </div>

        {/* Take another test button */}
        <button
          id="take-another-test-btn"
          onClick={onReset}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white transition-all px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-400 hover:to-purple-500 shadow-md shadow-brand-500/20 active:scale-95"
        >
          <RotateCcw size={14} className="text-white" />
          Take another test
        </button>
      </div>

      {/* ── Combined Overall Band Card (Requirement 11) ── */}
      {hasBoth && (
        <div className="glass rounded-3xl p-6 sm:p-8 border border-brand-500/30 glow-brand">
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="flex flex-col items-center gap-3 flex-shrink-0">
              <BandGauge band={combinedBand} size="lg" />
              <div className="text-center">
                <div className="text-white font-semibold text-sm">Combined Overall Band</div>
                <BandLabel band={combinedBand} />
              </div>
            </div>

            <div className="flex-1 space-y-3 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border border-brand-500/30 text-brand-300 bg-brand-500/10">
                <Award size={13} />
                Official IELTS Composite Score
              </div>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-white">
                Band {combinedBand.toFixed(1)} — <BandLabel band={combinedBand} />
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-light">
                {combinedExplanation}
              </p>

              {/* Sub-task band score indicators */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8 text-center sm:text-left">
                  <div className="text-slate-400 text-xs flex items-center justify-center sm:justify-start gap-1.5">
                    <BarChart3 size={13} className="text-brand-400" />
                    Task 1 (1/3 Weight)
                  </div>
                  <div className="text-white font-display font-bold text-lg mt-0.5">
                    {t1 ? `Band ${t1.overall_band.toFixed(1)}` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500">{task1Words} words written</div>
                </div>

                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/8 text-center sm:text-left">
                  <div className="text-slate-400 text-xs flex items-center justify-center sm:justify-start gap-1.5">
                    <PenTool size={13} className="text-brand-400" />
                    Task 2 (2/3 Weight)
                  </div>
                  <div className="text-white font-display font-bold text-lg mt-0.5">
                    {t2 ? `Band ${t2.overall_band.toFixed(1)}` : '—'}
                  </div>
                  <div className="text-[11px] text-slate-500">{task2Words} words written</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Breakdown Selector (when both tasks present) ── */}
      {hasBoth && (
        <div className="flex p-1 rounded-2xl glass border border-white/8 gap-2">
          <button
            onClick={() => setSelectedTaskTab('task1')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all',
              selectedTaskTab === 'task1'
                ? 'bg-brand-500/20 text-white border border-brand-500/30 shadow-lg glow-brand-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            )}
          >
            <BarChart3 size={16} className={selectedTaskTab === 'task1' ? 'text-brand-400' : 'text-slate-500'} />
            <span>Task 1 Detailed Assessment</span>
            {t1 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-300">
                Band {t1.overall_band.toFixed(1)}
              </span>
            )}
          </button>

          <button
            onClick={() => setSelectedTaskTab('task2')}
            className={clsx(
              'flex-1 py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-all',
              selectedTaskTab === 'task2'
                ? 'bg-brand-500/20 text-white border border-brand-500/30 shadow-lg glow-brand-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
            )}
          >
            <PenTool size={16} className={selectedTaskTab === 'task2' ? 'text-brand-400' : 'text-slate-500'} />
            <span>Task 2 Detailed Assessment</span>
            {t2 && (
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-brand-300">
                Band {t2.overall_band.toFixed(1)}
              </span>
            )}
          </button>
        </div>
      )}

      {/* ── Active Task Examiner Summary ── */}
      <div className="glass rounded-3xl p-6 sm:p-8 space-y-4 glow-brand-sm">
        <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <MessageSquare size={16} className="text-brand-400" />
          Examiner Assessment &amp; Diagnostic Summary (
          {selectedTaskTab === 'task1' ? 'Task 1 Academic' : 'Task 2 Essay'})
        </div>
        <p className="text-slate-200 text-sm sm:text-base leading-7 italic border-l-2 border-brand-500/50 pl-4 font-light">
          &ldquo;{activeResult.examiner_summary}&rdquo;
        </p>
      </div>

      {/* ── Sub-scores Grid with Criterion Reasoning (Phase 5) ── */}
      <div>
        <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-brand-500 rounded-full" />
          Criterion Scores &amp; 2–4 Sentence Reasoning
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SUB_SCORE_META.map(({ key, label, icon, desc }, i) => {
            const val = activeResult.sub_scores[key]
            const score: number = typeof val === 'object' && val !== null ? val.score : (val as number)
            const reason: string = typeof val === 'object' && val !== null ? val.reason : ''
            const col = BAND_COLOR(score)
            const pct = Math.min(100, (score / 9) * 100)

            return (
              <div
                key={key}
                className={clsx(
                  'glass rounded-2xl p-5 space-y-4 transition-all duration-300 hover:glass-strong',
                  'animate-fade-up',
                )}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', col.bg)}>
                      <span className={col.text}>{icon}</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold">{label}</div>
                      <div className="text-slate-500 text-xs">{desc}</div>
                    </div>
                  </div>
                  <div className={clsx('font-display font-bold text-xl', col.text)}>
                    {score.toFixed(1)}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${pct}%`,
                        background: `linear-gradient(90deg, ${col.ring}88, ${col.ring})`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>0</span>
                    <BandLabel band={score} />
                    <span>9</span>
                  </div>
                </div>

                {/* Criterion Reasoning Box */}
                {reason && (
                  <div className="bg-white/5 border border-white/10 text-slate-300 text-xs sm:text-sm p-3 rounded-lg leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-brand-300 font-medium">
                      <HelpCircle size={12} />
                      Official Descriptors &amp; Evidence:
                    </div>
                    <p className="text-slate-300 font-light">{reason}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Line-by-Line Corrections ── */}
      {activeResult.line_by_line_corrections && activeResult.line_by_line_corrections.length > 0 && (
        <div>
          <h3 className="font-display font-semibold text-white text-base mb-4 flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
            Line-by-Line Corrections
            <span className="ml-auto text-xs text-slate-500 font-normal">
              {activeResult.line_by_line_corrections.length} suggestions
            </span>
          </h3>

          <div className="space-y-4">
            {activeResult.line_by_line_corrections.map((item, idx) => {
              const catMeta = CATEGORY_META[item.category] ?? CATEGORY_META.grammar
              return (
                <div
                  key={idx}
                  className={clsx(
                    'glass rounded-2xl p-5 space-y-4 animate-fade-up',
                    'hover:glass-strong transition-all duration-300',
                  )}
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 text-xs font-mono">#{String(idx + 1).padStart(2, '0')}</span>
                    <span className={clsx(
                      'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                      catMeta.color,
                    )}>
                      {catMeta.icon}
                      {catMeta.label}
                    </span>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">Candidate Text</div>
                      <div className="rounded-xl bg-rose-500/8 border border-rose-500/15 p-3 text-xs sm:text-sm text-slate-300 leading-6 italic">
                        &ldquo;{item.original}&rdquo;
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <ArrowRight size={10} className="text-emerald-500" />
                        <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Academic Revision</div>
                      </div>
                      <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/15 p-3 text-xs sm:text-sm text-slate-200 leading-6">
                        {item.corrected}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-3">
                    <p className="text-xs text-slate-400 leading-5">
                      <span className="font-medium text-slate-300">Why: </span>
                      {item.explanation}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Band 9 Model Answer ── */}
      {activeResult.model_answer && (
        <ModelAnswer answer={activeResult.model_answer} question={activePrompt} />
      )}

      {/* ── Bottom Call To Action: Take another test ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 glass rounded-3xl border border-white/10 mt-6 glow-brand-sm">
        <div>
          <h4 className="font-display font-semibold text-white text-base">Ready for your next IELTS simulation?</h4>
          <p className="text-slate-400 text-xs mt-0.5">Reset the 60-minute test with brand new Cambridge Academic tasks.</p>
        </div>
        <button
          id="bottom-take-another-test-btn"
          onClick={onReset}
          className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-white transition-all px-6 py-3 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-400 hover:to-purple-500 shadow-lg shadow-brand-500/25 active:scale-95 flex-shrink-0"
        >
          <RotateCcw size={15} className="text-white" />
          Take another test
        </button>
      </div>
    </div>
  )
}
