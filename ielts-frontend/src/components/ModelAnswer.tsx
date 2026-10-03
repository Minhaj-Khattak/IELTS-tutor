'use client'

import { useState } from 'react'
import { Award, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'

interface ModelAnswerProps {
  answer: string
  question: string
}

export default function ModelAnswer({ answer, question }: ModelAnswerProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const wordCount = answer.trim().split(/\s+/).length

  const handleCopy = async () => {
    await navigator.clipboard.writeText(answer)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show a preview (first 200 chars) when collapsed
  const preview = answer.slice(0, 220).trim() + (answer.length > 220 ? '…' : '')

  return (
    <div className="glass rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Award size={18} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-base">Band 9 Model Answer</h3>
              <p className="text-slate-500 text-xs">{wordCount} words · For the same question</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {/* Expand / collapse */}
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5 border border-white/8"
            >
              {expanded ? (
                <><ChevronUp size={12} /> Collapse</>
              ) : (
                <><ChevronDown size={12} /> Read full</>
              )}
            </button>
          </div>
        </div>

        {/* Question reference */}
        <div className="mt-4 text-xs text-slate-500 bg-white/3 rounded-xl px-4 py-3 border border-white/5 line-clamp-2 italic">
          Q: {question}
        </div>
      </div>

      {/* Answer body */}
      <div className="px-6 sm:px-8 py-6">
        <div className={`relative ${!expanded ? 'max-h-48 overflow-hidden' : ''}`}>
          {/* Essay paragraphs */}
          <div className="space-y-4 text-slate-300 text-sm leading-8">
            {answer.split('\n\n').filter(Boolean).map((para, i) => (
              <p key={i}>{para.trim()}</p>
            ))}
          </div>

          {/* Gradient fade when collapsed */}
          {!expanded && (
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#13131f] to-transparent pointer-events-none" />
          )}
        </div>

        {/* Read more button */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 w-full py-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 text-xs font-medium
            hover:bg-emerald-500/8 transition-all flex items-center justify-center gap-1.5"
        >
          {expanded ? (
            <><ChevronUp size={12} /> Show less</>
          ) : (
            <><ChevronDown size={12} /> Read the full Band 9 answer</>
          )}
        </button>
      </div>
    </div>
  )
}
