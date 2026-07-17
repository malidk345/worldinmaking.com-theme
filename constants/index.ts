export const PROSE_CORE = `prose prose-stone text-black dark:text-white/90 prose-headings:text-black dark:prose-headings:text-white prose-p:text-black dark:prose-p:text-white/90 prose-strong:text-black dark:prose-strong:text-white prose-a:text-primary dark:prose-a:text-white prose-a:font-medium hover:prose-a:underline prose-code:text-black dark:prose-code:text-white prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/5 dark:prose-pre:bg-[#1C1C1E] prose-pre:text-black dark:prose-pre:text-white prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-blockquote:text-black/80 dark:prose-blockquote:text-white/80 prose-blockquote:border-black/20 dark:prose-blockquote:border-white/20 prose-blockquote:font-normal prose-blockquote:not-italic prose-li:text-black dark:prose-li:text-white/90 prose-td:border-black/10 dark:prose-td:border-white/10 prose-th:border-black/10 dark:prose-th:border-white/10 prose-th:text-black dark:prose-th:text-white prose-hr:border-black/10 dark:prose-hr:border-white/10 transition-all prose-p:leading-normal prose-li:leading-normal prose-h1:tracking-tight prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-2 prose-h2:tracking-tight prose-h3:tracking-tight prose-img:m-0`

// Function to generate prose classes with size variations
export const getProseClasses = (size?: 'sm' | 'base' | 'lg') => {
    switch (size) {
        case 'base':
            return PROSE_CORE
        case 'lg':
            return `${PROSE_CORE} prose-lg`
        case 'sm':
        default:
            return `${PROSE_CORE} prose-sm prose-h1:text-2xl`
    }
}
