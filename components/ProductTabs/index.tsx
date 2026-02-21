import React, { useEffect, useState } from 'react'
import OSTabs from 'components/OSTabs'
import useProduct from 'hooks/useProduct'
import Link from 'components/Link'
import OSButton from 'components/OSButton'
import { APP_COUNT } from '../../constants'
import CloudinaryImage from 'components/CloudinaryImage'
import { useApp } from '../../context/App'
import { useWindow } from '../../context/Window'

// Mock image data interface for Next.js compatibility
interface MockImageData {
    publicURL: string
}

// Mock images data - replace with actual data source in Next.js
const mockImages: MockImageData[] = []

const Image = ({
    images,
    src,
    alt,
    width,
    height,
    imgClassName,
}: {
    images: MockImageData[]
    src: string
    alt: string
    width?: number
    height?: number
    imgClassName: string
}) => {
    // Always use CloudinaryImage in Next.js
    return <CloudinaryImage src={src} alt={alt} width={width} height={height} imgClassName={imgClassName} />
}

interface ProductTabsProps {
    productHandles: string[]
    className?: string
    selectedStage?: string
}

interface Product {
    handle: string
    name: string
    Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
    color: string
    overview: {
        title: string
        textColor?: string
    }
    slug: string
    screenshots?: {
        [key: string]: {
            src: string
            srcDark?: string
            alt: string
            width?: number
            height?: number
            classes?: string
            imgClasses?: string
        }
    }
}

export default function ProductTabs({ productHandles, className, selectedStage }: ProductTabsProps) {
    const { appWindow } = useWindow()
    const allProducts = useProduct()
    const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(
        typeof window !== 'undefined' && (appWindow?.size?.width || 0) >= 576 ? 'vertical' : 'horizontal'
    )
    const { siteSettings } = useApp()
    const isDark = siteSettings.theme === 'dark'

    const images = mockImages

    useEffect(() => {
        // Find the container with aria-label="Company stage"
        const container = document.querySelector('[aria-label="Company stage"]')
        if (!container) return

        // Create a ResizeObserver to watch the container
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width } = entry.contentRect
                // Set orientation to vertical only when container is @lg+ wide
                setOrientation(width >= 576 ? 'vertical' : 'horizontal')
            }
        })

        // Start observing the container
        resizeObserver.observe(container)

        // Cleanup
        return () => resizeObserver.disconnect()
    }, [])

    // Filter products based on the provided handles
    const products = productHandles
        .map((handle) => {
            const product = Array.isArray(allProducts)
                ? allProducts.find((p) => p.handle === handle)
                : allProducts?.handle === handle
                ? allProducts
                : null
            return product as Product | null
        })
        .filter((product): product is Product => product !== null)

    if (!products.length) {
        return null
    }

    const tabs = products.map((product) => {
        return {
            value: product.handle,
            label: (
                <>
                    {product.Icon && <product.Icon className={`inline-block size-6 text-${product.color}`} />}
                    {product.name}
                </>
            ),
            content: (
                <div
                    className={`@container flex flex-col bg-${product.color} dark:bg-accent border border-transparent dark:border-primary rounded-md overflow-hidden`}
                >
                    <div className="flex flex-col gap-2 @sm:flex-row items-start justify-between p-4 @xl:p-6">
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl @xl:text-2xl font-bold mb-2">{product.overview.title}</h3>
                            <p className={`text-sm ${product.overview.textColor || 'text-secondary'}`}>
                                {product.name} helps you understand user behavior and make data-driven decisions.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <OSButton
                                type="primary"
                                size="sm"
                                onClick={() => {
                                    window.location.href = `https://app.posthog.com/signup?product=${product.handle}`
                                }}
                            >
                                Start free
                            </OSButton>
                            <Link to={`/${product.slug}`} className="shrink-0">
                                <OSButton type="secondary" size="sm">
                                    Learn more
                                </OSButton>
                            </Link>
                        </div>
                    </div>

                    {/* Screenshots */}
                    {product.screenshots && (
                        <div className="bg-white dark:bg-dark p-4">
                            <div className="grid gap-4 md:grid-cols-2">
                                {Object.entries(product.screenshots).map(([key, screenshot]) => (
                                    <div key={key} className={`relative ${screenshot.classes || ''}`}>
                                        <Image
                                            images={images}
                                            src={isDark && screenshot.srcDark ? screenshot.srcDark : screenshot.src}
                                            alt={screenshot.alt}
                                            width={screenshot.width}
                                            height={screenshot.height}
                                            imgClassName={screenshot.imgClasses || 'w-full'}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ),
        }
    })

    return (
        <div className={className}>
            <OSTabs
                tabs={tabs}
                defaultValue={products[0]?.handle}
                orientation={orientation}
                triggerDataScheme="secondary"
            />
        </div>
    )
}
