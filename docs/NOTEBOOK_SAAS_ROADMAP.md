<!--
===================================================================================
AI DIRECTIVE, DESIGN CONSTRAINTS & MULTI-AGENT HANDOFF PROTOCOL
===================================================================================
IMPORTANT FOR ALL AI MODELS (Claude, Gemini, Antigravity, GPT, DeepSeek, Cursor):

1. STRICT SEQUENTIAL EXECUTION:
   - AI models MUST execute roadmap phases STRICTLY IN ORDER (Phase 1 -> Phase 2 -> Phase 3 -> Phase 4).
   - Do NOT skip phases or attempt future phase features before previous phases pass verification (`pnpm typecheck:shell` / smoke tests).

2. MANDATORY CHANGE LOGGING & PROGRESS UPDATE:
   - Upon completing any phase or sub-task, the active AI model MUST UPDATE THIS FILE (`docs/NOTEBOOK_SAAS_ROADMAP.md`).
   - Log exact files created/modified, test status, and progress status (e.g. `[COMPLETED by <ModelName>]`).

3. NEXT AGENT HANDOFF INSTRUCTIONS:
   - Every active model MUST write a clear, actionable directive under the "CURRENT AGENT HANDOFF & NEXT STEP" section
     specifying EXACTLY what the NEXT AI model should do next.

4. STRICT STYLE GUIDE COMPLIANCE:
   - All code, components, and UI modifications MUST strictly follow `STYLEGUIDE.md`
     and the PostHog / WorldInMaking OS design tokens (`src/constants/frostedSurfaces.ts`, `src/styles/vars.scss`).
   - NEVER generate arbitrary, ad-hoc, or unapproved custom styles, font families, or off-palette colors.

5. ESTABLISHED UI LIBRARIES & ESTHETIC STANDARDS:
   - Use PostHog Lemon UI components (`@posthog/icons`, `LemonButton`, `LemonInput`, `LemonSelect`)
     and PostHog OS Button / Window primitives (`OSButton`, `OSFieldset`, `RadixUI`).
   - For editor styling, adhere STRICTLY to the established Quill.js shim / scoped CSS rules
     (`src/notebook-app/styles/quill-shim.css` and `src/notebook-app/styles/bundle.scss`).
===================================================================================
-->

# WorldInMaking Notebook — Craft-Grade Enterprise SaaS Documentation Roadmap

> **Architectural Vision:** Transform the WorldInMaking Notebook from a single-file markdown editor into a high-performance, block-based, local-first documentation & knowledge platform matching **Craft.do**, **Notion**, and **Reflect**.

---

## 📌 CURRENT AGENT HANDOFF & NEXT STEP FOR AI

- **Current Status:** `[PACKAGES A–C COMPLETE]` + human notebook invites
- **Last Model Action:** Human multi-writer invites shipped by Grok 4.6. Share modal invites by username/email or link; collaborators write through the existing markdown merge + presence; viewers are read-only. Philosopher invite-to-comment is unchanged.
- **Instruction for Next AI Agent:**
  > Optional follow-ups: comment @mentions, PDF export, more invite bots. Do not start a Yjs rewrite.

---

## 2. Phase Execution & Progress Tracker

