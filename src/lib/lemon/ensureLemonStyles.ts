/**
 * Full notebook Lemon UI CSS (scoped under `.notebook-app-scope`).
 *
 * Integration contract:
 * - Styles are injected once into <head>.
 * - Scope class is NOT applied to document.body (that leaked nested Tailwind base
 *   across the whole OS site). Scope lives only on:
 *     • <LemonScope> roots
 *     • Notebook App root
 *     • Portal roots (Popover / LemonModal already set `notebook-app-scope`)
 */

import { NOTEBOOK_APP_CSS } from '../../notebook-app/styles/bundleCss'

const STYLE_ID = 'notebook-app-styles'
const PALETTE_STYLE_ID = 'notebook-app-palette-bridge'
export const LEMON_SCOPE_CLASS = 'notebook-app-scope'

/**
 * Notebook surface bridge → host site colors from tailwind.config.js:
 *   light: #fff | accent-light: #e5e7e0 | dark: #1e1f23 | accent-dark: #232429
 * Prefer live scheme vars (rgb(var(--bg))) so skin/theme switches match the rest of the OS.
 * No invented cream/beige hexes.
 */
const NOTEBOOK_PALETTE_CSS = `
.notebook-app-scope {
  /* Host Tailwind: border-primary → rgb(var(--border)).
     PostHog sets --border: rgb(0 0 0 / 15%) which makes rgb(var(--border))
     invalid CSS and paints a solid black frame on every border-primary.
     Do NOT set --bg here — that washes the list/editor to near-white. */
  --border: 192 192 192;
  --input-border: 210 210 210;
  /* Typography → site ReaderView (RoundHog). Editor + chrome, not Inter. */
  --font-sans: 'RoundHog', -apple-system, BlinkMacSystemFont, 'avenir next', avenir, 'segoe ui', 'helvetica neue', helvetica, Ubuntu, roboto, noto, arial, sans-serif;
  --font-title: var(--font-sans);
  --font-button: var(--font-sans);
  font-family: var(--font-sans);
  /* Density → OS frosted / OSButton radius */
  --radius: 0.375rem;
  --radius-sm: 0.3125rem;
  --radius-base: var(--radius);
  --radius-lg: 0.5rem;
  --shadow-elevation-3000: 0 4px 18px rgba(0, 0, 0, 0.1);
  /* Host WINDOW_BG / PANEL_BG: bg-primary/75 backdrop-blur-3xl */
  --os-frosted-bg: color-mix(in sRGB, var(--color-bg-surface-primary, #fff) 75%, transparent);
  --os-frosted-blur: blur(64px);
  /* Soften Lemon 3D pressable frame inside the jar */
  --lemon-button-chrome-depth: 0.0625rem;
  --lemon-button-hover-depth: 0;
  --lemon-button-press-depth: 0.03125rem;
  --color-bg-surface-primary: rgb(var(--bg, 255 255 255));
  --color-bg-surface-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-surface-tertiary: rgb(var(--accent, 229 231 224));
  --color-bg-surface-popover: rgb(var(--bg, 255 255 255));
  --color-bg-fill-primary: rgb(var(--bg, 255 255 255));
  --color-bg-fill-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-tertiary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-input: rgb(var(--input-bg, var(--accent, 238 239 233)));
  --color-bg-fill-button-secondary: rgb(var(--accent, 229 231 224));
  --color-bg-fill-button-secondary-hover: rgb(var(--accent, 229 231 224));
  --secondary-3000-button-border: rgb(var(--border, 191 193 183));
  --secondary-3000-button-border-hover: rgb(var(--border, 182 183 175));
  --secondary-3000-frame-bg: rgb(var(--accent, 229 231 224));
  --border-3000: rgb(var(--border, 191 193 183));
  --border-bold-3000: rgb(var(--border, 182 183 175));
  --color-border-primary: rgb(var(--border, 191 193 183));
  --color-border-secondary: rgb(var(--border, 182 183 175));
  --color-text-primary: rgb(var(--text-primary, 17 17 17));
  --text-3000: rgb(var(--text-primary, 17 17 17));
}
/* PostHog \`border-border\` is not a host utility — it fell through to currentColor (black). */
.notebook-app-scope .border-border {
  border-color: rgb(var(--border));
}
.notebook-app-scope .notebook-tools-sidebar {
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary, rgb(var(--bg))) 75%, transparent));
  color: rgb(var(--text-primary));
  border-color: rgb(var(--border));
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}
.notebook-app-scope .notebook-tools-footer {
  border-top: 1px solid rgb(var(--border));
}
.notebook-app-scope .notebook-tools-sidebar .notebook-rail-search input {
  background: rgb(var(--input-bg));
  border-color: rgb(var(--input-border));
  color: rgb(var(--text-primary));
}
.notebook-app-scope[data-notebook-font='sm'] .MarkdownNotebook { font-size: 0.875rem; } /* 14px */
.notebook-app-scope[data-notebook-font='md'] .MarkdownNotebook { font-size: 0.9375rem; } /* 15px = ReaderView prose-sm */
.notebook-app-scope[data-notebook-font='lg'] .MarkdownNotebook { font-size: 1.0625rem; } /* 17px */
.notebook-app-scope .MarkdownNotebook,
.notebook-app-scope .MarkdownNotebook__text-group,
.notebook-app-scope .MarkdownNotebook__text-block {
  font-family: var(--font-sans);
}
.notebook-app-scope .MarkdownNotebook__text-group {
  font-size: 15px;
  line-height: 1.5;
  letter-spacing: -0.01em;
}
.notebook-app-scope h1.MarkdownNotebook__text-block--heading { font-family: var(--font-title); font-size: 1.5rem; line-height: 1.3; }
.notebook-app-scope h1.MarkdownNotebook__text-block.MarkdownNotebook__text-block--heading.MarkdownNotebook__text-block--title { font-size: 1.65rem; line-height: 1.25; }
.notebook-app-scope h2.MarkdownNotebook__text-block--heading { font-family: var(--font-title); font-size: 1.25rem; line-height: 1.35; }
.notebook-app-scope h3.MarkdownNotebook__text-block--heading { font-family: var(--font-title); font-size: 1.0625rem; line-height: 1.4; }
/* Soft Lemon primary/secondary + floating format toolbar */
.notebook-app-scope .LemonButton--primary:not([aria-disabled='true']):active .LemonButton__chrome,
.notebook-app-scope .LemonButton--secondary:not([aria-disabled='true']):active .LemonButton__chrome {
  transform: translateY(1px);
}
.notebook-app-scope .MarkdownNotebook__format-toolbar {
  padding: 0.1rem;
  border-radius: var(--radius-sm, 5px);
  border: 1px solid rgb(var(--border));
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary) 75%, transparent));
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}
.notebook-app-scope .MarkdownNotebook__format-toolbar .LemonButton {
  --lemon-button-chrome-depth: 0px;
  --lemon-button-hover-depth: 0px;
  --lemon-button-press-depth: 0px;
  --lemon-button-frame-bg-color: transparent;
}
.notebook-app-scope .MarkdownNotebook__format-toolbar .LemonButton__chrome::after {
  box-shadow: none !important;
}
.notebook-app-scope .MarkdownNotebook__format-toolbar .LemonButton:not([aria-disabled='true']):hover .LemonButton__chrome,
.notebook-app-scope .MarkdownNotebook__format-toolbar .LemonButton:not([aria-disabled='true']):active .LemonButton__chrome {
  transform: none;
}
.notebook-app-scope.Popover > .Popover__box,
.Popover.notebook-app-scope > .Popover__box {
  font-family: var(--font-sans);
  border-radius: var(--radius-lg, 0.5rem);
  box-shadow: var(--shadow-elevation-3000);
}
/* InsertMenu — frosted OS panel + tertiary rows */
.notebook-app-scope .MarkdownNotebook__insert-menu {
  font-family: var(--font-sans) !important;
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary, #fff) 75%, transparent));
  border: 1px solid var(--color-border-primary, rgb(var(--border)));
  border-radius: var(--radius, 0.375rem);
  box-shadow: var(--shadow-elevation-3000);
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
  padding: 4px;
}
.notebook-app-scope .MarkdownNotebook__insert-item:hover,
.notebook-app-scope .MarkdownNotebook__insert-item:focus-visible,
.notebook-app-scope .MarkdownNotebook__insert-item--selected {
  background: var(--color-bg-fill-button-tertiary-hover, rgba(0, 0, 0, 0.06));
}
/* NotebookFloatingToolbar bar */
.notebook-app-scope .NotebookFloatingToolbar__bar {
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary) 75%, transparent)) !important;
  border: 1px solid rgb(var(--border)) !important;
  border-radius: var(--radius, 0.375rem) !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08) !important;
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}
.notebook-app-scope .NotebookFloatingToolbar__bar .LemonButton {
  --lemon-button-chrome-depth: 0px;
  --lemon-button-hover-depth: 0px;
  --lemon-button-press-depth: 0px;
  --lemon-button-frame-bg-color: transparent;
  font-family: var(--font-sans);
}
.notebook-app-scope .NotebookFloatingToolbar__bar .LemonButton__chrome::after {
  box-shadow: none !important;
}
/* Code / table secondary surfaces */
.notebook-app-scope {
  --markdown-notebook-block-radius: 0.375rem;
  --markdown-notebook-code-background: var(--color-bg-surface-secondary, #f5f5f5);
  --markdown-notebook-code-border: var(--color-border-primary, #e0e0e0);
  --markdown-notebook-code-shadow: none;
  --markdown-notebook-code-gutter: var(--color-border-secondary, #cfcfcf);
  --markdown-notebook-text-group-border: var(--color-border-primary, #e0e0e0);
  --markdown-notebook-text-group-shadow: none;
  --markdown-notebook-text-block-gutter: var(--color-border-primary, #e0e0e0);
}
.notebook-app-scope .MarkdownNotebook__code-group {
  background: color-mix(in sRGB, var(--color-bg-surface-secondary, #f5f5f5) 92%, transparent);
  border: 1px solid var(--color-border-primary, rgb(var(--border)));
  border-left: 3px solid var(--markdown-notebook-code-gutter, var(--color-border-secondary));
  border-radius: 0 var(--radius, 0.375rem) var(--radius, 0.375rem) 0;
  box-shadow: none;
}
.notebook-app-scope .MarkdownNotebook__table-block {
  background: var(--color-bg-surface-primary, #fff);
  border: 1px solid var(--color-border-primary, rgb(var(--border)));
  border-left: 3px solid var(--color-border-secondary, #cfcfcf);
  border-radius: 0 var(--radius, 0.375rem) var(--radius, 0.375rem) 0;
  box-shadow: none;
}
.notebook-app-scope .LemonModal__box,
.notebook-app-scope .LemonModal .LemonModal__box {
  font-family: var(--font-sans);
  background: var(--color-bg-surface-primary) !important;
  border: 1px solid var(--color-border-primary) !important;
  border-radius: var(--radius-lg, 0.5rem) !important;
  box-shadow: var(--shadow-elevation-3000) !important;
}
.notebook-app-scope .NotebookPublicView {
  /* Same stack as tailwind.config.js fontFamily.sans / blog ReaderView */
  --font-sans: 'RoundHog', -apple-system, BlinkMacSystemFont, 'avenir next', avenir, 'segoe ui', 'helvetica neue', helvetica, Ubuntu, roboto, noto, arial, sans-serif;
  --font-title: var(--font-sans);
  --font-button: var(--font-sans);
  --markdown-notebook-inline-control-width: 0px;
  --markdown-notebook-inline-control-gap: 0px;
  --markdown-notebook-content-offset: 0px;
  --color-text-primary: rgb(var(--text-primary));
  --text-3000: rgb(var(--text-primary));
  --tw-prose-body: rgb(var(--text-primary));
  --tw-prose-headings: rgb(var(--text-primary));
  --tw-prose-bold: rgb(var(--text-primary));
  --tw-prose-quotes: rgb(var(--text-primary));
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-block,
.notebook-app-scope .NotebookPublicView .prose {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  letter-spacing: normal !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group {
  font-size: 15px !important;
  line-height: 1.5 !important;
}
.notebook-app-scope[data-notebook-font='sm'] .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope[data-notebook-font='md'] .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope[data-notebook-font='lg'] .NotebookPublicView .MarkdownNotebook {
  font-size: 15px !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-block {
  grid-column: 1;
  padding-left: 0;
  padding-right: 0;
  line-height: 1.5 !important;
  color: rgb(var(--text-primary)) !important;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-row {
  grid-template-columns: minmax(0, 1fr);
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__canvas {
  max-width: none;
  margin: 0;
}
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__insert-boundary {
  height: 0;
  min-height: 0;
}
.notebook-app-scope .NotebookPublicView__article,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__main,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__canvas,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-group,
.notebook-app-scope .NotebookPublicView .MarkdownNotebook__text-row {
  margin-left: 0 !important;
  padding-left: 0 !important;
  max-width: none !important;
}
.notebook-app-scope .NotebookPublicView__title {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1rem !important;
  font-weight: 600 !important;
  line-height: 1.35 !important;
  letter-spacing: normal !important;
  margin: 0 0 0.75rem !important;
}
.notebook-app-scope .NotebookPublicView h2.MarkdownNotebook__text-block--heading {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1.4285714em !important;
  font-weight: 700 !important;
  line-height: 1.4 !important;
  letter-spacing: normal !important;
}
.notebook-app-scope .NotebookPublicView h3.MarkdownNotebook__text-block--heading {
  font-family: var(--font-sans);
  color: rgb(var(--text-primary));
  font-size: 1.2857143em !important;
  font-weight: 700 !important;
  line-height: 1.5555556 !important;
  letter-spacing: normal !important;
}
/* Portaled popovers may sit outside [data-scheme]; pin light/dark to host html class */
html.light .notebook-app-scope,
.light .notebook-app-scope:not(.dark) {
  --border: 192 192 192;
  --input-border: 210 210 210;
  --color-bg-surface-primary: #ffffff;
  --color-bg-surface-secondary: #ffffff;
  --color-bg-surface-tertiary: #f5f5f5;
  --color-bg-surface-popover: #ffffff;
  --color-bg-fill-primary: #ffffff;
  --color-bg-fill-secondary: #f5f5f5;
  --color-bg-fill-tertiary: #f5f5f5;
  --color-bg-fill-input: #ffffff;
  --color-bg-fill-button-secondary: #f5f5f5;
  --color-bg-fill-button-secondary-hover: #eeeeee;
  --secondary-3000-button-border: #e0e0e0;
  --secondary-3000-button-border-hover: #cfcfcf;
  --secondary-3000-frame-bg: #f0f0f0;
  --border-3000: #e0e0e0;
  --border-bold-3000: #cfcfcf;
  --color-border-primary: #e0e0e0;
  --color-border-secondary: #cfcfcf;
}
html.dark .notebook-app-scope,
.dark .notebook-app-scope,
.notebook-app-scope.dark,
[data-notebook-host-theme='dark'] .notebook-app-scope,
[theme='dark'].notebook-app-scope {
  --border: 62 66 79;
  --input-border: 50 52 63;
  --color-bg-surface-primary: #1e1f23;
  --color-bg-surface-secondary: #232429;
  --color-bg-surface-tertiary: #2a2b31;
  --color-bg-surface-popover: #1e1f23;
  --color-bg-fill-primary: #1e1f23;
  --color-bg-fill-secondary: #232429;
  --color-bg-fill-tertiary: #2a2b31;
  --color-bg-fill-input: #232429;
  --color-bg-fill-button-secondary: #232429;
  --color-bg-fill-button-secondary-hover: #2a2b31;
  --secondary-3000-button-border: #3e424f;
  --secondary-3000-button-border-hover: #4a4e5c;
  --secondary-3000-frame-bg: #232429;
  --border-3000: #3e424f;
  --border-bold-3000: #4a4e5c;
  --color-border-primary: #3e424f;
  --color-border-secondary: #4a4e5c;
  --color-text-primary: #fafafa;
  --text-3000: #fafafa;
  --shadow-elevation-3000: 0 6px 22px rgba(0, 0, 0, 0.28);
  --os-frosted-bg: color-mix(in sRGB, var(--color-bg-surface-primary, #1e1f23) 75%, transparent);
  --bg-light: #232429;
  --bg-3000: #141518;
}

html.dark .MarkdownNotebook,
.dark .MarkdownNotebook,
[data-notebook-host-theme='dark'] .MarkdownNotebook,
[theme='dark'] .MarkdownNotebook {
  --markdown-notebook-component-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-component-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-text-group-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-text-group-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-text-group-shadow: none;
  --markdown-notebook-code-background: var(--color-bg-surface-tertiary, #2a2b31);
  --markdown-notebook-code-border: var(--color-border-primary, #3e424f);
  --markdown-notebook-code-shadow: none;
  --bg-light: var(--color-bg-surface-secondary, #232429);
}

html.dark .MarkdownNotebook__wim-block,
.dark .MarkdownNotebook__wim-block,
[data-notebook-host-theme='dark'] .MarkdownNotebook__wim-block {
  background: var(--color-bg-surface-primary, #1e1f23) !important;
}
.notebook-app-scope.Popover,
.Popover.notebook-app-scope,
.Popover {
  --z-popover: 999999 !important;
  z-index: 999999 !important;
}
.notebook-app-scope.Popover > .Popover__box,
.Popover.notebook-app-scope > .Popover__box {
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-popover) 75%, transparent)) !important;
  border-color: var(--secondary-3000-button-border) !important;
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}
.notebook-app-scope .notebook-outline-flash {
  outline: 2px solid var(--color-accent, #1d4ed8);
  outline-offset: 4px;
  border-radius: 4px;
}
/* This-round OS polish: lists, empty states, InsertMenu density, accent highlights */
.notebook-app-scope {
  --highlight: var(--color-accent, #1d4ed8);
  --mark: var(--primary-highlight, rgb(29 78 216 / 22%));
  --color-bg-fill-primary-highlight: var(--primary-highlight, rgb(29 78 216 / 12%));
  --primary-highlight: rgb(29 78 216 / 12%);
}
html.dark .notebook-app-scope,
.dark .notebook-app-scope,
.notebook-app-scope.dark,
[data-notebook-host-theme='dark'] .notebook-app-scope {
  --highlight: var(--color-accent, #3b82f6);
  --mark: var(--primary-highlight, rgb(59 130 246 / 24%));
  --primary-highlight: rgb(59 130 246 / 14%);
  --color-bg-fill-primary-highlight: var(--primary-highlight, rgb(59 130 246 / 14%));
}
.notebook-app-scope .MarkdownNotebook__insert-category h5 {
  padding: 2px 6px 1px;
  font-size: 10px;
  letter-spacing: 0.03em;
  color: var(--color-text-tertiary, var(--color-text-secondary));
}
.notebook-app-scope .MarkdownNotebook__insert-item {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 28px;
  height: 28px;
  padding: 4px 6px;
  border-radius: var(--radius-sm, 5px);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.2;
}
.notebook-app-scope .MarkdownNotebook__insert-item-icon {
  display: inline-flex;
  flex: 0 0 16px;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin: 0;
  opacity: 0.7;
}
.notebook-app-scope .MarkdownNotebook__insert-item-icon svg {
  width: 14px;
  height: 14px;
}
.notebook-app-scope .MarkdownNotebook__list-block li {
  margin: 0;
  padding: 0.05rem 0;
  line-height: 1.45;
}
.notebook-app-scope .MarkdownNotebook__list-item-content {
  min-height: 1.4em;
  padding: 0.05rem 0.2rem;
  border-radius: var(--radius-sm, 0.3125rem);
  transition: background 100ms ease;
}
.notebook-app-scope .MarkdownNotebook__list-item-content:hover {
  background: var(--color-bg-fill-button-tertiary-hover, rgba(0, 0, 0, 0.04));
}
.notebook-app-scope .MarkdownNotebook__list-item-content:focus {
  background: var(--primary-highlight, rgb(29 78 216 / 10%));
}
.notebook-app-scope .MarkdownNotebook__task-checkbox {
  top: calc(0.1rem + 0.22em);
  left: -1.25rem;
}
.notebook-app-scope .MarkdownNotebook__task-checkbox input {
  width: 0.875rem;
  height: 0.875rem;
  margin: 0;
  accent-color: var(--color-accent, var(--primary, #1d4ed8));
  border-radius: 3px;
}
.notebook-app-scope .LemonTable__empty-state,
.notebook-app-scope .MarkdownNotebook__empty-menu,
.notebook-app-scope .notebook-tools-sidebar p.text-muted,
.notebook-app-scope .notebook-outline p.text-muted {
  font-family: var(--font-sans) !important;
  color: var(--color-text-secondary, #6b7280);
}
.notebook-app-scope .LemonTable__empty-state {
  padding: 1.25rem 0.75rem !important;
}
.notebook-app-scope .LemonTable__empty-state .text-primary,
.notebook-app-scope .LemonTable__empty-state .font-semibold,
.notebook-app-scope .LemonTable__empty-state .font-medium {
  font-family: var(--font-sans);
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280) !important;
}
.notebook-app-scope .LemonTable__empty-state .text-muted,
.notebook-app-scope .LemonTable__empty-state .text-xs {
  font-family: var(--font-sans);
  color: var(--color-text-tertiary, #9ca3af) !important;
}
.notebook-app-scope .LemonTable__empty-state > div {
  gap: 0.5rem !important;
  padding-top: 1.5rem !important;
  padding-bottom: 1.5rem !important;
}
.notebook-app-scope .MarkdownNotebook__empty-menu {
  padding: 0.4rem 0.35rem;
  font-size: 12px;
  text-align: center;
}
.notebook-app-scope .MarkdownNotebook ::selection,
.notebook-app-scope .MarkdownNotebook__text-group ::selection,
.notebook-app-scope .MarkdownNotebook__list-item-content ::selection {
  background: var(--primary-highlight, rgb(29 78 216 / 22%));
  color: inherit;
}
.notebook-app-scope .MarkdownNotebook__ref {
  background: var(--primary-highlight, rgb(29 78 216 / 12%));
  border-bottom-color: color-mix(in sRGB, var(--color-accent, #1d4ed8) 55%, transparent);
}
.notebook-app-scope .MarkdownNotebook__ref--active,
.notebook-app-scope .MarkdownNotebook__ref:hover {
  background: color-mix(in sRGB, var(--color-accent, #1d4ed8) 18%, transparent);
}
.notebook-app-scope .MarkdownNotebook__code-ref-highlight {
  background: var(--primary-highlight, rgb(29 78 216 / 12%));
  border-bottom-color: color-mix(in sRGB, var(--color-accent, #1d4ed8) 55%, transparent);
}
.notebook-app-scope .MarkdownNotebook__insert-item-highlight {
  background: var(--mark, var(--primary-highlight, rgb(29 78 216 / 22%)));
}
.notebook-app-scope .MarkdownNotebook__ref--flash {
  background: var(--primary-highlight, rgb(29 78 216 / 14%));
}
/* This-round: frosted surfaces, flat inputs, site scrollbars, OS cards/dividers */
body[data-reduce-transparency='true'] .notebook-app-scope,
html[data-reduce-transparency='true'] .notebook-app-scope {
  --os-frosted-bg: var(--color-bg-surface-primary, #fff);
  --os-frosted-blur: none;
}
@media (prefers-reduced-transparency: reduce) {
  .notebook-app-scope {
    --os-frosted-bg: var(--color-bg-surface-primary, #fff);
    --os-frosted-blur: none;
  }
}
.notebook-app-scope.App,
.notebook-app-scope .App {
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary, #fff) 75%, transparent));
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}
.notebook-app-scope .MarkdownNotebook__text-group {
  background: transparent;
  border: none;
  border-radius: 0;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.notebook-app-scope .LemonInput {
  background-color: var(--color-bg-fill-input, #fff) !important;
  border: 1px solid rgb(var(--border)) !important;
  border-radius: var(--radius-sm, 0.3125rem) !important;
  box-shadow: none !important;
}
.notebook-app-scope .LemonInput.LemonInput--focused:not([aria-disabled='true']),
.notebook-app-scope .LemonInput:focus-within:not([aria-disabled='true']) {
  border-color: color-mix(in sRGB, var(--color-accent, #1d4ed8) 55%, rgb(var(--border))) !important;
  box-shadow: 0 0 0 3px var(--primary-highlight, rgb(29 78 216 / 12%)) !important;
}
.notebook-app-scope .notebook-rail-search input,
.notebook-app-scope .notebook-tools-sidebar input[type='search'],
.notebook-app-scope .notebook-tools-sidebar input[type='text'],
.notebook-app-scope .MarkdownNotebook__format-link-input input,
.notebook-app-scope .LemonTextArea textarea {
  background: var(--color-bg-fill-input, rgb(var(--input-bg, var(--bg, 255 255 255)))) !important;
  border: 1px solid rgb(var(--border)) !important;
  border-radius: var(--radius-sm, 0.3125rem) !important;
  box-shadow: none !important;
  outline: none;
}
.notebook-app-scope .notebook-rail-search input:focus,
.notebook-app-scope .notebook-tools-sidebar input[type='search']:focus,
.notebook-app-scope .notebook-tools-sidebar input[type='text']:focus,
.notebook-app-scope .MarkdownNotebook__format-link-input input:focus,
.notebook-app-scope .LemonTextArea textarea:focus {
  border-color: color-mix(in sRGB, var(--color-accent, #1d4ed8) 55%, rgb(var(--border))) !important;
  box-shadow: 0 0 0 3px var(--primary-highlight, rgb(29 78 216 / 12%)) !important;
}
.notebook-app-scope {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--text-primary, 17 17 17) / 0.28) transparent;
}
.notebook-app-scope ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.notebook-app-scope ::-webkit-scrollbar-track {
  background: transparent;
  box-shadow: none;
}
.notebook-app-scope ::-webkit-scrollbar-thumb {
  background-color: rgb(var(--text-primary, 17 17 17) / 0.28);
  background-clip: padding-box;
  border: 2px solid transparent;
  border-radius: 9999px;
}
.notebook-app-scope ::-webkit-scrollbar-thumb:hover {
  background-color: rgb(var(--text-primary, 17 17 17) / 0.4);
}
.notebook-app-scope ::-webkit-scrollbar-corner {
  background: transparent;
}
.notebook-app-scope .LemonDivider {
  background: rgb(var(--border)) !important;
}
.notebook-app-scope .MarkdownNotebook__format-divider {
  background: rgb(var(--border)) !important;
}
.notebook-app-scope .MarkdownNotebook__divider-block hr {
  border-top: 1px solid var(--color-border-primary, rgb(var(--border))) !important;
}
.notebook-app-scope .LemonCard,
.notebook-app-scope .LemonBanner,
.notebook-app-scope .LemonCollapse {
  border-color: var(--color-border-primary, rgb(var(--border))) !important;
  border-radius: var(--radius, 0.375rem) !important;
  box-shadow: none !important;
}
.notebook-app-scope .LemonModal__box,
.notebook-app-scope .LemonModal .LemonModal__box {
  background: var(--os-frosted-bg, color-mix(in sRGB, var(--color-bg-surface-primary) 75%, transparent)) !important;
  backdrop-filter: var(--os-frosted-blur, blur(64px));
  -webkit-backdrop-filter: var(--os-frosted-blur, blur(64px));
}

/* This-round: quiet editor handles / boundaries / selection / placeholders / code chips */
.notebook-app-scope .MarkdownNotebook__drag-handle {
  width: 1rem;
  height: 1rem;
  top: 0.2rem;
  color: var(--color-text-tertiary, var(--color-text-secondary, #9ca3af));
  border-radius: var(--radius-sm, 0.3125rem);
  opacity: 0;
  transition: opacity 100ms ease, background 100ms ease, color 100ms ease;
}
.notebook-app-scope .MarkdownNotebook__drag-handle svg {
  width: 0.75rem;
  height: 0.75rem;
}
.notebook-app-scope .MarkdownNotebook__row:hover .MarkdownNotebook__drag-handle {
  opacity: 0.35;
}
.notebook-app-scope .MarkdownNotebook__drag-handle:hover,
.notebook-app-scope .MarkdownNotebook__drag-handle:focus-visible {
  opacity: 1;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-bg-fill-button-tertiary-hover, rgba(0, 0, 0, 0.06));
}
.notebook-app-scope .MarkdownNotebook__drag-handle:active {
  opacity: 1;
  background: var(--color-bg-fill-button-tertiary-active, rgba(0, 0, 0, 0.1));
}
.notebook-app-scope .MarkdownNotebook__line-insert-menu-button {
  color: var(--color-text-tertiary, var(--color-text-secondary));
  --lemon-button-chrome-depth: 0px;
  --lemon-button-hover-depth: 0px;
  --lemon-button-press-depth: 0px;
  --lemon-button-frame-bg-color: transparent;
}
.notebook-app-scope .MarkdownNotebook__text-row--inline-menu-visible .MarkdownNotebook__line-insert-menu-button {
  opacity: 0.28;
}
.notebook-app-scope .MarkdownNotebook__line-insert-menu-hit-area:hover .MarkdownNotebook__line-insert-menu-button,
.notebook-app-scope .MarkdownNotebook__text-row--inline-menu-visible .MarkdownNotebook__line-insert-menu-button:hover,
.notebook-app-scope .MarkdownNotebook__line-insert-menu-button[aria-expanded='true'],
.notebook-app-scope .MarkdownNotebook__line-insert-menu-button:focus-visible {
  opacity: 1;
  color: var(--color-accent, #1d4ed8);
  background: var(--color-bg-fill-button-tertiary-hover, rgba(0, 0, 0, 0.06));
  border-radius: var(--radius-sm, 0.3125rem);
}
.notebook-app-scope .MarkdownNotebook__insert-boundary {
  height: 0.2rem;
}
.notebook-app-scope .MarkdownNotebook__insert-boundary:last-child {
  height: 1.5rem;
  margin: 0.15rem 0;
}
.notebook-app-scope .MarkdownNotebook__insert-boundary:last-child::before {
  border-top: 1px solid var(--color-border-primary, rgb(var(--border)));
  opacity: 0;
  transition: opacity 120ms ease, border-color 120ms ease;
}
.notebook-app-scope .MarkdownNotebook__insert-boundary:last-child:hover::before {
  border-top-color: var(--color-accent, #1d4ed8);
  opacity: 0.45;
}
.notebook-app-scope .MarkdownNotebook__insert-boundary-button {
  padding: 0.15rem 0.55rem;
  font-family: var(--font-sans);
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-secondary, #6b7280);
  background: var(--color-bg-surface-secondary, var(--color-bg-surface-primary));
  border: 1px solid var(--color-border-primary, rgb(var(--border)));
  border-radius: var(--radius-sm, 0.3125rem);
  box-shadow: none;
  transition: opacity 120ms ease, color 120ms ease, border-color 120ms ease, background 120ms ease;
}
.notebook-app-scope .MarkdownNotebook__insert-boundary-button:hover {
  color: var(--color-accent, #1d4ed8);
  background: var(--primary-highlight, rgb(29 78 216 / 10%));
  border-color: color-mix(in sRGB, var(--color-accent, #1d4ed8) 45%, var(--color-border-primary, rgb(var(--border))));
  box-shadow: none;
  transform: translate(-50%, -50%);
}
.notebook-app-scope .MarkdownNotebook__drop-indicator {
  height: 0.125rem;
  background: var(--color-accent, #1d4ed8);
  border-radius: 1px;
  opacity: 0.85;
}
.notebook-app-scope .MarkdownNotebook__component-shell:focus::after,
.notebook-app-scope .MarkdownNotebook__component-shell--selected::after,
.notebook-app-scope .MarkdownNotebook__divider-block:focus::after,
.notebook-app-scope .MarkdownNotebook__divider-block--selected::after,
.notebook-app-scope .MarkdownNotebook__comment-block:focus::after,
.notebook-app-scope .MarkdownNotebook__comment-block--selected::after {
  box-shadow: inset 0 0 0 1.5px color-mix(in sRGB, var(--color-accent, #1d4ed8) 55%, transparent),
    0 0 0 3px var(--primary-highlight, rgb(29 78 216 / 12%));
}
.notebook-app-scope .MarkdownNotebook__component-shell:focus-visible {
  box-shadow: 0 0 0 3px var(--primary-highlight, rgb(29 78 216 / 12%));
}
.notebook-app-scope .MarkdownNotebook__table-cell-content:focus {
  background: var(--primary-highlight, rgb(29 78 216 / 10%));
  box-shadow: inset 0 0 0 1px color-mix(in sRGB, var(--color-accent, #1d4ed8) 50%, transparent);
}
.notebook-app-scope .ProseMirror .selectedCell::after,
.notebook-app-scope .ProseMirror-selectednode {
  background: var(--primary-highlight, rgb(29 78 216 / 14%)) !important;
  outline: 1.5px solid color-mix(in sRGB, var(--color-accent, #1d4ed8) 50%, transparent);
  outline-offset: 1px;
  box-shadow: none;
}
.notebook-app-scope .NotebookEditor {
  border-color: var(--color-border-primary, rgb(var(--border)));
  border-radius: var(--radius, 0.375rem);
  box-shadow: none;
  font-family: var(--font-sans);
}
.notebook-app-scope .MarkdownNotebook__text-block:empty::before,
.notebook-app-scope .MarkdownNotebook__text-block--title:empty::before,
.notebook-app-scope .MarkdownNotebook__text-block--insert-placeholder:empty::before,
.notebook-app-scope .MarkdownNotebook__code-block:empty::before,
.notebook-app-scope .ProseMirror p.is-editor-empty:first-child::before,
.notebook-app-scope .MarkdownNotebook__component-toolbar-title--input::placeholder,
.notebook-app-scope .LemonInput input::placeholder,
.notebook-app-scope .LemonTextArea textarea::placeholder {
  font-family: var(--font-sans);
  color: var(--color-text-tertiary, rgb(var(--text-muted, 155 155 155))) !important;
  font-style: normal;
  opacity: 1;
}
.notebook-app-scope .MarkdownNotebook__code-block-actions > span {
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--color-text-secondary, #6b7280) !important;
  background: var(--color-bg-surface-secondary, #f5f5f5);
  border: 1px solid var(--color-border-primary, rgb(var(--border)));
  border-radius: var(--radius-sm, 0.3125rem);
  padding: 0.1rem 0.35rem;
}
.notebook-app-scope .MarkdownNotebook__code-block-actions .LemonButton,
.notebook-app-scope .MarkdownNotebook__table-structure-control,
.notebook-app-scope .MarkdownNotebook__line-insert-menu-button.LemonButton {
  --lemon-button-chrome-depth: 0px;
  --lemon-button-hover-depth: 0px;
  --lemon-button-press-depth: 0px;
  --lemon-button-frame-bg-color: transparent;
}
.notebook-app-scope .MarkdownNotebook__comment-chip {
  color: var(--color-text-secondary, #6b7280);
  background: var(--primary-highlight, rgb(29 78 216 / 10%));
  border: 1px dashed color-mix(in sRGB, var(--color-accent, #1d4ed8) 40%, var(--color-border-primary, rgb(var(--border))));
  border-radius: var(--radius-sm, 0.3125rem);
}
.notebook-app-scope .MarkdownNotebook__comment-chip svg {
  color: var(--color-accent, #1d4ed8);
}
.notebook-app-scope .MarkdownNotebook__comment-chip:hover {
  background: var(--primary-highlight, rgb(29 78 216 / 16%));
}
.notebook-app-scope .ProseMirror code {
  color: var(--color-accent, #1d4ed8);
  background: var(--primary-highlight, rgb(29 78 216 / 10%));
  border-radius: var(--radius-sm, 0.3125rem);
}
.notebook-app-scope .ProseMirror pre {
  background: var(--markdown-notebook-code-background, var(--color-bg-surface-secondary));
  border: 1px solid var(--markdown-notebook-code-border, var(--color-border-primary));
  border-radius: var(--radius, 0.375rem);
  box-shadow: none;
}
.notebook-app-scope .MarkdownNotebook__code-block {
  caret-color: var(--color-accent, #1d4ed8);
}
html.dark .notebook-app-scope .MarkdownNotebook__code-block-actions > span,
.dark .notebook-app-scope .MarkdownNotebook__code-block-actions > span,
.notebook-app-scope.dark .MarkdownNotebook__code-block-actions > span,
[data-notebook-host-theme='dark'] .notebook-app-scope .MarkdownNotebook__code-block-actions > span {
  background: var(--color-bg-surface-tertiary, #2a2b31);
  color: var(--color-text-secondary, #9ca3af) !important;
  border-color: var(--color-border-primary, #3e424f);
}
html.dark .notebook-app-scope .MarkdownNotebook__insert-boundary:last-child:hover::before,
.dark .notebook-app-scope .MarkdownNotebook__insert-boundary:last-child:hover::before,
[data-notebook-host-theme='dark'] .notebook-app-scope .MarkdownNotebook__insert-boundary:last-child:hover::before {
  border-top-color: var(--color-accent, #3b82f6);
}
html.dark .notebook-app-scope .MarkdownNotebook__component-shell:focus::after,
html.dark .notebook-app-scope .MarkdownNotebook__component-shell--selected::after,
.dark .notebook-app-scope .MarkdownNotebook__component-shell:focus::after,
.dark .notebook-app-scope .MarkdownNotebook__component-shell--selected::after,
[data-notebook-host-theme='dark'] .notebook-app-scope .MarkdownNotebook__component-shell:focus::after,
[data-notebook-host-theme='dark'] .notebook-app-scope .MarkdownNotebook__component-shell--selected::after {
  box-shadow: inset 0 0 0 1.5px color-mix(in sRGB, var(--color-accent, #3b82f6) 55%, transparent),
    0 0 0 3px var(--primary-highlight, rgb(59 130 246 / 14%));
}
@media print {
  .notebook-app-scope .notebook-outline,
  .notebook-app-scope .notebook-tools-sidebar,
  .notebook-app-scope .MarkdownNotebook__format-toolbar,
  .notebook-app-scope .MarkdownNotebook__insert-menu,
  .notebook-app-scope .MarkdownNotebook__invite-picker {
    display: none !important;
  }
}
`

let injectCount = 0

export function ensureLemonStyles(): void {
    if (typeof document === 'undefined') return

    injectCount += 1

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement('style')
        style.id = STYLE_ID
        style.setAttribute('data-lemon-ui', 'true')
        style.innerHTML = NOTEBOOK_APP_CSS
        document.head.appendChild(style)
    }

    const existingPalette = document.getElementById(PALETTE_STYLE_ID)
    if (existingPalette) {
        existingPalette.innerHTML = NOTEBOOK_PALETTE_CSS
    } else {
        const palette = document.createElement('style')
        palette.id = PALETTE_STYLE_ID
        palette.setAttribute('data-lemon-ui-palette', 'true')
        palette.innerHTML = NOTEBOOK_PALETTE_CSS
        document.head.appendChild(palette)
    }
}

/**
 * Ref-count release. CSS stays cached (parse is expensive ~400KB).
 * Does not touch body classes.
 */
export function releaseLemonStyles(): void {
    if (typeof document === 'undefined') return
    injectCount = Math.max(0, injectCount - 1)
}

export function isLemonStylesMounted(): boolean {
    return typeof document !== 'undefined' && !!document.getElementById(STYLE_ID)
}