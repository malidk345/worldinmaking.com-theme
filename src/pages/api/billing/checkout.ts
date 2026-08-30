import type { NextApiRequest, NextApiResponse } from 'next'
import { createCheckoutSession } from '../../../lib/wim-billing'
import { getSupabaseUserFromRequest } from '../../../../lib/api-authz'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        const user = await getSupabaseUserFromRequest(req)
        if (!user) {
            return res.status(401).json({ error: 'Please sign in to upgrade to Pro.' })
        }

        const { interval } = req.body || {}
        const planInterval = interval === 'year' ? 'year' : 'month'

        const meta = (user.user_metadata || {}) as Record<string, any>
        const userName = meta.first_name || meta.name || meta.full_name || user.email?.split('@')[0]

        const session = await createCheckoutSession({
            userId: user.id,
            userEmail: user.email || '',
            userName,
            planInterval,
        })

        if (!session.ok || !session.checkoutUrl) {
            return res.status(400).json({ error: session.error || 'Could not generate checkout session.' })
        }

        return res.status(200).json({
            success: true,
            checkoutUrl: session.checkoutUrl,
            isTestMode: session.isTestMode || false,
        })
    } catch (err: any) {
        return res.status(500).json({ error: err?.message || 'Checkout initiation failed' })
    }
}