| Phase | Milestone | Status | Completed By | Log / Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1.1** | Block Data Model & Core Types | `[COMPLETED]` | Jules | Define `NotebookBlock`, `BlockType`, and block tree interfaces in `src/notebook-app/types/blocks.ts` |
| **Phase 1.2** | Slash (`/`) Command System & Block Handles | `[COMPLETED]` | Antigravity | Built `SlashCommandMenu.tsx` & `BlockHandleMenu.tsx` block insertion & hover handles (`⋮⋮`) |
| **Phase 1.3** | Drag & Drop Reordering (`BlockDragContainer`) | `[COMPLETED]` | Antigravity | Built `BlockDragContainer.tsx` with drag preview & drop target reordering |
| **Phase 2.1** | Sub-pages & Craft Card Layouts | `[COMPLETED]` | Antigravity | Built `SubPageCardBlock.tsx` for Craft visual cards & sub-documents |
| **Phase 2.2** | Sidebar Tree & Global Search (`⌘K`) | `[COMPLETED]` | Antigravity | Built `SidebarPageTree.tsx` & `GlobalCommandPalette.tsx` for workspace tree & ⌘K search |
| **Phase 3.1** | Relational Database Tables | `[COMPLETED]` | Jules | Built `DatabaseTable.tsx`, `TableView.tsx` and `KanbanView.tsx` with typed columns |
| **Phase 4.1** | Realtime WebSockets & Inline Comments | `[COMPLETED]` | Grok 4.6 | Markdown three-way merge + Realtime/poll + presence carets + discussion threads. Not Yjs. |

---

## 1. Core Block Engine (Blok Bazlı Editör Mimarisi)

Craft.do'nun temelini oluşturan esnek, performanslı ve modüler blok mimarisi.

### 1.1 Block Data Model & CRDT Structure
Every document is structured as an ordered tree of typed blocks rather than a monolithic string:
```typescript
interface NotebookBlock {
    id: string; // UUID v4
    parentId: string | null; // Null for root level blocks
    type: BlockType;
    content: Record<string, unknown>; // Rich text delta / attributes
    children: string[]; // Child block IDs (nested structures)
    metadata: {
        createdAt: number;
        updatedAt: number;
        createdBy: string;
        color?: string;
        backgroundColor?: string;
    };
}

type BlockType =
    | 'paragraph'
    | 'heading_1' | 'heading_2' | 'heading_3'
    | 'bulleted_list' | 'numbered_list' | 'toggle_list'
    | 'subpage_card'
    | 'callout'
    | 'code_block'
    | 'table'
    | 'image' | 'file' | 'video'
    | 'divider'
    | 'quote'
    | 'embed';
```

### 1.2 Interactive Block Behaviors
- **Drag & Drop Block Reordering:** Smooth, GPU-accelerated block dragging using `@dnd-kit/core` with ghost previews.
- **Rich Slash (`/`) Command System:** Instant fuzzy search menu for block insertion (`/card`, `/table`, `/callout`, `/code`, `/toggle`, `/file`).
- **Floating Formatting Toolbar:** Contextual bubble menu appearing on text selection (Bold, Italic, Strikethrough, Code, Highlight, Link, AI Enhance).
- **Block Handle & Context Menu:** Hover handle (`⋮⋮`) per block allowing multi-block drag selection, color customization, duplication, and type transformation.

---

## 2. Information Architecture & Craft Card System

Craft.do'yu benzersiz kılan estetik doküman kartları, sınırsız hiyerarşi ve hızlı gezinme.

### 2.1 Nested Pages & Sub-documents
- **Unlimited Nesting Depth:** Any block can be converted into a sub-page or card containing its own block tree.
- **Craft-Style Visual Cards:** Sub-pages rendered as customizable cards with cover banners, custom background gradients, icon badges, and live content previews.
- **Dynamic Breadcrumbs:** Auto-updating navigation trail (`Workspace / Engineering / Specs / API V2`).

### 2.2 Navigation & Workspace Management
- **Sidebar Tree Navigation:** Drag-and-drop page tree with collapsible folders, favorites, and quick actions.
- **Global Command Palette (`⌘K` / `Ctrl+K`):** Instant spotlight search across all workspace blocks, documents, and system commands.
- **Multi-Tab / Window Support:** Open multiple document tabs or split views side-by-side within the OS environment.

---

## 3. Structured Data & Relational Tables (Databases)

Standart static tablolar yerine Craft & Notion seviyesinde esnek veritabanı tabloları.

