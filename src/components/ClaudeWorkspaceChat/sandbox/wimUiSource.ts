/**
 * Small, dependency-light UI registry exposed to generated React artifacts.
 * It follows shadcn/ui component names and ergonomics without allowing the
 * artifact to import arbitrary application modules or install packages.
 */
export const WIM_UI_SOURCE = String.raw`
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<string | false | null | undefined>): string {
  return twMerge(clsx(inputs))
}

type ClassProps = { className?: string }

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col space-y-1.5 p-5', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={cn('text-base font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <p className={cn('text-sm text-slate-500', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('p-5 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex items-center p-5 pt-0', className)} {...props} />
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps): JSX.Element {
  const variants = {
    default: 'bg-slate-950 text-white hover:bg-slate-800',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-50',
    ghost: 'text-slate-700 hover:bg-slate-100',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
    link: 'text-blue-600 underline-offset-4 hover:underline',
  }
  const sizes = {
    default: 'h-10 px-4 py-2',
    sm: 'h-9 rounded-md px-3',
    lg: 'h-11 rounded-md px-8',
    icon: 'h-10 w-10',
  }
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
      {...props}
    />
  )
}

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps): JSX.Element {
  const variants = {
    default: 'bg-slate-950 text-white',
    secondary: 'bg-slate-100 text-slate-800',
    outline: 'border border-slate-200 text-slate-700',
    destructive: 'bg-red-100 text-red-700',
  }
  return <div className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', variants[variant], className)} {...props} />
}

type TabsContextValue = { value: string; setValue: (value: string) => void }
const TabsContext = React.createContext<TabsContextValue>({ value: '', setValue: () => undefined })

type TabsProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
}

export function Tabs({ className, defaultValue = '', value, onValueChange, children, ...props }: TabsProps): JSX.Element {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value ?? internalValue
  const setValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
  }
  return (
    <TabsContext.Provider value={{ value: currentValue, setValue }}>
      <div className={cn('w-full', className)} {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('inline-flex h-10 items-center justify-center rounded-lg bg-slate-100 p-1 text-slate-500', className)} {...props} />
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }

export function TabsTrigger({ className, value, onClick, ...props }: TabsTriggerProps): JSX.Element {
  const tabs = React.useContext(TabsContext)
  const active = tabs.value === value
  return (
    <button
      type="button"
      className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500', active ? 'bg-white text-slate-950 shadow-sm' : 'hover:bg-white/60', className)}
      onClick={(event) => { tabs.setValue(value); onClick?.(event) }}
      {...props}
    />
  )
}

type TabsContentProps = React.HTMLAttributes<HTMLDivElement> & { value: string }

export function TabsContent({ className, value, ...props }: TabsContentProps): JSX.Element | null {
  const tabs = React.useContext(TabsContext)
  return tabs.value === value ? <div className={cn('mt-2 focus-visible:outline-none', className)} {...props} /> : null
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>): JSX.Element {
  return <input className={cn('flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('flex min-h-20 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return <label className={cn('text-sm font-medium leading-none text-slate-700', className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return <select className={cn('flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500', className)} {...props} />
}

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>): JSX.Element {
  return <div className="w-full overflow-auto"><table className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <thead className={cn('[&_tr]:border-b', className)} {...props} />
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return <tr className={cn('border-b transition-colors hover:bg-slate-50', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={cn('h-10 px-3 text-left align-middle font-medium text-slate-500', className)} {...props} />
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('p-3 align-middle text-slate-700', className)} {...props} />
}

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div role="alert" className={cn('relative w-full rounded-lg border border-slate-200 bg-white p-4 text-slate-900', className)} {...props} />
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <div className={cn('text-sm text-slate-600', className)} {...props} />
}

export function Separator({ className, orientation = 'horizontal', ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }): JSX.Element {
  return <div role="separator" className={cn('shrink-0 bg-slate-200', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} {...props} />
}

export function Skeleton({ className, ...props }: ClassProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-slate-200', className)} {...props} />
}

export function Progress({ className, value = 0, ...props }: ClassProps & React.HTMLAttributes<HTMLDivElement> & { value?: number }): JSX.Element {
  const width = Math.max(0, Math.min(100, value))
  return <div className={cn('relative h-3 w-full overflow-hidden rounded-full bg-slate-100', className)} {...props}><div className="h-full bg-slate-950 transition-all" style={{ width: width + '%' }} /></div>
}
`

const SANDBOX_UI_IMPORT = /from\s+(['"])(?:@\/components\/ui(?:\/[^'"]+)?|@wim\/ui)\1/g
const SANDBOX_UTILS_IMPORT = /from\s+(['"])@\/lib\/utils\1/g

/** Rewrites common shadcn import paths to the registry mounted in Sandpack. */
export function normalizeSandboxReactSource(source: string): string {
    return source
        .replace(SANDBOX_UI_IMPORT, "from './wim-ui'")
        .replace(SANDBOX_UTILS_IMPORT, "from './wim-ui'")
}
