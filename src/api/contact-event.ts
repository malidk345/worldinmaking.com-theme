// import { PostHog } from 'posthog-node'

class MockPostHog {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
    constructor(_key: string, _options?: any) {
        // no-op
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-function
    async capture(_args: any): Promise<void> {
        // no-op
    }
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    async shutdown(): Promise<void> {
        // no-op
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
const handler = async (req: any, res: any): Promise<void> => {
    const ip = req.headers['x-forwarded-for']
    const { distinctId, formName, ...other } = JSON.parse(req.body)
    const client = new MockPostHog(process.env.GATSBY_POSTHOG_API_KEY as string, {
        host: process.env.GATSBY_POSTHOG_UI_HOST,
        disableGeoip: false,
    })

    await client.capture({
        distinctId,
        event: 'form submission',
        properties: {
            form_name: formName,
            form_data: JSON.stringify(other),
            $ip: ip,
        },
    })

    await client.shutdown()

    return res.status(200).send('OK')
}

export default handler
