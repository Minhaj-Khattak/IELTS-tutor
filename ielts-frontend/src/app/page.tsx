'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { GradingResult, GradingState, Task1Question } from '@/types/grading'
import type { IELTSQuestion } from '@/lib/questions'
import { fetchQuestion, fetchTask1Question } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'
import EssayInput from '@/components/EssayInput'
import ExamTimer from '@/components/ExamTimer'
import ConfirmSubmitModal from '@/components/ConfirmSubmitModal'
import ScoreDashboard from '@/components/ScoreDashboard'
import LoadingState from '@/components/LoadingState'
import ErrorBanner from '@/components/ErrorBanner'
import { Clock, BarChart3, PenTool, Sparkles, RotateCcw } from 'lucide-react'
import clsx from 'clsx'

const EXAM_DURATION = 60 * 60 // 3600 seconds = 60 mins

export default function HomePage() {
  // Active Tab
  const [activeTab, setActiveTab] = useState<'task1' | 'task2'>('task2')

  // Task 1 State
  const [task1Question, setTask1Question] = useState<Task1Question | null>(null)
  const [task1Loading, setTask1Loading] = useState(true)
  const [task1Essay, setTask1Essay] = useState('')
  const [task1State, setTask1State] = useState<GradingState>({ status: 'idle' })

  // Task 2 State
  const [task2Question, setTask2Question] = useState<IELTSQuestion | null>(null)
  const [task2Loading, setTask2Loading] = useState(true)
  const [task2Essay, setTask2Essay] = useState('')
  const [task2State, setTask2State] = useState<GradingState>({ status: 'idle' })

  // Global Exam State
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [examSubmitted, setExamSubmitted] = useState(false)

  // Timer & Modal State
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timesUp, setTimesUp] = useState(false)
  const hasAutoSubmitted = useRef(false)

  const task1WordCount = task1Essay.trim() ? task1Essay.trim().split(/\s+/).length : 0
  const task2WordCount = task2Essay.trim() ? task2Essay.trim().split(/\s+/).length : 0
  const totalWords = task1WordCount + task2WordCount

  // ── Load Questions ────────────────────────────────────────────────────────
  const loadTask1 = useCallback(async () => {
    setTask1Loading(true)
    try {
      const q = await fetchTask1Question()
      setTask1Question(q)
    } catch {
      setTask1Question(null)
    } finally {
      setTask1Loading(false)
    }
  }, [])

  const loadTask2 = useCallback(async () => {
    setTask2Loading(true)
    try {
      const q = await fetchQuestion()
      setTask2Question(q)
    } catch {
      setTask2Question(null)
    } finally {
      setTask2Loading(false)
    }
  }, [])

  useEffect(() => {
    loadTask1()
    loadTask2()
  }, [loadTask1, loadTask2])

  // ── Shuffle Prompt Handlers (Resets 60-min timer and clears essay for fresh attempt) ──
  const handleShuffleTask1 = useCallback(() => {
    setTimerStarted(false)
    setTimesUp(false)
    hasAutoSubmitted.current = false
    setTimerKey((k) => k + 1)
    setTask1Essay('')
    loadTask1()
  }, [loadTask1])

  const handleShuffleTask2 = useCallback(() => {
    setTimerStarted(false)
    setTimesUp(false)
    hasAutoSubmitted.current = false
    setTimerKey((k) => k + 1)
    setTask2Essay('')
    loadTask2()
  }, [loadTask2])

  // ── Essay Input Handlers ──────────────────────────────────────────────────
  const handleEssayChange = (val: string) => {
    if (!timerStarted && val.length > 0) {
      setTimerStarted(true)
    }
    if (activeTab === 'task1') {
      setTask1Essay(val)
    } else {
      setTask2Essay(val)
    }
  }

  // ── Submit Entire Exam (Both Tasks Together) ──────────────────────────────
  const runGradeExam = useCallback(async () => {
    setIsEvaluating(true)
    setEvalError(null)
    setShowConfirm(false)

    try {
      // Grade Task 1 & Task 2 concurrently
      const [t1Res, t2Res] = await Promise.all([
        fetch('/api/grade-task1', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_text: task1Essay,
            question: task1Question?.prompt ?? '',
            chart_data: task1Question?.chart_data ?? {
              chart_type: 'bar',
              title: 'Task 1 Visual',
              categories: [],
              series: [],
            },
          }),
        }),
        fetch('/api/grade', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            essay_text: task2Essay,
            question: task2Question?.question ?? '',
          }),
        }),
      ])

      if (!t1Res.ok) {
        const err1 = await t1Res.json().catch(() => ({ message: 'Task 1 grading failed' }))
        throw new Error(err1.message || `Task 1 error: ${t1Res.status}`)
      }
      if (!t2Res.ok) {
        const err2 = await t2Res.json().catch(() => ({ message: 'Task 2 grading failed' }))
        throw new Error(err2.message || `Task 2 error: ${t2Res.status}`)
      }

      const t1Data: GradingResult = await t1Res.json()
      const t2Data: GradingResult = await t2Res.json()

      setTask1State({ status: 'success', data: t1Data })
      setTask2State({ status: 'success', data: t2Data })
      setExamSubmitted(true)
    } catch (err: any) {
      setEvalError(err.message || 'Assessment service temporarily unavailable. Please try again.')
    } finally {
      setIsEvaluating(false)
    }
  }, [task1Essay, task1Question, task2Essay, task2Question])

  // ── Global 60-min Timer Expiry ────────────────────────────────────────────
  const handleTimerExpire = useCallback(() => {
    if (hasAutoSubmitted.current) return
    hasAutoSubmitted.current = true
    setTimesUp(true)
    setShowConfirm(true)
  }, [])

  // ── Manual Submit Click ───────────────────────────────────────────────────
  const handleSubmitClick = () => {
    setTimesUp(false)
    setShowConfirm(true)
  }

  // ── Full Exam Reset (Take another test) ───────────────────────────────────
  const handleResetExam = () => {
    // Reset timer completely
    setTimerStarted(false)
    setTimesUp(false)
    hasAutoSubmitted.current = false
    setTimerKey((k) => k + 1)

    // Reset essays and evaluation states
    setTask1Essay('')
    setTask2Essay('')
    setTask1State({ status: 'idle' })
    setTask2State({ status: 'idle' })
    setExamSubmitted(false)
    setEvalError(null)

    // Load fresh questions for both tasks
    loadTask1()
    loadTask2()
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      {/* Confirmation Modal */}
      <ConfirmSubmitModal
        isOpen={showConfirm}
        task1Words={task1WordCount}
        task2Words={task2WordCount}
        isTimesUp={timesUp}
        onConfirm={runGradeExam}
        onCancel={() => {
          setShowConfirm(false)
          setTimesUp(false)
        }}
      />

      <div className="relative z-10">
        {/* ── Header ── */}
        <header className="border-b border-white/5 glass sticky top-0 z-50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm glow-brand-sm">
                IE
              </div>
              <span className="font-display font-bold text-lg tracking-tight text-white">
                IELTS<span className="gradient-text">AI</span>
                <span className="ml-2 text-xs font-mono font-normal text-brand-300 px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">
                  Academic Exam
                </span>
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Cambridge Band Descriptors
              </span>
              {!examSubmitted && (
                <button
                  id="header-reset-test-btn"
                  onClick={handleResetExam}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all font-medium"
                  title="Restart test and timer with fresh prompts"
                >
                  <RotateCcw size={13} className="text-brand-400" />
                  Take another test
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          {/* ── Hero (visible when test has not been submitted and typing has not started) ── */}
          {!timerStarted && !examSubmitted && (
            <section className="text-center space-y-3 pt-2 animate-fade-up">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-brand-300 border border-brand-500/20">
                <Sparkles size={12} className="text-brand-400" />
                IELTS Academic Writing Simulation · 60-Minute Combined Test
              </div>
              <h1 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight tracking-tight">
                Authentic IELTS <span className="gradient-text">Writing Examiner</span>
              </h1>
              <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed font-light">
                Complete Task 1 visual data analysis and Task 2 discursive essay under official test timing.
                Receive strict band assessment with 2–4 sentence criterion reasoning.
              </p>
            </section>
          )}

          {/* ── Persistent Advisory Banner (Always visible during exam) ── */}
          {!examSubmitted && (
            <div className="glass rounded-2xl px-5 py-3.5 flex items-center justify-between border border-brand-500/20 bg-brand-500/5 glow-brand-sm">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-200">
                <Clock size={16} className="text-brand-400 flex-shrink-0" />
                <span>
                  <strong className="text-white font-semibold">Exam Timing Strategy:</strong> ~20 mins on Task 1 (150 words), ~40 mins on Task 2 (250 words). Task 2 carries double the marks.
                </span>
              </div>
            </div>
          )}

          {/* ── Combined 60-Minute Exam Timer (Always visible during exam, starts on keystroke) ── */}
          {!examSubmitted && (
            <ExamTimer
              key={timerKey}
              durationSeconds={EXAM_DURATION}
              onExpire={handleTimerExpire}
              disabled={isEvaluating}
              isRunning={timerStarted}
            />
          )}

          {/* ── Evaluation Loading State ── */}
          {isEvaluating && <LoadingState />}

          {/* ── Evaluation Error Banner ── */}
          {evalError && (
            <ErrorBanner
              message={evalError}
              onDismiss={() => setEvalError(null)}
            />
          )}

          {/* ── Results View: Combined Score at the Top & Detailed Task Breakdown ── */}
          {examSubmitted && task1State.status === 'success' && task2State.status === 'success' && (
            <ScoreDashboard
              task1Result={task1State.data}
              task2Result={task2State.data}
              task1Prompt={task1Question?.prompt ?? ''}
              task2Prompt={task2Question?.question ?? ''}
              task1Words={task1WordCount}
              task2Words={task2WordCount}
              onReset={handleResetExam}
            />
          )}

          {/* ── Active Test Taking View (Before submission) ── */}
          {!examSubmitted && !isEvaluating && (
            <>
              {/* Task Switcher Tabs */}
              <div className="flex p-1 rounded-2xl glass border border-white/8 gap-1.5">
                <button
                  onClick={() => setActiveTab('task1')}
                  className={clsx(
                    'flex-1 py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all',
                    activeTab === 'task1'
                      ? 'bg-brand-500/20 text-white border border-brand-500/30 shadow-lg glow-brand-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                  )}
                >
                  <BarChart3 size={16} className={activeTab === 'task1' ? 'text-brand-400' : 'text-slate-500'} />
                  <span>Task 1: Academic Visual</span>
                  <span className={clsx(
                    'text-xs font-mono px-2 py-0.5 rounded-full border',
                    task1WordCount >= 150
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : task1WordCount > 0
                      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                      : 'text-slate-500 border-white/10 bg-white/5',
                  )}>
                    {task1WordCount} / 150w
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('task2')}
                  className={clsx(
                    'flex-1 py-3 px-4 rounded-xl font-medium text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all',
                    activeTab === 'task2'
                      ? 'bg-brand-500/20 text-white border border-brand-500/30 shadow-lg glow-brand-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/5',
                  )}
                >
                  <PenTool size={16} className={activeTab === 'task2' ? 'text-brand-400' : 'text-slate-500'} />
                  <span>Task 2: Essay</span>
                  <span className={clsx(
                    'text-xs font-mono px-2 py-0.5 rounded-full border',
                    task2WordCount >= 250
                      ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                      : task2WordCount > 0
                      ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                      : 'text-slate-500 border-white/10 bg-white/5',
                  )}>
                    {task2WordCount} / 250w
                  </span>
                </button>
              </div>

              {/* Task 1 Panel */}
              {activeTab === 'task1' && (
                <div className="space-y-6">
                  <QuestionCard
                    question={task1Question?.prompt ?? ''}
                    chartData={task1Question?.chart_data ?? null}
                    taskType="task1"
                    isMock={task1Question?.is_mock}
                    isLoading={task1Loading}
                    onShuffle={handleShuffleTask1}
                    onSetCustomQuestion={(q) => {
                      if (task1Question) {
                        setTask1Question({ ...task1Question, prompt: q })
                      }
                    }}
                    disabled={isEvaluating}
                  />

                  <EssayInput
                    value={task1Essay}
                    onChange={handleEssayChange}
                    onGrade={handleSubmitClick}
                    isLoading={isEvaluating}
                    disabled={task1Loading}
                    canSubmit={totalWords > 0}
                    taskType="task1"
                  />
                </div>
              )}

              {/* Task 2 Panel */}
              {activeTab === 'task2' && (
                <div className="space-y-6">
                  <QuestionCard
                    question={task2Question?.question ?? ''}
                    type={task2Question?.type}
                    topic={task2Question?.topic}
                    isMock={task2Question?.is_mock}
                    taskType="task2"
                    isLoading={task2Loading}
                    onShuffle={handleShuffleTask2}
                    onSetCustomQuestion={(q) => {
                      if (task2Question) {
                        setTask2Question({ ...task2Question, question: q })
                      }
                    }}
                    disabled={isEvaluating}
                  />

                  <EssayInput
                    value={task2Essay}
                    onChange={handleEssayChange}
                    onGrade={handleSubmitClick}
                    isLoading={isEvaluating}
                    disabled={task2Loading}
                    canSubmit={totalWords > 0}
                    taskType="task2"
                  />
                </div>
              )}
            </>
          )}
        </main>

        <footer className="border-t border-white/5 mt-20 py-8">
          <div className="max-w-5xl mx-auto px-4 text-center text-slate-500 text-xs">
            © 2026 IELTS AI Examiner · Cambridge IELTS Academic Assessment Engine
          </div>
        </footer>
      </div>
    </div>
  )
}
