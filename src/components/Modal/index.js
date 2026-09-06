import { Dialog, DialogBackdrop, DialogPanel, Transition } from '@headlessui/react'
import React, { Fragment } from 'react'

export default function Modal({ open, setOpen, children }) {
    return (
        <Transition
            show={open}
            enter="transition-opacity duration-150"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            as={Fragment}
        >
            <Dialog
                as="div"
                open={open}
                onClose={() => setOpen(false)}
                className="fixed z-[99999999999] inset-0 overflow-y-auto box-border"
            >
                <DialogBackdrop className="fixed inset-0 bg-accent" />
                <DialogPanel className="relative h-full">{children}</DialogPanel>
            </Dialog>
        </Transition>
    )
}
