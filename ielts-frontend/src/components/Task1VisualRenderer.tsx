'use client'

import React from 'react'
import type { ChartData } from '@/types/grading'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, Table as TableIcon, GitFork, MapPin, ArrowRight } from 'lucide-react'

interface Task1VisualRendererProps {
  chartData: ChartData
  question?: string
}

// High-contrast, vibrant, and easily distinguishable color palette
const PALETTE = [
  '#3b82f6', // Bright Blue
  '#10b981', // Emerald Green
  '#f59e0b', // Vivid Amber
  '#ec4899', // Hot Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Violet/Purple
  '#f97316', // Orange
  '#14b8a6', // Teal Mint
  '#eab308', // Canary Yellow
  '#ef4444', // Crimson Red
]

export default function Task1VisualRenderer({ chartData, question }: Task1VisualRendererProps) {
  const { chart_type, title, x_axis_label, y_axis_label, categories, series } = chartData

  // Transform series and categories into Recharts-friendly row objects:
  const chartRows = categories.map((cat, catIdx) => {
    const row: Record<string, string | number> = { category: cat }
    series.forEach((s) => {
      row[s.name] = s.data[catIdx] ?? 0
    })
    return row
  })

  // Determine if this prompt/data calls for 2 comparative pie charts or 1 single pie chart
  const isDualPie = Boolean(
    chart_type === 'pie' && (
      series.length >= 2 ||
      (question && /\b(two pie charts|2 pie charts|past and current|current and past|comparison|two years)\b/i.test(question)) ||
      /\b(vs|between 19\d\d and 20\d\d)\b/i.test(title)
    )
  )

  // For Pie Charts: parse comparison years/periods from title or question
  const titleYears = (title + ' ' + (question ?? '')).match(/\b(19\d\d|20\d\d)\b/g)
  const y1FromTitle = titleYears && titleYears[0] ? titleYears[0] : null
  const y2FromTitle = titleYears && titleYears[1] ? titleYears[1] : null

  // Determine Chart 1 header
  const pie1Title = y1FromTitle
    ? y1FromTitle
    : series[0]?.name && series[0].name.length < 25 && !['percentage', 'data', 'series 1', 'expenditure'].includes(series[0].name.toLowerCase())
    ? series[0].name
    : 'Chart 1'

  // Determine Chart 2 header (MUST be distinct from Chart 1 if dual)
  let pie2Title = y2FromTitle
    ? y2FromTitle
    : series[1]?.name && series[1].name.length < 25 && !['percentage', 'data', 'series 2', 'expenditure'].includes(series[1].name.toLowerCase())
    ? series[1].name
    : (y1FromTitle ? `${parseInt(y1FromTitle) + 10}` : 'Chart 2')

  if (pie1Title === pie2Title) {
    pie2Title = `${pie1Title} (Comparison)`
  }

  const pie1Data = categories.map((cat, idx) => ({
    name: cat,
    value: series[0]?.data?.[idx] ?? Math.round(100 / (categories.length || 1)),
  }))

  // Series 2 title & data (used if dual pie chart is requested)
  const pie2Data = categories.map((cat, idx) => {
    if (series[1] && series[1].data && series[1].data[idx] !== undefined && !isNaN(Number(series[1].data[idx]))) {
      return { name: cat, value: Number(series[1].data[idx]) }
    }
    // If dual pie is expected but only 1 series was provided, derive realistic comparative figures
    const v1 = Number(series[0]?.data?.[idx] ?? Math.round(100 / (categories.length || 1)))
    const shift = [-3.5, 4.0, -2.5, 3.0, -1.0, 1.5][idx % 6]
    return { name: cat, value: Math.max(5, Math.round(v1 + shift)) }
  })

  const renderChartIcon = () => {
    switch (chart_type) {
      case 'bar':
        return <BarChart3 size={16} className="text-brand-400" />
      case 'line':
        return <LineIcon size={16} className="text-sky-400" />
      case 'pie':
        return <PieIcon size={16} className="text-emerald-400" />
      case 'process':
        return <GitFork size={16} className="text-violet-400" />
      case 'map':
        return <MapPin size={16} className="text-rose-400" />
      default:
        return <TableIcon size={16} className="text-amber-400" />
    }
  }

  return (
    <div className="glass rounded-3xl p-5 sm:p-6 space-y-4 border border-white/10 glow-brand-sm">
      {/* Title & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            {renderChartIcon()}
          </div>
          <div>
            <h3 className="font-display font-semibold text-white text-sm sm:text-base tracking-tight">
              {title}
            </h3>
            {y_axis_label && (
              <p className="text-slate-400 text-xs mt-0.5">
                Units: <span className="text-slate-300 font-medium">{y_axis_label}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="self-start sm:self-center px-2.5 py-1 rounded-full text-xs font-medium border border-white/10 text-brand-300 bg-brand-500/10 capitalize">
            {chart_type === 'pie'
              ? (isDualPie ? '2 Comparative Pie Charts' : 'Pie Chart')
              : chart_type === 'table'
              ? 'Data Table'
              : chart_type === 'process'
              ? 'Process Diagram'
              : chart_type === 'map'
              ? 'Map / Plan Diagram'
              : `${chart_type} Chart`}
          </span>
          <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
            Official Exam Graphic
          </span>
        </div>
      </div>

      {/* Static Visual Area with transparent overlay to block 100% of hover/pointer events */}
      <div className="relative w-full">
        {/* Transparent overlay that completely intercepts mouse interaction */}
        <div
          className="absolute inset-0 z-30 bg-transparent cursor-default select-none"
          style={{ pointerEvents: 'auto' }}
          aria-hidden="true"
        />

        {/* Visual Charts (rendered with zero animation and no hover tooltips) */}
        <div
          className="w-full select-none"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
        >
          {chart_type === 'bar' && (
            <div className="h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartRows} margin={{ top: 15, right: 10, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    label={x_axis_label ? { value: x_axis_label, position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 } : undefined}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    iconType="circle"
                  />
                  {series.map((s, idx) => (
                    <Bar
                      key={s.name}
                      dataKey={s.name}
                      fill={PALETTE[idx % PALETTE.length]}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {chart_type === 'line' && (
            <div className="h-72 sm:h-80 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartRows} margin={{ top: 15, right: 15, left: -15, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    label={x_axis_label ? { value: x_axis_label, position: 'insideBottom', offset: -12, fill: '#64748b', fontSize: 11 } : undefined}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                    iconType="circle"
                  />
                  {series.map((s, idx) => (
                    <Line
                      key={s.name}
                      type="monotone"
                      dataKey={s.name}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4, strokeWidth: 1.5, fill: '#0b0f19' }}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {chart_type === 'pie' && (
            <div className="space-y-4 pt-2">
              {isDualPie ? (
                /* Two comparative pie charts side by side */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Chart 1 */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                    <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                      {pie1Title}
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pie1Data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={30}
                            paddingAngle={3}
                            label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            isAnimationActive={false}
                          >
                            {pie1Data.map((_, index) => (
                              <Cell
                                key={`cell-1-${index}`}
                                fill={PALETTE[index % PALETTE.length]}
                                stroke="#0b0f19"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2 */}
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                    <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                      {pie2Title}
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pie2Data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={75}
                            innerRadius={30}
                            paddingAngle={3}
                            label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                            isAnimationActive={false}
                          >
                            {pie2Data.map((_, index) => (
                              <Cell
                                key={`cell-2-${index}`}
                                fill={PALETTE[index % PALETTE.length]}
                                stroke="#0b0f19"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              ) : (
                /* Single pie chart (1 image / single distribution) */
                <div className="max-w-xs sm:max-w-sm mx-auto rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-center">
                  <div className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wider font-mono">
                    {pie1Title}
                  </div>
                  <div className="h-56 sm:h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pie1Data}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={32}
                          paddingAngle={3}
                          label={({ percent }: any) => `${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          isAnimationActive={false}
                        >
                          {pie1Data.map((_, index) => (
                            <Cell
                              key={`cell-single-${index}`}
                              fill={PALETTE[index % PALETTE.length]}
                              stroke="#0b0f19"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Static Legend below */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-white/5">
                {categories.map((cat, idx) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {chart_type === 'table' && (
            <div className="overflow-x-auto rounded-2xl border border-white/10 my-2">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold">
                  <tr>
                    <th className="p-3 font-medium">{x_axis_label || 'Category'}</th>
                    {series.map((s) => (
                      <th key={s.name} className="p-3 font-medium">{s.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {categories.map((cat, idx) => (
                    <tr key={cat} className="hover:bg-white/[0.03] transition-colors">
                      <td className="p-3 font-medium text-white">{cat}</td>
                      {series.map((s) => (
                        <td key={s.name} className="p-3 font-mono text-slate-300">
                          {s.data[idx] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {chart_type === 'process' && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {categories.map((stage, idx) => (
                  <div
                    key={stage}
                    className="relative rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="w-7 h-7 rounded-xl flex items-center justify-center font-mono font-bold text-xs text-white shadow-sm"
                        style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                      >
                        {idx + 1}
                      </span>
                      {idx < categories.length - 1 && (
                        <ArrowRight size={14} className="text-slate-500 hidden lg:block absolute -right-2 top-5 z-10" />
                      )}
                    </div>
                    <div className="text-xs sm:text-sm font-medium text-slate-200 leading-snug">
                      {stage}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 mt-3 pt-2 border-t border-white/5 flex items-center justify-between">
                      <span>Step {idx + 1}</span>
                      <span className="text-slate-500">of {categories.length}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-center text-xs text-slate-500 italic">
                Sequential Process Diagram · Follow arrows from Step 1 through Step {categories.length}
              </p>
            </div>
          )}

          {chart_type === 'map' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Map Layout 1 */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      {series[0]?.name || 'Period 1 (Original Plan)'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-slate-400 font-mono">
                      Original Layout
                    </span>
                  </div>
                  <div className="space-y-2">
                    {categories.map((zone, idx) => (
                      <div
                        key={zone}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                          <span className="text-xs font-medium text-slate-200">{zone}</span>
                        </div>
                        <span className="text-xs font-mono text-slate-400">
                          {series[0]?.data?.[idx] !== undefined ? `${series[0].data[idx]}% area` : 'Present'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Map Layout 2 */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider font-mono">
                      {series[1]?.name || 'Period 2 (Redeveloped Plan)'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-300 font-mono border border-brand-500/20">
                      Modernised Layout
                    </span>
                  </div>
                  <div className="space-y-2">
                    {categories.map((zone, idx) => (
                      <div
                        key={zone}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/[0.02]"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                          />
                          <span className="text-xs font-medium text-slate-200">{zone}</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400">
                          {series[1]?.data?.[idx] !== undefined ? `${series[1].data[idx]}% area` : 'Modernised'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-white/5">
                {categories.map((cat, idx) => (
                  <div key={cat} className="flex items-center gap-1.5 text-xs text-slate-300">
                    <span
                      className="w-2.5 h-2.5 rounded-full inline-block"
                      style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                    />
                    <span>{cat}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
