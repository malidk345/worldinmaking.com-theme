import React, { forwardRef, type ComponentProps } from 'react'

type BaseIconProps = ComponentProps<'svg'>
export type IconProps = Omit<BaseIconProps, 'children'>
type IconComponent<T> = React.FunctionComponent<T & React.RefAttributes<SVGSVGElement>>

export const BaseIcon: IconComponent<BaseIconProps> = forwardRef(function BaseIcon(
    { className, ...props }: BaseIconProps,
    ref
) {
    const customClassName = className ? ` ${className}` : ''
    return (
        <svg
            ref={ref}
            className={'LemonIcon' + customClassName}
            width="100%"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            {...props}
        />
    )
})

export const Digit0 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.419l2.055-1.89h3.563L7.764 13Zm-5.4-4.818-.218 2.563-2.054 1.891.418-4.927L1.291 7l1.073 1.182ZM.71 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.855 2.145-.419 4.927-1.727-1.89.218-2.564L7.927 7l.637.71ZM6.909 5.091l.218-2.564L9.182.637l-.418 4.927-.782.727-1.073-1.2Z" />
    </BaseIcon>
)

export const Digit1 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 3 13" width="100%" height="100%" {...props}>
        <path d="m2.254 7.71-.418 4.926-1.727-1.89.218-2.564L1.618 7l.636.71ZM.6 5.09l.218-2.564L2.873.637l-.419 4.927-.781.727L.6 5.091Z" />
    </BaseIcon>
)

export const Digit2 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.419l2.055-1.89h3.563L7.764 13Zm-5.4-4.818-.218 2.563-2.054 1.891.418-4.927L1.291 7l1.073 1.182ZM6.91 5.09l.218-2.564L9.182.637l-.418 4.927-.782.727-1.073-1.2Zm-.164.6.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit3 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.418l2.055-1.89h3.563L7.763 13Zm.8-5.29-.418 4.926-1.727-1.89.218-2.564L7.927 7l.636.71ZM6.91 5.09l.218-2.563L9.182.637l-.419 4.927-.781.727-1.073-1.2Zm-.164.6.873.946-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit4 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M.709 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.855 2.145-.419 4.928-1.727-1.891.218-2.564L7.927 7l.637.71ZM6.909 5.091l.218-2.564L9.182.637l-.418 4.927-.782.727-1.073-1.2Zm-.164.6.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit5 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 9 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.418l2.055-1.89h3.563L7.763 13ZM.71 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.854 2.145-.418 4.927-1.727-1.89.218-2.564L7.927 7l.636.71ZM6.745 5.691l.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit6 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 9 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.419l2.055-1.89h3.563L7.764 13Zm-5.4-4.818-.218 2.563-2.054 1.891.418-4.927L1.291 7l1.073 1.182ZM.71 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.855 2.145-.419 4.927-1.727-1.89.218-2.564L7.927 7l.637.71ZM6.745 5.691l.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit7 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 9 13" width="100%" height="100%" {...props}>
        <path d="M7.873.273 5.818 2.182H2.255L.527.272h7.346Zm-.31 7.436-.417 4.927-1.728-1.89.218-2.564L6.927 7l.637.71ZM5.91 5.091l.218-2.564L8.182.637l-.418 4.927-.782.727-1.073-1.2Z" />
    </BaseIcon>
)

export const Digit8 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.419l2.055-1.89h3.563L7.764 13Zm-5.4-4.818-.218 2.563-2.054 1.891.418-4.927L1.291 7l1.073 1.182ZM.71 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.855 2.145-.419 4.927-1.727-1.89.218-2.564L7.927 7l.637.71ZM6.909 5.091l.218-2.564L9.182.637l-.418 4.927-.782.727-1.073-1.2Zm-.164.6.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const Digit9 = (props: IconProps) => (
    <BaseIcon viewBox="0 0 10 13" width="100%" height="100%" {...props}>
        <path d="M8.873.273 6.818 2.182H3.254L1.527.272h7.346ZM7.763 13H.418l2.055-1.89h3.563L7.763 13ZM.71 5.564 1.127.636l1.727 1.891-.218 2.564-1.29 1.2-.637-.727Zm7.854 2.145-.418 4.927-1.727-1.89.218-2.564L7.927 7l.636.71ZM6.91 5.091l.218-2.564L9.182.637l-.419 4.927-.781.727-1.073-1.2Zm-.164.6.873.945-1.036.946H2.545l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)

export const DigitDash = (props: IconProps) => (
    <BaseIcon viewBox="0 0 9 13" width="100%" height="100%" {...props}>
        <path d="m6.327 5.69.873.946-1.036.946H2.127l-.854-.946 1.018-.945h4.036Z" />
    </BaseIcon>
)
