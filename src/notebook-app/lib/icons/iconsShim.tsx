/**
 * iconsShim.tsx
 *
 * The notebook-app webpack config aliases `@posthog/icons` → this file.
 * We re-export everything from the REAL @posthog/icons package (alias exception
 * added in next.config.js so this file's own imports bypass the alias).
 * Missing icons are filled in from lucide-react as fallbacks.
 */

// ── Real @posthog/icons (bypass via alias exception in next.config.js) ─────
export * from '@posthog/icons'

// ── Fallbacks: icons not present in @posthog/icons v0.36.6 ─────────────────
import React from 'react'
import {
    Link2,
    Unlink,
    Bold,
    Italic,
    FileText,
    Settings,
    EyeOff,
    Gauge,
    KeyRound,
    Network,
    GitBranch,
    Milestone,
    ChevronsUpDown,
    Download,
    History,
    ClipboardCopy,
    Bot,
    Table2,
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
} from 'lucide-react'

export const IconUnlink      = (p: any) => <Unlink       className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconLink        = (p: any) => <Link2        className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconBold        = (p: any) => <Bold         className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconItalic      = (p: any) => <Italic       className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconFile        = (p: any) => <FileText     className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconFileText    = (p: any) => <FileText     className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconSettings    = (p: any) => <Settings     className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconEyeHidden   = (p: any) => <EyeOff       className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconHide        = (p: any) => <EyeOff       className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconGauge       = (p: any) => <Gauge        className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconKey         = (p: any) => <KeyRound     className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconNetwork     = (p: any) => <Network      className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconBranch      = (p: any) => <GitBranch    className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconMilestone   = (p: any) => <Milestone    className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconChevrons    = (p: any) => <ChevronsUpDown className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconExport      = (p: any) => <Download     className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconDocumentExpand = (p: any) => <Download  className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconHistory     = (p: any) => <History      className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconClipboard   = (p: any) => <ClipboardCopy className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconRobot       = (p: any) => <Bot          className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconTable       = (p: any) => <Table2       className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconArrowDown   = (p: any) => <ArrowDown    className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconArrowUp     = (p: any) => <ArrowUp      className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />
export const IconSort        = (p: any) => <ArrowUpDown  className="w-4 h-4 inline-block" strokeWidth={1.5} {...p} />

// ── Helpers (not in @posthog/icons) ────────────────────────────────────────
export function IconWithCount(props: { children: React.ReactNode; count?: number }) {
    return <span className="inline-flex items-center gap-1">{props.children}</span>
}

export function IconWithBadge(props: { children: React.ReactNode }) {
    return <span className="inline-flex items-center gap-1">{props.children}</span>
}
