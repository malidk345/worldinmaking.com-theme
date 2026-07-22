export const PROSE_CORE = `prose prose-base font-sans text-primary dark:text-primary prose-headings:font-title prose-headings:text-primary prose-p:text-primary prose-p:font-sans prose-p:text-[0.9375rem] md:prose-p:text-[1rem] prose-p:leading-[1.7] prose-strong:text-primary prose-a:text-[var(--link-3000,#1d4ed8)] prose-a:font-medium hover:prose-a:underline prose-code:text-primary prose-code:font-mono prose-code:bg-black/5 dark:prose-code:bg-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/5 dark:prose-pre:bg-white/5 prose-pre:text-primary prose-pre:border prose-pre:border-black/10 dark:prose-pre:border-white/10 prose-blockquote:text-secondary prose-blockquote:border-black/20 dark:prose-blockquote:border-white/20 prose-blockquote:font-normal prose-blockquote:not-italic prose-li:text-primary prose-li:font-sans prose-li:text-[0.9375rem] md:prose-li:text-[1rem] prose-li:leading-[1.7] prose-td:border-black/10 dark:prose-td:border-white/10 prose-th:border-black/10 dark:prose-th:border-white/10 prose-th:text-primary prose-hr:border-black/10 dark:prose-hr:border-white/10 transition-all prose-h1:tracking-tight prose-h1:text-2xl md:prose-h1:text-3xl prose-h1:mt-0 prose-h1:mb-3 prose-h2:tracking-tight prose-h2:text-xl md:prose-h2:text-2xl prose-h3:tracking-tight prose-h3:text-lg md:prose-h3:text-xl prose-img:m-0`

// Function to generate prose classes with size variations
export const getProseClasses = (size?: 'sm' | 'base' | 'lg') => {
    switch (size) {
        case 'base':
        case 'sm':
        case 'lg':
        default:
            return PROSE_CORE
    }
}
