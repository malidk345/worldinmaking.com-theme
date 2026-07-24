export default function useSourcePlatforms() {
    const { allPostHogSource } = {}

    return (allPostHogSource?.nodes || []).map((node: any) => ({
        label: node.name,
        url: `/docs/data-warehouse/sources/${node.slug}`,
        image: node.icon_url,
    }))
}
