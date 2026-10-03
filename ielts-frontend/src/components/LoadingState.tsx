'use client'

import { Brain, Sparkles, FileText, BarChart3 } from 'lucide-react'

const STEPS = [
  { icon: <FileText size={18} />,   label: 'Reading your essay',         delay: '0ms' },
  { icon: <Brain size={18} />,      label: 'Applying IELTS criteria',    delay: '600ms' },
  { icon: <BarChart3 size={18} />,  label: 'Calculating band scores',    delay: '1200ms' },
  { icon: <Sparkles size={18} />,   label: 'Preparing corrections',      delay: '1800ms' },
]

export default function LoadingState() {
  return (
    <div className="glass rounded-3xl p-10 flex flex-col items-center justify-center gap-8 animate-fade-up min-h-[320px]">
      {/* Animated logo */}
      <div className="relative">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center glow-brand animate-pulse-slow">
          <Brain size={36} className="text-white" />
        </div>
        <div className="absolute -inset-3 rounded-3xl bg-brand-500/20 animate-ping" style={{ animationDuration: '2s' }} />
      </div>

      <div className="text-center space-y-2">
        <h3 className="font-display font-bold text-white text-xl">AI Examiner at Work</h3>
        <p className="text-slate-400 text-sm">Evaluating your essay against official IELTS band descriptors…</p>
      </div>

      {/* Step indicators */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {STEPS.map((step, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 glass rounded-xl px-4 py-3 animate-fade-up"
            style={{ animationDelay: step.delay, opacity: 0 }}
          >
            <span className="text-brand-400 animate-pulse-slow">{step.icon}</span>
            <span className="text-slate-400 text-xs">{step.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar shimmer */}
      <div className="w-full max-w-md h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full shimmer-bg rounded-full" style={{ width: '100%' }} />
      </div>
    </div>
  )
}
