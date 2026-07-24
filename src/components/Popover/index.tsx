import React, { useState, useRef, useCallback } from 'react'
import { Popover as HeadlessPopover } from '@headlessui/react'
import { usePopper } from 'react-popper'

export function Popover({ children, button }: { children: React.ReactNode; button: string | React.ReactNode }) {
    const referenceRef = useRef<any>(null)
    const popperRef = useRef<any>(null)
    const arrowRef = useRef<any>(null)

    const [referenceElement, setReferenceElement] = useState<any>(null)
    const [popperElement, setPopperElement] = useState<any>(null)
    const [arrowElement, setArrowElement] = useState<any>(null)

    const setReference = useCallback((node: any) => {
        if (node && node !== referenceRef.current) {
            referenceRef.current = node
            setReferenceElement(node)
        }
    }, [])

    const setPopper = useCallback((node: any) => {
        if (node && node !== popperRef.current) {
            popperRef.current = node
            setPopperElement(node)
        }
    }, [])

    const setArrow = useCallback((node: any) => {
        if (node && node !== arrowRef.current) {
            arrowRef.current = node
            setArrowElement(node)
        }
    }, [])

    const { styles, attributes } = usePopper(referenceElement, popperElement, {
        modifiers: [
            { name: 'arrow', options: { element: arrowElement } },
            {
                name: 'offset',
                options: {
                    offset: [0, 10],
                },
            },
        ],
    })

    return (
        <HeadlessPopover className="z-[50] flex">
            <HeadlessPopover.Button ref={setReference}>{button}</HeadlessPopover.Button>

            <HeadlessPopover.Panel ref={setPopper} style={styles.popper} {...attributes.popper}>
                <div className="px-4 py-2 bg-white shadow-lg rounded-md max-h-[85vh] overflow-auto">{children}</div>
                <div ref={setArrow} style={styles.arrow} />
            </HeadlessPopover.Panel>
        </HeadlessPopover>
    )
}
