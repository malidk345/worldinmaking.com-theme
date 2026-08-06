/**
 * One-shot extractor: split src/pages/desktop.tsx into DesktopPage section modules
 * and rewrite desktop.tsx as a thin dynamic-import shell.
 *
 * Run: node scripts/split-desktop-page.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const srcPath = path.join(root, 'src/pages/desktop.tsx')
const outDir = path.join(root, 'src/components/DesktopPage')

const src = fs.readFileSync(srcPath, 'utf8')
const lines = src.split(/\n/)

/** @param {number} start 1-based inclusive @param {number} end 1-based inclusive */
function slice(start, end) {
    return lines.slice(start - 1, end).join('\n')
}

function exportFunctions(code) {
    return code
        .replace(/^function /gm, 'export function ')
        .replace(/^const ([A-Z][A-Za-z0-9]*) = /gm, 'export const $1 = ')
}

fs.mkdirSync(outDir, { recursive: true })

// ─── shared.tsx ─────────────────────────────────────────────
// SectionLabel, InlineIcon, KeyBadge, LetPostHogScroller, PostHogCodeLogomark
// + AlphaBadge / Highlight (used by multiple sections)
const shared = `import React from 'react'
import SlotMachineText from 'components/SlotMachineText'
import posthogIcon from '../../images/posthog-icon-white.svg'
import { IconPop } from 'components/Code/IconPop'

${exportFunctions(slice(67, 124))}

${exportFunctions(slice(126, 347))}

/** Small "Alpha" pill – marks still-cooking features inside the beta product. */
export const AlphaBadge = () => (
    <span className="shrink-0 rounded-sm bg-highlight px-1 py-0.5 text-xs font-bold text-red dark:text-yellow">
        Alpha
    </span>
)

/** Highlighter span, same treatment as the self-driving page. */
export const Highlight = ({ children }: { children: React.ReactNode }) => (
    <span className="bg-highlight px-0.5 font-bold text-red dark:text-yellow">{children}</span>
)
`
fs.writeFileSync(path.join(outDir, 'shared.tsx'), shared)

// ─── HeroSection.tsx ────────────────────────────────────────
const hero = `import React, { useEffect, useState } from 'react'
import { IconArrowUpRight, IconCheck } from '@posthog/icons'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { DownloadContent } from 'components/Code/DownloadContent'
import { usePrefersReducedMotion } from 'components/Code/usePrefersReducedMotion'
import Link from 'components/Link'
import { IconDiscord } from 'components/OSIcons/Icons'
import { WaitlistForm } from 'components/WaitlistForm'
import WistiaEmbed from 'components/WistiaEmbed'
import { LetPostHogScroller } from './shared'

${exportFunctions(slice(353, 470))}
`
fs.writeFileSync(path.join(outDir, 'HeroSection.tsx'), hero)

// ─── NarrativeSections.tsx (Old way + PostHog way + receipt) ─
const narrative = `import React, { useRef, useState } from 'react'
import { IconCheck, IconX } from '@posthog/icons'
import { ChoppyReveal } from 'components/Code/ChoppyReveal'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { SignalsCallout } from 'components/Code/SignalsCallout'
import { DottedConnection } from 'components/Code/DottedConnection'
import { StickerTombstone } from 'components/Stickers/Stickers'
import { SectionLabel, InlineIcon, KeyBadge, PostHogCodeLogomark } from './shared'

${exportFunctions(slice(656, 725))}

${exportFunctions(slice(476, 560))}

${exportFunctions(slice(566, 647))}
`
fs.writeFileSync(path.join(outDir, 'NarrativeSections.tsx'), narrative)