### 3.1 Column Attribute Types
- **Text & Rich Text**
- **Single Select & Multi-Select Badges**
- **Date & Date Range (with reminders)**
- **User Assignee (`@mention`)**
- **Checkbox & Progress Bar**
- **File Attachment & Asset Preview**
- **Calculated Formula Columns (Sum, Average, Min, Max, Count)**

### 3.2 Dynamic Database Views
- **Table View:** Dense spreadsheet layout with inline editing.
- **Kanban Board View:** Group blocks/pages by select columns (e.g. Status: *Backlog -> In Progress -> Done*).
- **Gallery View:** Visual card grid for assets, design specs, and documentation hubs.

---

## 4. Real-time Collaboration & Multiplayer Engine

### 4.1 Realtime Synchronization
- **Local-first CRDT (Yjs + IndexedDB):** Zero-latency typing. All edits commit instantly to local storage and sync asynchronously via Supabase Realtime WebSockets.
- **Live Cursors & Selection Highlights:** See active collaborators' cursors, selection spans, and avatar indicators in real-time.
- **Conflict-Free Resolution:** Automatic merge resolution for concurrent edits without data loss.

### 4.2 Team Discussion & Granular Access Control
- **Inline Text Comments:** Highlight any text selection to start a threaded discussion with `@mentions` and notifications.
- **Granular RBAC Permissions:**
  - **Owner:** Full admin, billing, deletion rights.
  - **Editor:** Read, write, create sub-pages.
  - **Commenter:** Read, add inline comments.
  - **Viewer:** Read-only access.

---

## 5. Publishing, Public Web & Custom Domains

### 5.1 Production Publishing Pipeline
- **One-Click Public Share:** Publish any notebook as a high-speed, SEO-optimized public documentation page.
- **Custom Domains & Subdomains:** Map published notebooks to user domains (e.g., `docs.company.com`).
- **Passcode & Expiration Controls:** Protect public links with optional passwords or auto-expiry timers.
- **SEO & OpenGraph Customization:** Set custom meta titles, descriptions, and share images for public cards.

---

## 6. Enterprise Import, Export & Integrations

### 6.1 Native Export Formats
- **Clean Markdown (`.md`):** Portable, standard markdown zip with all image assets.
- **Pixel-Perfect PDF:** Professional print layout export with custom headers/footers.
- **HTML & JSON Bundle:** Full structure backup for data sovereignty.

### 6.2 Developer Platform & Workflows
- **REST & Webhook APIs:** Programmatically create, update, or append blocks to any document.
- **GitHub Auto-Sync:** Bi-directional sync between GitHub repository Markdown files and Notebook documents.

---

## 7. Change Log & AI Model Activity Record

| Date | Model | Phase / Action | Modified Files | Test Status |
| :--- | :--- | :--- | :--- | :--- |
| `2026-08-07` | Antigravity (Gemini 3.6 Flash) | Multi-Agent Handoff Protocol & Roadmap Init | `docs/NOTEBOOK_SAAS_ROADMAP.md` | PASS |
| `2026-08-07` | Jules | Block Data Model & Core Types | `src/notebook-app/types/blocks.ts`, `docs/NOTEBOOK_SAAS_ROADMAP.md` | PASS |
| `2026-08-08` | Jules | Relational Database Tables | `src/notebook-app/components/blocks/DatabaseTable/*`, `src/notebook-app/types/blocks.ts`, `docs/NOTEBOOK_SAAS_ROADMAP.md` | PASS |
| `2026-08-18` | Grok 4.6 (xAI) | Phase 4.1 live writing (Realtime + comments) | `notebookRemote.ts`, `notebookStorage.ts`, `notebookPresence.ts`, `DiscussionCommentBlock.tsx`, `App.tsx`, migration | PASS |
| `2026-08-18` | Grok 4.6 (xAI) | Package B writing blocks | `registry.tsx`, `WimWritingBlocks.tsx`, `writingBlockModel.ts`, upload API, extraInsertCommands | PASS |

---

*Document Managed by WorldInMaking Core Architecture Team.*
