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
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  BrainCircuit,
  CheckCircle2,
  Clock,
  FileText,
  Gauge,
  Headphones,
  LayoutDashboard,
  LogOut,
  Mic,
  PenTool,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import clsx from 'clsx'

const EXAM_DURATION = 60 * 60

type ModuleKey = 'dashboard' | 'writing' | 'speaking' | 'reading' | 'listening' | 'progress' | 'coach'

type UserProfile = {
  name: string
  email: string
  goal: string
  streak: number
}

const defaultUser: UserProfile = {
  name: 'Ava Thompson',
  email: 'ava@ieltsstudio.ai',
  goal: 'Target Band 7.5',
  streak: 9,
}

const moduleCards = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview + next actions' },
  { key: 'writing', label: 'Writing', icon: PenTool, description: 'Task 1 + Task 2 practice' },
  { key: 'speaking', label: 'Speaking', icon: Mic, description: 'Live speaking drills' },
  { key: 'reading', label: 'Reading', icon: BookOpenCheck, description: 'Passages + questions' },
  { key: 'listening', label: 'Listening', icon: Headphones, description: 'Audio + transcript review' },
  { key: 'progress', label: 'Progress', icon: Gauge, description: 'Score trends & insights' },
  { key: 'coach', label: 'AI Coach', icon: BrainCircuit, description: 'Personalized guidance' },
] as const

function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
  accent,
}: {
  title: string
  description: string
  icon: typeof PenTool
  accent: string
}) {
  return (
    <div className="dashboard-card rounded-3xl p-8">
      <div className="flex items-center gap-4 mb-6">
        <div className={clsx('h-12 w-12 rounded-2xl flex items-center justify-center', accent)}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Module</p>
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
        </div>
      </div>

      <p className="text-slate-300 max-w-2xl leading-7">{description}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          'Adaptive practice flow',
          'AI feedback loop',
          'Progress tracking',
        ].map((item) => (
          <div key={item} className="rounded-2xl border border-white/8 bg-white/5 p-4 text-sm text-slate-200">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            {item}
          </div>
        ))}
      </div>
    </div>
  )
}

