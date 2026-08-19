/** Leftover PostHog marketing / fun routes — real 404, not a soft 200. */
export async function getServerSideProps() {
    return { notFound: true as const }
}
