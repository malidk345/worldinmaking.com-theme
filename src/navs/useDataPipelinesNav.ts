const PIPELINES = [
    { slug: 'hubspot', name: 'HubSpot', type: 'destination', status: 'active' },
    { slug: 'salesforce', name: 'Salesforce', type: 'destination', status: 'active' },
    { slug: 'segment', name: 'Segment', type: 'destination', status: 'active' },
    { slug: 'bigquery', name: 'BigQuery', type: 'destination', status: 'active' },
    { slug: 'snowflake', name: 'Snowflake', type: 'destination', status: 'active' },
    { slug: 's3', name: 'AWS S3', type: 'destination', status: 'active' },
]

export default function useDataPipelinesNav({ type }: { type?: string }): { url?: string; name: string }[] {
    return PIPELINES
        .filter((node) => (type ? node.type === type : true) && node.status !== 'coming_soon')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((node) => ({
            url: `/docs/cdp/${type ? type + 's' : 'pipelines'}/${node.slug}`,
            name: node.name,
        }))
}
