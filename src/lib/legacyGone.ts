/** Leftover PostHog marketing / fun routes — real 404, not a soft 200. */
export async function getStaticProps() {
    return { notFound: true as const }
}

