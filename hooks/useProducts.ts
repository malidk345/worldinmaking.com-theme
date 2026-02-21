"use client"

import { useMemo, useState } from 'react'
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
import { llmAnalytics } from './productData/llm_analytics'
import { workflows } from './productData/workflows'
import { revenueAnalytics } from './productData/revenue_analytics'
import { logs } from './productData/logs'
import { realtimeDestinations } from './productData/realtime_destinations'

interface Product {
    handle: string
    name: string
    cost?: number
    billingData: unknown
    costByTier: unknown[]
    freeLimit: unknown
    startsAt: number
    unit: string
    volume?: number
    billedWith?: unknown
    [key: string]: unknown
}

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
    llmAnalytics,
    revenueAnalytics,
    logs,
    workflows,
]

export default function useProducts() {
    // Hardcoded products for now, removing Gatsby static query
    const [products, setProducts] = useState<Product[]>(
        initialProducts.map((product) => ({
            ...product,
            cost: 0,
            billingData: null,
            costByTier: [],
            freeLimit: null,
            startsAt: 0,
            unit: 'events',
        }))
    )

    const monthlyTotal = useMemo(() => products.reduce((acc, product) => acc + (product.cost || 0), 0), [products])

    const setProduct = (handle: string, data: Partial<Product>) => {
        setProducts((products) =>
            products.map((product) => {
                if (product.handle === handle && !product.billedWith) {
                    return {
                        ...product,
                        ...data,
                    }
                }
                return product
            })
        )
    }

    const setVolume = (handle: string, volume: number) => {
        // Simplified volume setter
        setProduct(handle, { volume })
    }

    return { products, setVolume, setProduct, monthlyTotal }
}
