import React, { forwardRef, SVGAttributes } from 'react'
import clsx from 'clsx'

export interface LemonIconProps extends SVGAttributes<SVGSVGElement> {
  className?: string
  color?: string
}

export const LemonIconBase = forwardRef<SVGSVGElement, LemonIconProps>(function LemonIconBase(
  { className, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      className={clsx('LemonIcon', className)}
      width="1em"
      height="1em"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden="true"
      {...props}
    />
  )
})

export function IconCalculate(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM13 7H18V9H13V7ZM13 11H18V13H13V11ZM6 6H11V8H6V6ZM6 10H11V12H6V10ZM6 14H11V19H6V14ZM13 15H18V19H13V15Z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconPlus(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconTrash(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconGear(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconCopy(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconSearch(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconInfo(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconChevronDown(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconChevronRight(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconChevronLeft(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconChevronUp(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconNotebook(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M3 18h12v-2H3v2zM3 6v2h18V6H3zm0 7h18v-2H3v2z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconLink(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconX(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconExternal(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" fill="currentColor" />
    </LemonIconBase>
  )
}

export function IconChat(props: LemonIconProps): JSX.Element {
  return (
    <LemonIconBase {...props}>
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" fill="currentColor" />
    </LemonIconBase>
  )
}
