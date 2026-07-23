export const PROSE_CORE = `prose prose-base font-sans text-primary dark:text-primary prose-headings:font-sans prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-primary prose-p:text-primary prose-p:font-sans prose-p:text-[13.5px] md:prose-p:text-[14.5px] prose-p:leading-[1.6] prose-p:tracking-tight prose-strong:text-primary prose-strong:font-bold prose-a:text-[#000080] dark:prose-a:text-[#66b2ff] prose-a:font-semibold prose-a:no-underline hover:prose-a:underline prose-code:text-primary prose-code:font-mono prose-code:text-[11.5px] prose-code:bg-black/7 dark:prose-code:bg-white/10 prose-code:border prose-code:border-black/8 dark:prose-code:border-white/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-[5px] prose-code:before:content-none prose-code:after:content-none prose-pre:bg-black/6 dark:prose-pre:bg-white/5 prose-pre:text-primary prose-pre:border prose-pre:border-black/8 dark:prose-pre:border-white/8 prose-pre:font-mono prose-pre:text-[12px] prose-pre:rounded-[10px] prose-pre:leading-[1.6] prose-blockquote:text-secondary prose-blockquote:border-primary/30 prose-blockquote:font-normal prose-blockquote:italic prose-li:text-primary prose-li:font-sans prose-li:text-[13.5px] md:prose-li:text-[14.5px] prose-li:leading-[1.6] prose-li:tracking-tight prose-td:border-black/10 dark:prose-td:border-white/10 prose-th:border-black/10 dark:prose-th:border-white/10 prose-th:text-primary prose-hr:border-black/10 dark:prose-hr:border-white/10 transition-all prose-h1:tracking-tight prose-h1:text-[16px] md:prose-h1:text-[18px] prose-h1:font-black prose-h1:leading-snug prose-h1:mt-3 prose-h1:mb-2 prose-h2:tracking-tight prose-h2:text-[14.5px] md:prose-h2:text-[16px] prose-h2:font-bold prose-h2:leading-snug prose-h2:mt-3 prose-h2:mb-1.5 prose-h3:tracking-tight prose-h3:text-[13.5px] md:prose-h3:text-[15px] prose-h3:font-bold prose-h3:leading-snug prose-h3:mt-2.5 prose-h3:mb-1 prose-img:m-0`

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
