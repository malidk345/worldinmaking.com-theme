import React from 'react'
// import { allProductsData } from 'components/Pricing/Pricing'
import { useMemo, useState } from 'react'

const calculatePrice = (volume: number, tiers: any) => ({ total: 0, costByTier: [] })

// Import individual product data
import { productAnalytics } from './productData/product_analytics'
import { sessionReplay } from './productData/session_replay'
import { featureFlags } from './productData/feature_flags'
import { surveys } from './productData/surveys'
import { dataWarehouse } from './productData/data_warehouse'
import { errorTracking } from './productData/error_tracking'
import { cdp } from './productData/cdp'
import { webAnalytics } from './productData/web_analytics'
import { experiments } from './productData/experiments'
import { posthog_ai } from './productData/posthog_ai'
import { aiObservability } from './productData/ai_observability'
import { workflows } from './productData/workflows'
import { logs } from './productData/logs'
import { realtimeDestinations } from './productData/realtime_destinations'
import { endpoints } from './productData/endpoints'
import { inbox } from './productData/inbox'

const initialProducts = [
    productAnalytics,
    sessionReplay,
    featureFlags,
    surveys,
    dataWarehouse,
    realtimeDestinations,
    errorTracking,
    cdp,
    webAnalytics,
    experiments,
    posthog_ai,
    aiObservability,
    logs,
    workflows,
    inbox,
    endpoints,
]

export default function useProducts() {
    const baseProducts = useMemo(
        () =>
            initialProducts.map((product) => {
                return {
                    ...product,
                    cost: 0,
                    startsAt: (product as any).startsAt || '0',
                    freeLimit: (product as any).freeLimit || 0,
                    unit: (product as any).unit || 'unit',
                }
            }),
        []
    )

    const [overrides, setOverrides] = useState<Record<string, Record<string, any>>>({})

    const products = useMemo(
        () => baseProducts.map((product) => ({ ...product, ...(overrides[product.handle] || {}) })),
        [baseProducts, overrides]
    )

    const monthlyTotal = useMemo(() => products.reduce((acc, product) => acc + (product.cost || 0), 0), [products])

    const setProduct = (handle: string, data: any) => {
        const target = baseProducts.find((product) => product.handle === handle)
        if (!target || (target as any).billedWith) return
        setOverrides((prev) => ({ ...prev, [handle]: { ...(prev[handle] || {}), ...data } }))
    }

    const setVolume = (handle: string, volume: number) => {
        const rounded = Math.round(volume)
        const product = baseProducts.find((product) => product.handle === handle)
        const { total, costByTier } = calculatePrice(
            rounded,
            product?.billingData?.plans.find((plan: any) => plan.tiers)?.tiers
        )
        setProduct(handle, {
            volume: rounded,
            cost: total,
            costByTier,
        })
    }

    return { products, setVolume, setProduct, monthlyTotal }
}

