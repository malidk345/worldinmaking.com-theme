/**
 * Small, dependency-light UI registry exposed to generated React artifacts.
 * Component names stay shadcn-like; class names are rewritten to host OS tokens.
 */
import { rewriteArtifactChrome } from '../../../lib/chrome'

const WIM_UI_SOURCE_RAW = String.raw`
import React from 'react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: Array<string | false | null | undefined>): string {
  return twMerge(clsx(inputs))
}

type ClassProps = { className?: string }

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('rounded border border-border bg-card text-card-foreground', className)} {...props} />
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h3 className={cn('font-semibold leading-none tracking-tight', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('p-6 pt-0', className)} {...props} />
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function Button({ className, variant = 'default', size = 'default', ...props }: ButtonProps): JSX.Element {
  const variants = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    link: 'text-primary underline-offset-4 hover:underline',
  }
  const sizes = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8',
    icon: 'h-9 w-9',
  }
  return (
    <button
      className={cn('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50', variants[variant], sizes[size], className)}
      {...props}
    />
  )
}

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps): JSX.Element {
  const variants = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    outline: 'text-foreground border-border',
    destructive: 'border-transparent bg-destructive text-destructive-foreground',
  }
  return <div className={cn('inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors', variants[variant], className)} {...props} />
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
  return <div className={cn('inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground', className)} {...props} />
}

type TabsTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }

export function TabsTrigger({ className, value, onClick, ...props }: TabsTriggerProps): JSX.Element {
  const tabs = React.useContext(TabsContext)
  const active = tabs.value === value
  return (
    <button
      type="button"
      className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'bg-background text-foreground shadow' : 'hover:text-foreground', className)}
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
  return <input className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>): JSX.Element {
  return <textarea className={cn('flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>): JSX.Element {
  return <label className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)} {...props} />
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>): JSX.Element {
  return <select className={cn('flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring', className)} {...props} />
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
  return <tr className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={cn('h-10 px-2 text-left align-middle font-medium text-muted-foreground', className)} {...props} />
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('p-2 align-middle', className)} {...props} />
}

export function Alert({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div role="alert" className={cn('relative w-full rounded-lg border border-border bg-background p-4 text-foreground', className)} {...props} />
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <div className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function Separator({ className, orientation = 'horizontal', ...props }: React.HTMLAttributes<HTMLDivElement> & { orientation?: 'horizontal' | 'vertical' }): JSX.Element {
  return <div role="separator" className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px', className)} {...props} />
}

export function Skeleton({ className, ...props }: ClassProps & React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('animate-pulse rounded-md bg-primary/10', className)} {...props} />
}

export function Progress({ className, value = 0, ...props }: ClassProps & React.HTMLAttributes<HTMLDivElement> & { value?: number }): JSX.Element {
  const width = Math.max(0, Math.min(100, value))
  return <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)} {...props}><div className="h-full bg-primary transition-all" style={{ width: width + '%' }} /></div>
}

type DialogCtx = { open: boolean; setOpen: (open: boolean) => void }
const DialogContext = React.createContext<DialogCtx>({ open: false, setOpen: () => undefined })

export function Dialog({ open, onOpenChange, children }: { open?: boolean; onOpenChange?: (open: boolean) => void; children?: React.ReactNode }): JSX.Element {
  const [internal, setInternal] = React.useState(false)
  const current = open ?? internal
  const setOpen = (next: boolean) => { if (open === undefined) setInternal(next); onOpenChange?.(next) }
  return <DialogContext.Provider value={{ open: current, setOpen }}><div>{children}</div></DialogContext.Provider>
}

export function DialogTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const dialog = React.useContext(DialogContext)
  return <button type="button" className={className} onClick={() => dialog.setOpen(true)} {...props}>{children}</button>
}

export function DialogContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element | null {
  const dialog = React.useContext(DialogContext)
  if (!dialog.open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/80" onClick={() => dialog.setOpen(false)} />
      <div className={cn('relative z-50 grid w-full max-w-lg gap-4 border border-border bg-background p-6 shadow-lg rounded-lg', className)} {...props}>
        {children}
        <button type="button" aria-label="Close" className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100" onClick={() => dialog.setOpen(false)}>x</button>
      </div>
    </div>
  )
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
}

export function DialogTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>): JSX.Element {
  return <h2 className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>): JSX.Element {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />
}

export function Sheet(props: React.ComponentProps<typeof Dialog>): JSX.Element { return <Dialog {...props} /> }
export function SheetTrigger(props: React.ComponentProps<typeof DialogTrigger>): JSX.Element { return <DialogTrigger {...props} /> }
export function SheetContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element | null {
  const dialog = React.useContext(DialogContext)
  if (!dialog.open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/80" onClick={() => dialog.setOpen(false)} />
      <div className={cn('fixed inset-y-0 right-0 z-50 h-full w-3/4 max-w-sm border-l border-border bg-background p-6 shadow-lg', className)} {...props} />
    </div>
  )
}
export function SheetHeader(props: React.ComponentProps<typeof DialogHeader>): JSX.Element { return <DialogHeader {...props} /> }
export function SheetTitle(props: React.ComponentProps<typeof DialogTitle>): JSX.Element { return <DialogTitle {...props} /> }
export function SheetDescription(props: React.ComponentProps<typeof DialogDescription>): JSX.Element { return <DialogDescription {...props} /> }

export function Avatar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />
}
export function AvatarImage({ className, alt = '', ...props }: React.ImgHTMLAttributes<HTMLImageElement>): JSX.Element {
  return <img alt={alt} className={cn('aspect-square h-full w-full object-cover', className)} {...props} />
}
export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted text-sm', className)} {...props} />
}

export function Switch({ className, checked, defaultChecked, onCheckedChange, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { checked?: boolean; onCheckedChange?: (checked: boolean) => void }): JSX.Element {
  const [on, setOn] = React.useState(!!defaultChecked)
  const current = checked ?? on
  return (
    <button
      type="button"
      role="switch"
      aria-checked={current}
      className={cn('inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors', current ? 'bg-primary' : 'bg-input', className)}
      onClick={() => { const next = !current; if (checked === undefined) setOn(next); onCheckedChange?.(next) }}
      {...props}
    >
      <span className={cn('pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg transition-transform', current ? 'translate-x-4' : 'translate-x-0')} />
    </button>
  )
}

export function Checkbox({ className, checked, onCheckedChange, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { onCheckedChange?: (checked: boolean) => void }): JSX.Element {
  return <input type="checkbox" className={cn('h-4 w-4 rounded border border-primary accent-foreground', className)} checked={checked} onChange={(event) => onCheckedChange?.(event.target.checked)} {...props} />
}

export function ScrollArea({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('overflow-auto', className)} {...props} />
}

export function Tooltip({ children }: { children?: React.ReactNode }): JSX.Element { return <span className="inline-flex">{children}</span> }
export function TooltipTrigger({ asChild, children, ...props }: { asChild?: boolean; children?: React.ReactNode } & React.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return <span {...props}>{children}</span>
}
export function TooltipContent({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>): JSX.Element {
  return <span className={cn('ml-2 rounded-md border border-border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md', className)} {...props}>{children}</span>
}
export function TooltipProvider({ children }: { children?: React.ReactNode }): JSX.Element { return <span>{children}</span> }

export function DropdownMenu({ children }: { children?: React.ReactNode }): JSX.Element {
  const [open, setOpen] = React.useState(false)
  return <div className="relative inline-block" onBlur={() => setOpen(false)}>{React.Children.map(children, (child: any) => child && React.cloneElement(child, { open, setOpen }))}</div>
}
export function DropdownMenuTrigger({ className, children, open, setOpen, ...props }: any): JSX.Element {
  return <button type="button" className={className} onClick={() => setOpen?.(!open)} {...props}>{children}</button>
}
export function DropdownMenuContent({ className, children, open }: any): JSX.Element | null {
  if (!open) return null
  return <div className={cn('absolute z-50 mt-1 min-w-32 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md', className)}>{children}</div>
}
export function DropdownMenuItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground', className)} {...props} />
}

export function Accordion({ children, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div {...props}>{children}</div>
}
export function AccordionItem({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('border-b', className)} {...props} />
}
export function AccordionTrigger({ className, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const [open, setOpen] = React.useState(false)
  return (
    <div>
      <button type="button" className={cn('flex w-full items-center justify-between py-4 text-sm font-medium hover:underline', className)} onClick={() => setOpen(!open)} {...props}>{children}</button>
      {open ? <div data-accordion-open="true" /> : null}
    </div>
  )
}
export function AccordionContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('pb-4 pt-0 text-sm', className)} {...props} />
}
`

