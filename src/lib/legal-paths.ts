export const LEGAL_PATHS = [
    '/terms',
    '/privacy',
    '/cookies',
    '/refund',
    '/guidelines',
    '/copyright',
    '/dpa',
    '/baa',
    '/subprocessors',
] as const

export type LegalPath = (typeof LEGAL_PATHS)[number]

export const LEGAL_TITLES: Record<LegalPath, string> = {
    '/terms': 'Terms',
    '/privacy': 'Privacy',
    '/cookies': 'Cookies',
    '/refund': 'Refund',
    '/guidelines': 'Community',
    '/copyright': 'Copyright',
    '/dpa': 'DPA',
    '/baa': 'BAA',
    '/subprocessors': 'Subprocessors',
}
