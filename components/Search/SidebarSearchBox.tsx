import React, { useEffect } from 'react'
import { useSearch } from './SearchContext'
import { Search as SearchIcon } from 'lucide-react'
import { SearchResultType } from './SearchContext'

const keyboardShortcut =
    'box-content p-[5px] border border-b-2 border-primary rounded-[3px] inline-flex text-primary/35 dark:text-primary-dark/40 font-sans text-[10px] items-center justify-center min-w-[1.25rem]'

const CmdK = ({ className }: { className?: string }) => (
    <span className={className}>⌘K</span>
)

const Ctrl = ({ className }: { className?: string }) => (
    <span className={className}>Ctrl</span>
)

const K = ({ className }: { className?: string }) => (
    <span className={className}>K</span>
)

type SearchBoxProps = {
    placeholder?: string
    filter?: SearchResultType
}

export const SidebarSearchBox: React.FC<SearchBoxProps> = ({ placeholder, filter }) => {
    const [isMac, setIsMac] = React.useState<boolean | undefined>(undefined)
    const { open } = useSearch()

    useEffect(() => {
        setIsMac(typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('macintosh'))
    }, [])

    return (
        <button
            type="button"
            onClick={() => open('sidebar', filter)}
            className="flex items-center m-0 mb-2 w-full text-sm text-primary/60 focus:outline-none border border-primary hover:border-primary/50 dark:hover:border-primary-dark/50 rounded-md relative active:top-[.5px] hover:scale-[1.005] active:scale-[1]"
        >
            <div className="absolute left-4 z-20">
                <SearchIcon className="w-4 h-4" />
            </div>

            <div className="flex items-center justify-between pl-10 pr-2 py-2 text-left text-[15px] font-medium text-primary/30 dark:text-primary-dark/30 bg-primary/50 dark:bg-accent-dark/50 dark:text-primary-dark w-full z-10 rounded-md">
                <span className="dark:opacity-50">
                    {placeholder || 'Search' + (filter === 'docs' ? ' docs' : '') + '...'}
                </span>
                {isMac !== undefined && (
                    <span className="hidden md:block">
                        {isMac ? (
                            <kbd className="">
                                <CmdK className={keyboardShortcut} />
                            </kbd>
                        ) : (
                            <kbd className="space-x-1">
                                <Ctrl className={keyboardShortcut} />
                                <K className={keyboardShortcut} />
                            </kbd>
                        )}
                    </span>
                )}
            </div>
        </button>
    )
}

export default SidebarSearchBox