function WritingStudio() {
  const [activeTab, setActiveTab] = useState<'task1' | 'task2'>('task2')
  const [task1Question, setTask1Question] = useState<Task1Question | null>(null)
  const [task1Loading, setTask1Loading] = useState(true)
  const [task1Essay, setTask1Essay] = useState('')
  const [task1State, setTask1State] = useState<GradingState>({ status: 'idle' })
  const [task2Question, setTask2Question] = useState<IELTSQuestion | null>(null)
  const [task2Loading, setTask2Loading] = useState(true)
  const [task2Essay, setTask2Essay] = useState('')
  const [task2State, setTask2State] = useState<GradingState>({ status: 'idle' })
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [evalError, setEvalError] = useState<string | null>(null)
  const [examSubmitted, setExamSubmitted] = useState(false)
  const [timerStarted, setTimerStarted] = useState(false)
  const [timerKey, setTimerKey] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [timesUp, setTimesUp] = useState(false)
  const hasAutoSubmitted = useRef(false)

  const task1WordCount = task1Essay.trim() ? task1Essay.trim().split(/\s+/).length : 0
  const task2WordCount = task2Essay.trim() ? task2Essay.trim().split(/\s+/).length : 0
  const totalWords = task1WordCount + task2WordCount

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

  const runGradeExam = useCallback(async () => {
    setIsEvaluating(true)
    setEvalError(null)
    setShowConfirm(false)

    try {
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

  const handleTimerExpire = useCallback(() => {
    if (hasAutoSubmitted.current) return
    hasAutoSubmitted.current = true
    setTimesUp(true)
    setShowConfirm(true)
  }, [])

  const handleSubmitClick = () => {
    setTimesUp(false)
    setShowConfirm(true)
  }

  const handleResetExam = () => {
    setTimerStarted(false)
    setTimesUp(false)
    hasAutoSubmitted.current = false
    setTimerKey((k) => k + 1)
    setTask1Essay('')
    setTask2Essay('')
    setTask1State({ status: 'idle' })
    setTask2State({ status: 'idle' })
    setExamSubmitted(false)
    setEvalError(null)
    loadTask1()
    loadTask2()
  }

  return (
    <div className="space-y-6">
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

      {!examSubmitted && (
        <ExamTimer
          key={timerKey}
          durationSeconds={EXAM_DURATION}
          onExpire={handleTimerExpire}
          disabled={isEvaluating}
          isRunning={timerStarted}
        />
      )}

      {isEvaluating && <LoadingState />}

      {evalError && <ErrorBanner message={evalError} onDismiss={() => setEvalError(null)} />}

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

      {!examSubmitted && !isEvaluating && (
        <>
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
    </div>
  )
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentModule, setCurrentModule] = useState<ModuleKey>('dashboard')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authError, setAuthError] = useState('')
  const [form, setForm] = useState({ email: 'ava@ieltsstudio.ai', password: 'demo123' })

  useEffect(() => {
    try {
      const saved = localStorage.getItem('ielts-studio-user')
      if (saved) {
        const parsed = JSON.parse(saved) as UserProfile
        setProfile(parsed)
        setIsAuthenticated(true)
      }
    } catch {
      localStorage.removeItem('ielts-studio-user')
    }
  }, [])

  const saveProfile = (nextProfile: UserProfile) => {
    setProfile(nextProfile)
    setIsAuthenticated(true)
    localStorage.setItem('ielts-studio-user', JSON.stringify(nextProfile))
  }

  const handleSignIn = (event: React.FormEvent) => {
    event.preventDefault()

    if (!form.email.trim() || !form.password.trim()) {
      setAuthError('Enter both your email and password to continue.')
      return
    }

    const safeName = form.email.split('@')[0].replace(/[._-]/g, ' ')
    const nextProfile: UserProfile = {
      name: safeName.charAt(0).toUpperCase() + safeName.slice(1),
      email: form.email,
      goal: 'Target Band 7.5',
      streak: 9,
    }

    saveProfile(nextProfile)
    setAuthError('')
  }

  const handleGuestContinue = () => {
    saveProfile(defaultUser)
    setAuthError('')
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
    setCurrentModule('dashboard')
    setProfile(null)
    localStorage.removeItem('ielts-studio-user')
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
          <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="glass rounded-[30px] p-8 sm:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1.5 text-xs font-medium text-brand-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                IELTS Studio
              </div>

              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Build your IELTS routine in one focused learning studio.
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
                Track your score, practice writing, and prepare for every section of the exam with a cleaner,
                more guided experience.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  { label: 'Writing', value: 'Task 1 + 2' },
                  { label: 'Skills', value: '4 modules' },
                  { label: 'Insight', value: 'AI guidance' },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-300">
                {['score tracking', 'practice flows', 'AI feedback', 'streaks'].map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className="glass rounded-[30px] p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Welcome back</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">Sign in</h2>
                </div>
                <div className="rounded-xl border border-brand-500/20 bg-brand-500/10 p-2 text-brand-300">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleSignIn}>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm text-slate-300">Password</label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500"
                    placeholder="••••••••"
                  />
                </div>

                {authError && <p className="text-sm text-rose-300">{authError}</p>}

                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 px-4 py-3 font-medium text-white shadow-lg shadow-brand-500/30 transition hover:brightness-110"
                >
                  Continue to IELTS Studio <ArrowRight className="h-4 w-4" />
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-400">
                or
              </div>

              <button
                onClick={handleGuestContinue}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-slate-200 hover:bg-white/10"
              >
                <PlayCircle className="h-4 w-4" />
                Continue as guest
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const currentModuleMeta = moduleCards.find((item) => item.key === currentModule) ?? moduleCards[0]
  const CurrentModuleIcon = currentModuleMeta.icon

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="studio-shell rounded-[30px] overflow-hidden">
          <aside className="border-b border-white/10 bg-slate-950/60 lg:border-b-0 lg:border-r lg:w-72">
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 text-sm font-bold text-white glow-brand-sm">
                    IE
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">IELTS Studio</div>
                    <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Academy</div>
                  </div>
                </div>
              </div>

              <nav className="space-y-2 p-4">
                {moduleCards.map((item) => {
                  const Icon = item.icon
                  const isActive = currentModule === item.key

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setCurrentModule(item.key)}
                      className={clsx(
                        'flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-all',
                        isActive
                          ? 'border-brand-500/30 bg-brand-500/10 text-white'
                          : 'border-transparent bg-transparent text-slate-300 hover:border-white/10 hover:bg-white/5',
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <span className={clsx('rounded-xl p-2', isActive ? 'bg-brand-500/15 text-brand-200' : 'bg-white/5 text-slate-300')}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span>
                          <span className="block text-sm font-medium">{item.label}</span>
                          <span className="block text-[11px] text-slate-400">{item.description}</span>
                        </span>
                      </span>
                    </button>
                  )
                })}
              </nav>

              <div className="mt-auto border-t border-white/10 p-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-sm font-semibold text-white">
                      {profile.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-white">{profile.name}</div>
                      <div className="truncate text-[11px] text-slate-400">{profile.email}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          </aside>

          <main className="flex-1">
            <header className="flex flex-col gap-4 border-b border-white/10 bg-slate-950/40 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Learning platform</p>
                <div className="mt-1 flex items-center gap-3">
                  <CurrentModuleIcon className="h-5 w-5 text-brand-300" />
                  <h1 className="text-2xl font-semibold text-white">{currentModuleMeta.label}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-right">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-300">Streak</div>
                  <div className="text-lg font-semibold text-emerald-200">{profile.streak} days</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentModule('writing')}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 px-4 py-2.5 font-medium text-white shadow-lg shadow-brand-500/30 transition hover:brightness-110"
                >
                  <FileText className="h-4 w-4" />
                  Start a test
                </button>
              </div>
            </header>

            <div className="p-5 sm:p-6 lg:p-8">
              {currentModule === 'dashboard' && (
                <div className="space-y-6">
                  <section className="grid gap-4 md:grid-cols-3">
                    {[
                      { label: 'Current goal', value: profile.goal, accent: 'text-brand-200' },
                      { label: 'Weekly practice', value: '4 sessions', accent: 'text-emerald-200' },
                      { label: 'Average band', value: '7.0', accent: 'text-violet-200' },
                    ].map((stat) => (
                      <div key={stat.label} className="dashboard-card rounded-3xl p-5">
                        <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
                        <div className={clsx('mt-3 text-2xl font-semibold', stat.accent)}>{stat.value}</div>
                      </div>
                    ))}
                  </section>

                  <section className="grid gap-5 lg:grid-cols-[1.4fr_0.8fr]">
                    <div className="dashboard-card rounded-3xl p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Today's focus</p>
                          <h2 className="mt-2 text-2xl font-semibold text-white">Writing improvement sprint</h2>
                        </div>
                        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/10 p-2 text-brand-200">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        {[
                          'Task 2 essay structure review',
                          'Band 7.0 vocabulary refresh',
                          'Two timed writing drills today',
                        ].map((item) => (
                          <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 p-3 text-slate-200">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="dashboard-card rounded-3xl p-6">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Quick start</p>
                      <div className="mt-5 space-y-3">
                        {[
                          { label: 'Writing mock test', module: 'writing', icon: PenTool },
                          { label: 'Speaking warmup', module: 'speaking', icon: Mic },
                          { label: 'Progress review', module: 'progress', icon: BarChart3 },
                        ].map((action) => {
                          const Icon = action.icon
                          return (
                            <button
                              key={action.label}
                              type="button"
                              onClick={() => setCurrentModule(action.module as ModuleKey)}
                              className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left text-slate-200 hover:bg-white/10"
                            >
                              <span className="flex items-center gap-3">
                                <span className="rounded-xl bg-brand-500/10 p-2 text-brand-200">
                                  <Icon className="h-4 w-4" />
                                </span>
                                {action.label}
                              </span>
                              <ArrowRight className="h-4 w-4 text-slate-400" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {currentModule === 'writing' && <WritingStudio />}

              {currentModule === 'speaking' && (
                <FeaturePlaceholder
                  title="Speaking Studio"
                  description="This is where the next learning layer will begin: timed speaking drills, AI feedback, cue-card prompts, and clarity on fluency, vocabulary, and pronunciation. The product shell is ready; the speaking module can be built on top of this foundation next."
                  icon={Mic}
                  accent="bg-gradient-to-br from-violet-500 to-purple-600"
                />
              )}

              {currentModule === 'reading' && (
                <FeaturePlaceholder
                  title="Reading Lab"
                  description="Add IELTS reading passages, multiple question types, answer review, and a question-by-question tracking system so learners can identify weak patterns quickly and improve with focused practice."
                  icon={BookOpenCheck}
                  accent="bg-gradient-to-br from-emerald-500 to-teal-600"
                />
              )}

              {currentModule === 'listening' && (
                <FeaturePlaceholder
                  title="Listening Studio"
                  description="Build the listening flow with four IELTS sections, audio playback, transcript review, and answer explanations. This module should be designed to mirror the exam and prioritize learning from mistakes."
                  icon={Headphones}
                  accent="bg-gradient-to-br from-cyan-500 to-blue-600"
                />
              )}

              {currentModule === 'progress' && (
                <FeaturePlaceholder
                  title="Progress Dashboard"
                  description="Track score improvement over time, review weak areas, and surface the most important next actions. This becomes the heart of personalization and retention in the long-term product."
                  icon={Gauge}
                  accent="bg-gradient-to-br from-orange-500 to-amber-600"
                />
              )}

              {currentModule === 'coach' && (
                <FeaturePlaceholder
                  title="AI Coach"
                  description="The personal tutoring layer should explain mistakes, suggest mini-practice tasks, and help learners improve strategically rather than simply scoring an answer. This is the point where the app becomes a true IELTS learning companion."
                  icon={BrainCircuit}
                  accent="bg-gradient-to-br from-pink-500 to-rose-600"
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
