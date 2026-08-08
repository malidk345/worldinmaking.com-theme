import { useMotionValue, useSpring, useTransform, useVelocity } from 'framer-motion'
import { useCallback } from 'react'

export function useWindowPhysics() {
    const motionX = useMotionValue(0)
    const motionY = useMotionValue(0)
    const xVelocity = useVelocity(motionX)
    const yVelocity = useVelocity(motionY)
    const smoothXVelocity = useSpring(xVelocity, { damping: 40, stiffness: 300 })
    const smoothYVelocity = useSpring(yVelocity, { damping: 40, stiffness: 300 })
    const tiltX = useTransform(smoothYVelocity, [-1000, 1000], [6, -6])
    const tiltY = useTransform(smoothXVelocity, [-1000, 1000], [-6, 6])

    const resetPhysics = useCallback(() => {
        motionX.set(0)
        motionY.set(0)
    }, [motionX, motionY])

    return { motionX, motionY, tiltX, tiltY, resetPhysics }
}
