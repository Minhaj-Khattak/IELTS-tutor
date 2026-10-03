'use client'

import { useEffect, useState, useCallback } from 'react'
import { Timer, AlertTriangle, Clock } from 'lucide-react'
import clsx from 'clsx'

interface ExamTimerProps {
  durationSeconds?: number       // total exam time (3600 = 60 min)
  onExpire: () => void           // called once when timer hits 0
  disabled?: boolean             // freeze when results are shown
  isRunning?: boolean            // countdown active or waiting to start
}

function fmt(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function ExamTimer({
  durationSeconds = 3600,
  onExpire,
  disabled,
  isRunning = true,
}: ExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds)
  const [expired, setExpired] = useState(false)

  const pct = (timeLeft / durationSeconds) * 100
  const isCritical = isRunning && timeLeft <= 5 * 60   // last 5 minutes
  const isWarning  = isRunning && timeLeft <= 15 * 60  // last 15 minutes

  const handleExpire = useCallback(() => {
    if (!expired) {
      setExpired(true)
      onExpire()
    }
  }, [expired, onExpire])

  useEffect(() => {
    if (!isRunning || disabled || expired) return
    if (timeLeft <= 0) { handleExpire(); return }

    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); handleExpire(); return 0 }
        return t - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [isRunning, disabled, expired, timeLeft, handleExpire])

  return (
    <div className={clsx(
      'glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-500',
      isCritical && !expired && 'border-rose-500/40 shadow-rose-500/10 shadow-lg',
      isWarning && !isCritical && !expired && 'border-amber-500/30',
    )}>
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={clsx(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
          isCritical && !expired ? 'bg-rose-500/20'
            : isWarning ? 'bg-amber-500/15'
            : 'bg-brand-500/20',
        )}>
          {isCritical && !expired
            ? <AlertTriangle size={16} className="text-rose-400 animate-pulse-slow" />
            : <Timer size={16} className={isWarning ? 'text-amber-400' : 'text-brand-400'} />
          }
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold text-sm">Official Writing Exam Timer</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 font-mono">
              60m total
            </span>
          </div>
          <p className="text-slate-400 text-xs mt-0.5 flex items-center gap-1.5">
            <Clock size={11} className="text-brand-400" />
            Suggested allocation: ~20m for Task 1 · ~40m for Task 2
          </p>
        </div>
      </div>

      {/* Time display & progress */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 min-w-[140px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs sm:inline hidden">
            {!isRunning ? 'Starts on typing:' : expired ? "Time's up!" : isCritical ? 'Final minutes!' : isWarning ? 'Wrapping up…' : 'Remaining:'}
          </span>
          <span className={clsx(
            'font-mono font-bold text-xl tracking-widest transition-colors',
            expired
              ? 'text-slate-500'
              : isCritical
              ? 'text-rose-400 animate-pulse-slow'
              : isWarning
              ? 'text-amber-400'
              : 'text-white',
          )}>
            {fmt(timeLeft)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-28 sm:w-36 h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className={clsx(
              'h-full rounded-full transition-all duration-1000',
              isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-brand-500',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
