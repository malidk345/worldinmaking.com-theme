import React, { useEffect, useState } from 'react'
import OSButton from 'components/OSButton'
import Tooltip from 'components/RadixUI/Tooltip'
import { useCartStore } from '../../templates/merch/store'

export function HeaderCartButton({
    isCartOpen,
    onClick,
}: {
    isCartOpen: boolean
    onClick: () => void
}): JSX.Element {
    const count = useCartStore((state) => state.count)
    const [animateCartCount, setAnimateCartCount] = useState(false)

    useEffect(() => {
        if (count && count > 0) {
            setAnimateCartCount(true)
            const timer = setTimeout(() => setAnimateCartCount(false), 600)
            return () => clearTimeout(timer)
        }
    }, [count])

    return (
        <Tooltip
            trigger={
                <OSButton size="md" onClick={onClick} className="relative" active={isCartOpen}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                        <path
                            fillRule="evenodd"
                            d="M1 2.75A.75.75 0 0 1 1.75 2h.93a1.75 1.75 0 0 1 1.716 1.407L4.715 5h15.553a1.75 1.75 0 0 1 1.712 2.11l-1.579 7.5A1.75 1.75 0 0 1 18.69 16H6.819a1.75 1.75 0 0 1-1.715-1.407L2.925 3.701A.25.25 0 0 0 2.68 3.5h-.93A.75.75 0 0 1 1 2.75ZM5.015 6.5l1.56 7.799a.25.25 0 0 0 .245.201h11.869a.25.25 0 0 0 .244-.198l1.58-7.5a.25.25 0 0 0-.245-.302H5.015ZM8 18.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1ZM6 19a2 2 0 1 1 4 0 2 2 0 0 1-4 0Zm11-.5a.5.5 0 1 0 0 1 .5.5 0 0 0 0-1Zm-2 .5a2 2 0 1 1 4 0 2 2 0 0 1-4 0Z"
                            clipRule="evenodd"
                        />
                    </svg>
                    {count && count > 0 && (
                        <span
                            className={`absolute -top-1 -right-1 bg-red text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold ${
                                animateCartCount ? 'animate-wiggle' : ''
                            }`}
                        >
                            {count}
                        </span>
                    )}
                </OSButton>
            }
        >
            Shopping cart ({count || 0})
        </Tooltip>
    )
}