// ─── FeaturesSection.tsx ────────────────────────────────────
// instrumentationItems … Features (uses AlphaBadge from shared; FeaturePanel refs it)
// Note: original AlphaBadge/Highlight definitions live later; we strip duplicates by only taking 818-1194
const featuresBody = slice(818, 1194)
    // FeaturePanel references AlphaBadge – import from shared instead of local const
    .replace(
        /const FeaturePanel = \(\{/,
        'const FeaturePanel = ({'
    )

const features = `import React from 'react'
import {
    IconAI,
    IconBatteryCharge,
    IconBrain,
    IconBrowser,
    IconCrown,
    IconDashboard,
    IconFlask,
    IconGraph,
    IconHandMoney,
    IconLive,
    IconPulse,
    IconTerminal,
    IconToggle,
    IconTrends,
    IconWarning,
} from '@posthog/icons'
import TabbedCarousel from 'components/TabbedCarousel'
import type { TabbedCarouselTab } from 'components/TabbedCarousel'
import CloudinaryImage from 'components/CloudinaryImage'
import { AlphaBadge } from './shared'

${exportFunctions(featuresBody)}
`
fs.writeFileSync(path.join(outDir, 'FeaturesSection.tsx'), features)

// ─── WorkspaceSection.tsx (alphas carousel) ─────────────────
// Strip local AlphaBadge + Highlight redefinitions (now in shared)
let workspaceBody = slice(1196, 1697)
workspaceBody = workspaceBody
    .replace(
        /\/\/ Small "Alpha" pill[\\s\\S]*?const AlphaBadge = \\(\\) => \\([\\s\\S]*?\\)\\n\\n/,
        ''
    )
    .replace(
        /\/\/ Highlighter span[\\s\\S]*?const Highlight = \\(\\{ children \\}: \\{ children: React\\.ReactNode \\}\\) => \\([\\s\\S]*?\\)\\n\\n/,
        ''
    )
// Fix if regex failed - simpler line-based strip of AlphaBadge and Highlight blocks
if (workspaceBody.includes('const AlphaBadge')) {
    workspaceBody = workspaceBody
        .split(/\n/)
        .filter((line, i, arr) => {
            // We'll do a different approach below
            return true
        })
        .join('\n')
}

// More reliable: rebuild workspace from known sub-ranges excluding AlphaBadge/Highlight defs
// Lines 1196-1201 AlphaBadge, 1204-1207 Highlight — skip those
const workspaceParts = [
    slice(1209, 1697), // channelArtifacts through AgenticWorkspaceSection
]
const workspace = `import React, { useState } from 'react'
import {
    IconColumns,
    IconDocument,
    IconGraph,
    IconList,
    IconListCheck,
    IconMemory,
    IconMessage,
    IconPullRequest,
    IconStack,
} from '@posthog/icons'
import TabbedCarousel from 'components/TabbedCarousel'
import type { TabbedCarouselTab } from 'components/TabbedCarousel'
import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import { StickerAi } from 'components/Stickers/Stickers'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { SectionLabel, AlphaBadge, Highlight } from './shared'

${exportFunctions(workspaceParts.join('\n\n'))}
`
fs.writeFileSync(path.join(outDir, 'WorkspaceSection.tsx'), workspace)

// ─── IntegrationsSections.tsx ───────────────────────────────
const integrations = `import React from 'react'
import { IconSparkles } from '@posthog/icons'
import { LOGOS, type LogoKey } from 'constants/logos'
import { StickerRobot } from 'components/Stickers/Stickers'
import { SectionLabel } from './shared'

${exportFunctions(slice(1699, 1943))}
`
fs.writeFileSync(path.join(outDir, 'IntegrationsSections.tsx'), integrations)

// ─── ClosingSections.tsx ────────────────────────────────────
// MeepNotification, BiggerPicture, InboxCallout, TLDR, FAQ, DownloadButton
const closing = `import React, { useEffect, useRef, useState } from 'react'
import { Accordion } from 'components/RadixUI/Accordion'
import Modal from 'components/RadixUI/Modal'
import WistiaEmbed from 'components/WistiaEmbed'
import CloudinaryImage from 'components/CloudinaryImage'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { WaitlistForm } from 'components/WaitlistForm'
import { ChoppyReveal } from 'components/Code/ChoppyReveal'
import { RoughAnnotation } from 'components/Code/RoughAnnotation'
import { usePrefersReducedMotion } from 'components/Code/usePrefersReducedMotion'
import {
    StickerMayor,
    StickerPullRequest,
} from 'components/Stickers/Stickers'
import { SectionLabel, InlineIcon, PostHogCodeLogomark, Highlight } from './shared'

${exportFunctions(slice(733, 815))}

${exportFunctions(slice(1946, 2081))}

${exportFunctions(slice(2083, 2362))}

${exportFunctions(slice(2368, 2374))}
`
fs.writeFileSync(path.join(outDir, 'ClosingSections.tsx'), closing)

// ─── index.ts re-exports ────────────────────────────────────
const index = `export { HeroSection } from './HeroSection'
export { OldWaySection, PostHogWaySection } from './NarrativeSections'
export { Features } from './FeaturesSection'
export { AgenticWorkspaceSection } from './WorkspaceSection'
export { SupportedLLMs, MCPMarketplace, SkillsCallout } from './IntegrationsSections'
export {
    InboxCallout,
    BiggerPictureSection,
    TLDR,
    FAQ,
    DownloadButton,
    MeepNotification,
} from './ClosingSections'
`
fs.writeFileSync(path.join(outDir, 'index.ts'), index)

// ─── Thin desktop.tsx page shell (written as a static template file) ──
const pageTemplatePath = path.join(__dirname, 'templates/desktop-page-shell.tsx')
const page = fs.readFileSync(pageTemplatePath, 'utf8')
fs.writeFileSync(srcPath, page)

console.log('DesktopPage split complete.')
for (const f of fs.readdirSync(outDir)) {
    const p = path.join(outDir, f)
    const n = fs.readFileSync(p, 'utf8').split(/\n/).length
    console.log(`  ${f}: ${n} lines`)
}
console.log(`  pages/desktop.tsx: ${page.split(/\n/).length} lines`)

