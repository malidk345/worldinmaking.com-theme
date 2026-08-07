import { useMemo } from 'react'
import { useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'

export function useWindowPhysics(isActiveWindowsPanelOpen: boolean, dragging: boolean, compact: boolean) {
    const motionX = useMotionValue(0)
    const motionY = useMotionValue(0)
    const xVelocity = useVelocity(motionX)
    const yVelocity = useVelocity(motionY)
    const smoothXVelocity = useSpring(xVelocity, { damping: 40, stiffness: 300 })
    const smoothYVelocity = useSpring(yVelocity, { damping: 40, stiffness: 300 })

    const tiltX = useTransform(smoothYVelocity, [-1000, 1000], [6, -6])
    const tiltY = useTransform(smoothXVelocity, [-1000, 1000], [-6, 6])

    const physicsStyles = useMemo(() => {
        if (dragging && !compact && !isActiveWindowsPanelOpen) {
            return {
                rotateX: tiltX,
                rotateY: tiltY,
                transformPerspective: 1200,
            }
        }
        return {}
    }, [dragging, compact, isActiveWindowsPanelOpen, tiltX, tiltY])

    return { motionX, motionY, physicsStyles }
}
