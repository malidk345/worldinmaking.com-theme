/* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/explicit-module-boundary-types */

const handler = async (_req, res) => {
    // Return a static mock count instead of fetching from PostHog API
    const count = 5000

    return res.status(200).json(count)
}

export default handler
