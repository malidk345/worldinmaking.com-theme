import React, { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { Sliders, RotateCcw, Activity, Info, TrendingUp } from 'lucide-react'

import {
  SimulationSpec,
  SimulationVariable,
  SimulationOutput,
  parseSimulationSpec,
} from '../../../lib/ai/visual-artifacts'
export type { SimulationSpec, SimulationVariable, SimulationOutput }
export { parseSimulationSpec }

function safeEvaluate(formula: string, scope: Record<string, number>): number {
  try {
    // Sanitize formula to allow only variable names, numbers, operators, and Math functions
    const sanitized = formula.replace(/[a-zA-Z_][a-zA-Z0-9_]*/g, (token) => {
      if (token in scope) {
        return `(${scope[token]})`
      }
      if (typeof (Math as any)[token] === 'function' || token in Math) {
        return `Math.${token}`
      }
      return '0'
    })

    // Strict regex check for safety
    if (!/^[0-9+\-*/().,Math\s_maxinpowsqrteplog]+$/.test(sanitized)) {
      return 0
    }

    const fn = new Function(`return (${sanitized});`)
    const val = fn()
    return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0
  } catch {
    return 0
  }
}

function formatValue(value: number, format?: 'number' | 'percent' | 'currency', unit?: string): string {
  let formatted = ''
  if (format === 'percent') {
    formatted = `${value.toFixed(1)}%`
  } else if (format === 'currency') {
    formatted = `$${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
  } else {
    formatted = value >= 1000 ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value.toFixed(1).replace(/\.0$/, '')
  }
  return unit && format !== 'percent' ? `${formatted} ${unit}` : formatted
}

export function SimulationArtifactRenderer({ content }: { content: string | unknown }): JSX.Element {
  const spec = useMemo(() => parseSimulationSpec(content), [content])

  const defaultValues = useMemo(() => {
    const map: Record<string, number> = {}
    if (spec?.variables) {
      spec.variables.forEach((v) => {
        map[v.id] = typeof v.default === 'number' ? v.default : (v.min + v.max) / 2
      })
    }
    return map
  }, [spec])

  const [values, setValues] = useState<Record<string, number>>(defaultValues)

  const handleReset = () => {
    setValues(defaultValues)
  }

  const handleSliderChange = (id: string, val: number) => {
    setValues((prev) => ({ ...prev, [id]: val }))
  }

  const calculatedOutputs = useMemo(() => {
    if (!spec?.outputs) return []
    return spec.outputs.map((out) => {
      const computed = safeEvaluate(out.formula, values)
      return {
        ...out,
        value: computed,
        formatted: formatValue(computed, out.format, out.unit),
      }
    })
  }, [spec, values])

  // Multi-step chart data simulation (e.g. over 10-12 periods)
  const chartData = useMemo(() => {
    if (!spec) return []
    const steps = spec.chart?.timeSteps || 10
    const points: Array<Record<string, any>> = []

    for (let t = 1; t <= steps; t++) {
      const stepScope: Record<string, number> = { ...values, t, time: t, step: t }
      const point: Record<string, any> = {
        name: `T+${t}`,
        step: t,
      }

      if (spec.outputs) {
        spec.outputs.forEach((out) => {
          // Dynamic time decay or accumulation factor
          const simulatedScope = { ...stepScope }
          point[out.id] = parseFloat(safeEvaluate(out.formula, simulatedScope).toFixed(2))
        })
      }

      points.push(point)
    }

    return points
  }, [spec, values])

  if (!spec || !spec.variables || spec.variables.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6 text-center text-muted">
        <div>
          <Activity className="mx-auto mb-2 h-8 w-8 opacity-40" />
          <p className="font-medium">No simulation model found.</p>
          <p className="text-xs opacity-75">Model requires variables and outputs specification.</p>
        </div>
      </div>
    )
  }

  const chartType = spec.chart?.type || 'area'
  const series = spec.chart?.series || spec.outputs.slice(0, 3).map((o, idx) => ({
    key: o.id,
    name: o.label,
    color: idx === 0 ? '#e2b340' : idx === 1 ? '#06b6d4' : '#10b981',
  }))

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-primary text-primary font-sans p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-primary/20">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-amber-500" />
            <h3 className="text-base font-bold text-primary">{spec.title || 'Simulation Model'}</h3>
          </div>
          {spec.description && (
            <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">{spec.description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1.5 self-start sm:self-auto rounded-md border border-primary/20 bg-accent/40 hover:bg-accent px-2.5 py-1 text-xs font-medium text-muted hover:text-primary transition-colors cursor-pointer"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Real-time KPI Output Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {calculatedOutputs.map((out) => (
          <div
            key={out.id}
            className="rounded-xl border border-primary/20 bg-accent/20 p-3.5 backdrop-blur-xs shadow-2xs hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className="text-xs text-muted font-medium truncate">{out.label}</span>
              <TrendingUp className="h-3.5 w-3.5 text-amber-500/70 shrink-0" />
            </div>
            <div className="text-xl font-bold tracking-tight text-primary mt-1">{out.formatted}</div>
            {out.description && <p className="text-[10px] text-muted/80 mt-1 line-clamp-1">{out.description}</p>}
          </div>
        ))}
      </div>

      {/* Main Grid: Controls + Live Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[300px]">
        {/* Left: Interactive Sliders */}
        <div className="lg:col-span-5 flex flex-col space-y-4 rounded-xl border border-primary/20 bg-accent/10 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary pb-2 border-b border-primary/10">
            <Sliders className="h-3.5 w-3.5 text-amber-500" />
            <span>Parameters</span>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {spec.variables.map((v) => {
              const currentVal = values[v.id] ?? v.default
              return (
                <div key={v.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-medium text-primary cursor-pointer" htmlFor={`slider-${v.id}`}>
                      {v.label}
                    </label>
                    <span className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                      {currentVal}
                      {v.unit ? ` ${v.unit}` : ''}
                    </span>
                  </div>

                  <input
                    id={`slider-${v.id}`}
                    type="range"
                    min={v.min}
                    max={v.max}
                    step={v.step || 1}
                    value={currentVal}
                    onChange={(e) => handleSliderChange(v.id, parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />

                  {v.description && <p className="text-[10px] text-muted leading-tight">{v.description}</p>}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: Live Recharts Simulation */}
        <div className="lg:col-span-7 flex flex-col rounded-xl border border-primary/20 bg-accent/10 p-4 min-h-[280px]">
          <div className="flex items-center justify-between text-xs font-semibold text-primary pb-2 mb-3 border-b border-primary/10">
            <span className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-500" />
              <span>Dynamic Response Curve</span>
            </span>
            <span className="text-[10px] font-normal text-muted">Real-time response</span>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-primary/10" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted text-[10px]" />
                  <YAxis stroke="currentColor" className="text-muted text-[10px]" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary, #18181b)',
                      borderColor: 'var(--border-primary, #27272a)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  {series.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color || '#e2b340'}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              ) : chartType === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-primary/10" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted text-[10px]" />
                  <YAxis stroke="currentColor" className="text-muted text-[10px]" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary, #18181b)',
                      borderColor: 'var(--border-primary, #27272a)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  {series.map((s) => (
                    <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color || '#e2b340'} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              ) : (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    {series.map((s) => (
                      <linearGradient key={`grad-${s.key}`} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={s.color || '#e2b340'} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={s.color || '#e2b340'} stopOpacity={0.0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-primary/10" />
                  <XAxis dataKey="name" stroke="currentColor" className="text-muted text-[10px]" />
                  <YAxis stroke="currentColor" className="text-muted text-[10px]" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-primary, #18181b)',
                      borderColor: 'var(--border-primary, #27272a)',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  {series.map((s) => (
                    <Area
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={s.name}
                      stroke={s.color || '#e2b340'}
                      strokeWidth={2}
                      fillOpacity={1}
                      fill={`url(#grad-${s.key})`}
                    />
                  ))}
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
