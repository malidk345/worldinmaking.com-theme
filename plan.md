1. **Optimize `emojiUsageLogic.ts` using `replace_with_git_merge_diff`**
   - Replace chained `Object.entries(usedEmojis).map(...).sort(...).slice(...).map(...)` with standard arrays and `.push()`, `.sort()`, `.slice()`, and mapping.
   - Refactor `emojiUsed` reducer to avoid `[...newState[emoji], currentTime]` using `.push()`.
   ```javascript
<<<<<<< SEARCH
                    const newState = { ...state, [emoji]: state[emoji] || [] }
                    newState[emoji] = [...newState[emoji], currentTime]

                    newState[emoji] = newState[emoji].filter((timestamp: number) => timestamp > thirtyDaysAgo)
=======
                    const newState = { ...state }
                    const currentEmojiTimestamps = newState[emoji] ? [...newState[emoji]] : []
                    currentEmojiTimestamps.push(currentTime)
                    newState[emoji] = currentEmojiTimestamps.filter((timestamp: number) => timestamp > thirtyDaysAgo)
>>>>>>> REPLACE
   ```
   ```javascript
<<<<<<< SEARCH
            (usedEmojis: Record<string, number[]>): string[] => {
                // Get user's favorite emojis sorted by usage count
                const userFavorites = Object.entries(usedEmojis)
                    .map(([emoji, timestamps]) => ({
                        emoji,
                        count: timestamps.length,
                    }))
                    .sort((a, b) => b.count - a.count) // Sort by usage count descending
                    .slice(0, 5) // Take top 5
                    .map(({ emoji }) => emoji) // Extract just the emoji strings

                // If we have fewer than 5 favorites, fill with quickEmojis (avoiding duplicates)
=======
            (usedEmojis: Record<string, number[]>): string[] => {
                // Get user's favorite emojis sorted by usage count
                const items: {emoji: string, count: number}[] = []
                for (const emoji in usedEmojis) {
                    items.push({ emoji, count: usedEmojis[emoji].length })
                }
                const userFavorites = items.sort((a, b) => b.count - a.count).slice(0, 5).map(i => i.emoji)

                // If we have fewer than 5 favorites, fill with quickEmojis (avoiding duplicates)
>>>>>>> REPLACE
   ```

2. **Optimize `componentPanels.ts` using `replace_with_git_merge_diff`**
   - Replace `Object.entries(props).reduce(...)` with a `for...in` loop.
   ```javascript
<<<<<<< SEARCH
    const nextProps = Object.entries(props).reduce<NotebookComponentProps>((accumulator, [key, value]) => {
        if (key !== 'view' && key !== 'edit' && key !== 'hideFilters' && key !== 'hideResults') {
            accumulator[key] = value
        }
        return accumulator
    }, {})
=======
    const nextProps: NotebookComponentProps = {}
    for (const key in props) {
        if (key !== 'view' && key !== 'edit' && key !== 'hideFilters' && key !== 'hideResults') {
            nextProps[key] = props[key]
        }
    }
>>>>>>> REPLACE
   ```

3. **Optimize `markdown.ts` using `replace_with_git_merge_diff`**
   - Replace `Object.entries(props).reduce(...)` with a `for...in` loop.
   ```javascript
<<<<<<< SEARCH
    const nextProps = Object.entries(props).reduce<NotebookComponentProps>((accumulator, [key, value]) => {
        if (key !== 'view' && key !== 'edit' && key !== 'hideFilters' && key !== 'hideResults') {
            accumulator[key] = value
        }
        return accumulator
    }, {})
=======
    const nextProps: NotebookComponentProps = {}
    for (const key in props) {
        if (key !== 'view' && key !== 'edit' && key !== 'hideFilters' && key !== 'hideResults') {
            nextProps[key] = props[key]
        }
    }
>>>>>>> REPLACE
   ```

4. **Optimize `objects.ts` object flattening & diffing using `replace_with_git_merge_diff`**
   - Replace `Object.entries(obj).reduce(...)` with `for...in` loop.
   ```javascript
<<<<<<< SEARCH
export const removeUndefinedAndNull = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedAndNull)
    } else if (obj && typeof obj === 'object') {
        return Object.entries(obj).reduce(
            (acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = removeUndefinedAndNull(value)
                }
                return acc
            },
            {} as Record<string, any>
        )
    }
    return obj
}
=======
export const removeUndefinedAndNull = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(removeUndefinedAndNull)
    } else if (obj && typeof obj === 'object') {
        const acc: Record<string, any> = {}
        for (const key in obj) {
            const value = obj[key]
            if (value !== undefined && value !== null) {
                acc[key] = removeUndefinedAndNull(value)
            }
        }
        return acc
    }
    return obj
}
>>>>>>> REPLACE
   ```
   ```javascript
<<<<<<< SEARCH
export function flattenObject<T extends Record<string, any>>(obj: T): Record<string, any> {
    return Object.entries(obj).reduce<Record<string, any>>((acc, [key, value]) => {
        if (value !== null && typeof value === 'object') {
            const flatChild = flattenObject(value)
            const normalizedKey = /^\d+$/.test(key) ? key.padStart(3, '0') : key

            Object.entries(flatChild).forEach(([subKey, subVal]) => {
                acc[`${normalizedKey}.${subKey}`] = subVal
            })
            return acc
        }

        acc[key] = value
        return acc
    }, {})
}
=======
export function flattenObject<T extends Record<string, any>>(obj: T): Record<string, any> {
    const acc: Record<string, any> = {}
    for (const key in obj) {
        const value = obj[key]
        if (value !== null && typeof value === 'object') {
            const flatChild = flattenObject(value)
            const normalizedKey = /^\d+$/.test(key) ? key.padStart(3, '0') : key
            for (const subKey in flatChild) {
                acc[`${normalizedKey}.${subKey}`] = flatChild[subKey]
            }
        } else {
            acc[key] = value
        }
    }
    return acc
}
>>>>>>> REPLACE
   ```

5. **Optimize `icons3000.stories.tsx` & `InsertMenu.tsx` component mapping using `replace_with_git_merge_diff`**
   - For `InsertMenu.tsx`, move `Object.entries(commandsByCategory)` to `useMemo`.
   ```javascript
<<<<<<< SEARCH
    const commandsByCategory = useMemo(() => groupInsertCommandsByCategory(filteredCommands), [filteredCommands])
    const selectedCommandIndex = getClampedInsertMenuSelectedIndex(selectedIndex, filteredCommands.length)
=======
    const commandsByCategory = useMemo(() => groupInsertCommandsByCategory(filteredCommands), [filteredCommands])
    const commandsByCategoryEntries = useMemo(() => Object.entries(commandsByCategory), [commandsByCategory])
    const selectedCommandIndex = getClampedInsertMenuSelectedIndex(selectedIndex, filteredCommands.length)
>>>>>>> REPLACE
   ```
   ```javascript
<<<<<<< SEARCH
            {Object.entries(commandsByCategory).map(([category, categoryCommands]) => (
                <div key={category} className="MarkdownNotebook__insert-category">
=======
            {commandsByCategoryEntries.map(([category, categoryCommands]) => (
                <div key={category} className="MarkdownNotebook__insert-category">
>>>>>>> REPLACE
   ```

6. **Run relevant tests**
   - Execute `pnpm run test:smoke` or typecheck to ensure code correctness and avoid regressions.

7. **Complete pre-commit steps**
   - Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.

8. **Submit changes**
   - Submit the changes using the submit tool.
