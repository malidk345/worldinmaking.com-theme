export const PROSE_CORE = `prose prose-stone text-black prose-headings:text-black prose-p:text-black prose-strong:text-black prose-a:text-primary prose-a:font-medium hover:prose-a:underline prose-code:text-black prose-code:bg-black/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/5 prose-pre:text-black prose-pre:border prose-pre:border-black/10 prose-blockquote:text-black/80 prose-blockquote:border-black/20 prose-blockquote:font-normal prose-blockquote:not-italic prose-li:text-black prose-td:border-black/10 prose-th:border-black/10 prose-th:text-black prose-hr:border-black/10 transition-all`

// Function to generate prose classes with size variations
export const getProseClasses = (size?: 'sm' | 'base' | 'lg') => {
    switch (size) {
        case 'base':
            return PROSE_CORE
        case 'lg':
            return `${PROSE_CORE} prose-lg`
        case 'sm':
        default:
            return `${PROSE_CORE} prose-sm`
    }
}
