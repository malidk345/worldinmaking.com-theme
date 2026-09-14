1. **Modify `src/components/ClaudeWorkspaceChat/components/Header.tsx`**
   - Use `replace_with_git_merge_diff` to add `agentMode`, `onChangeAgentMode`, and `isPlanLocked` to `HeaderProps`.
   - Update the UI to render the segmented control/badge on the right side.
   - Use `bg-primary` for the dot rather than `bg-blue-500/50`.
   - SEARCH/REPLACE blocks:
```
<<<<<<< SEARCH
import React from 'react'
import { PanelLeft } from 'lucide-react'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle }) => {
    return (
        <header className="flex h-9 shrink-0 items-center gap-0.5 px-2 pr-24">
            <button
=======
import React from 'react'
import { PanelLeft } from 'lucide-react'
import type { AgentMode } from '../types'

interface HeaderProps {
    onToggleSidebar: () => void
    activeChatTitle?: string
    boundNotebookTitle?: string
    agentMode?: AgentMode
    onChangeAgentMode?: (mode: AgentMode) => void
    isPlanLocked?: boolean
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, activeChatTitle, boundNotebookTitle, agentMode, onChangeAgentMode, isPlanLocked }) => {
    return (
        <header className="flex h-9 shrink-0 items-center gap-0.5 px-2">
            <button
>>>>>>> REPLACE
```
and
```
<<<<<<< SEARCH
            <div className="min-w-0 flex-1 truncate px-1 text-[13px] text-secondary">
                {activeChatTitle || 'New chat'}
                {boundNotebookTitle ? (
                    <span className="text-muted"> · {boundNotebookTitle}</span>
                ) : null}
            </div>
        </header>
    )
}
=======
            <div className="min-w-0 flex-1 truncate px-1 text-[13px] text-secondary">
                {activeChatTitle || 'New chat'}
                {boundNotebookTitle ? (
                    <span className="text-muted"> · {boundNotebookTitle}</span>
                ) : null}
            </div>

            <div className="flex items-center gap-2">
                {isPlanLocked ? (
                    <div className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent text-muted border border-black/5 dark:border-white/5 flex items-center gap-1.5 shadow-sm">
                        <div className="size-1.5 rounded-full bg-primary/50 animate-pulse" />
                        <span>Plan Active</span>
                    </div>
                ) : onChangeAgentMode ? (
                    <div className="flex bg-accent/50 p-0.5 rounded-full border border-black/5 dark:border-white/5">
                        {(['ask', 'plan', 'execute'] as AgentMode[]).map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                onClick={() => onChangeAgentMode(mode)}
                                className={`px-3 py-1 text-[11px] font-medium rounded-full transition-all capitalize ${
                                    agentMode === mode
                                        ? 'bg-white dark:bg-[#121214] text-primary shadow-sm border border-black/5 dark:border-white/5'
                                        : 'text-secondary hover:text-primary'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                ) : null}
            </div>
        </header>
    )
}
>>>>>>> REPLACE
```

2. **Modify `src/components/ClaudeWorkspaceChat/index.tsx`**
   - Use `replace_with_git_merge_diff` to calculate `isPlanLocked` and pass the new props to `<Header>`.
   - `isStreaming` is a state variable in `index.tsx`, and `Message` does have an optional `humanTurn?: HumanTurn` property which includes `status`. So `isStreaming || activeChat?.messages.some((m) => m.humanTurn?.status === 'pending')` is grounded because I checked `types.ts` and `index.tsx` already. (e.g., `Message` interface explicitly has `humanTurn?: HumanTurn`, and `HumanTurn` has `status: 'pending' | 'approved' | 'revised'`).
   - SEARCH/REPLACE blocks:
```
<<<<<<< SEARCH
        {/* Top Header Bar */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeChatTitle={activeChat?.title}
          boundNotebookTitle={notebookBind?.title}
        />
=======
        {/* Top Header Bar */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          activeChatTitle={activeChat?.title}
          boundNotebookTitle={notebookBind?.title}
          agentMode={activeChat?.agentMode || 'ask'}
          isPlanLocked={Boolean(isStreaming || activeChat?.messages.some((m) => m.humanTurn?.status === 'pending'))}
          onChangeAgentMode={(mode) => {
            if (activeChatId) {
              setChats((prev) =>
                prev.map((c) => (c.id === activeChatId ? { ...c, agentMode: mode } : c))
              );
            }
          }}
        />
>>>>>>> REPLACE
```

3. **Verify the work**
   - I will run tests using:
     - `pnpm vitest run --passWithNoTests`
     - `pnpm run test:smoke`
     - `pnpm run typecheck:shell`

4. **Complete pre commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

5. **Submit pull request**
   - I will submit the PR via the submit tool with a descriptive branch name and commit message.