export const WIM_UI_SOURCE = rewriteArtifactChrome(WIM_UI_SOURCE_RAW)

const SANDBOX_UI_IMPORT = /from\s+(['"])(?:@\/components\/ui(?:\/[^'"]+)?|@wim\/ui)\1/g
const SANDBOX_UTILS_IMPORT = /from\s+(['"])@\/lib\/utils\1/g

/** Rewrites common shadcn import paths to the registry mounted in Sandpack. */
export function normalizeSandboxReactSource(source: string): string {
    let next = String(source || '')
        .replace(/^```[a-z0-9_-]*[ \t]*\r?\n?/i, '')
        .replace(/\r?\n?```\s*$/i, '')
        .replace(/<\/?(?:antArtifact|artifact)\b[^>]*>/gi, '')
        .trim()

    // Prefer a real module start over a stray `<div>` the model put in the prose.
    const codeStartMatch =
        next.match(/^(?:import\s|export\s|function\s|const\s|let\s|var\s|type\s|interface\s|'use strict'|"use strict")/m) ||
        next.match(/^(?:\/\*|\/\/|<)/m)
    if (codeStartMatch && codeStartMatch.index !== undefined && codeStartMatch.index > 0) {
        next = next.slice(codeStartMatch.index).trim()
    }

    next = next
        .replace(SANDBOX_UI_IMPORT, "from './wim-ui'")
        .replace(SANDBOX_UTILS_IMPORT, "from './wim-ui'")
        .trim()

    if (/export\s+default\s+/.test(next)) return rewriteArtifactChrome(next)

    const named =
        next.match(/export\s+(?:function|const)\s+([A-Z][A-Za-z0-9]*)/) ||
        next.match(/function\s+([A-Z][A-Za-z0-9]*)\s*\(/) ||
        next.match(/const\s+([A-Z][A-Za-z0-9]*)\s*=\s*(?:\(|async\s*\(|function)/)

    if (named?.[1]) next = `${next}\n\nexport default ${named[1]}\n`
    else if (/^\s*</.test(next)) {
        next = `export default function App() {\n  return (\n    ${next}\n  )\n}\n`
    }
    return rewriteArtifactChrome(next)
}
