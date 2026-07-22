import React, { useState, useRef, useEffect, forwardRef } from 'react'
import clsx from 'clsx'
import {
  IconX,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconChevronUp,
  IconCalculate,
  IconPlus,
  IconTrash,
  IconGear,
  IconSearch,
  IconInfo,
  IconNotebook,
  IconLink,
  IconExternal,
} from './icons'

export {
  IconX,
  IconChevronDown,
  IconChevronRight,
  IconChevronLeft,
  IconChevronUp,
  IconCalculate,
  IconPlus,
  IconTrash,
  IconGear,
  IconSearch,
  IconInfo,
  IconNotebook,
  IconLink,
  IconExternal,
}

// ─── Spinner ────────────────────────────────────────────────────────────────

export interface SpinnerProps {
  size?: 'small' | 'medium' | 'large'
  className?: string
  color?: string
}

export function Spinner({ size = 'small', className, color }: SpinnerProps): JSX.Element {
  const px = size === 'small' ? 16 : size === 'medium' ? 24 : 32
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? 'currentColor'}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={clsx('Spinner', className)}
    >
      <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
      <path d="M12 2 a10 10 0 0 1 10 10" />
    </svg>
  )
}

// ─── LemonButton ────────────────────────────────────────────────────────────

export interface LemonButtonSideAction {
  icon?: React.ReactElement
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  tooltip?: React.ReactNode
  dropdown?: {
    overlay: React.ReactNode
    placement?: string
  }
}

export interface LemonButtonProps {
  children?: React.ReactNode
  type?: 'primary' | 'secondary' | 'tertiary'
  status?: 'default' | 'alt' | 'danger'
  size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large'
  icon?: React.ReactElement | null
  sideIcon?: React.ReactElement | null
  sideAction?: LemonButtonSideAction
  active?: boolean
  loading?: boolean
  disabled?: boolean
  disabledReason?: React.ReactNode | null
  fullWidth?: boolean
  center?: boolean
  noPadding?: boolean
  truncate?: boolean
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  title?: string
  className?: string
  'data-attr'?: string
  'aria-label'?: string
  id?: string
  buttonWrapper?: (button: React.ReactElement) => React.ReactElement
  to?: string
  targetBlank?: boolean
}

export const LemonButton = forwardRef<HTMLButtonElement, LemonButtonProps>(
  (
    {
      children,
      type = 'tertiary',
      status = 'default',
      size,
      icon,
      sideIcon,
      sideAction,
      active = false,
      loading = false,
      disabled,
      disabledReason,
      fullWidth,
      center,
      noPadding,
      truncate,
      onClick,
      title,
      className,
      'data-attr': dataAttr,
      'aria-label': ariaLabel,
      id,
      buttonWrapper,
      to,
      targetBlank,
    },
    ref
  ) => {
    const isDisabled = disabled || !!disabledReason || loading
    const [sideDropdownOpen, setSideDropdownOpen] = useState(false)

    let mainButton = (
      <button
        ref={ref}
        id={id}
        className={clsx(
          'LemonButton',
          `LemonButton--${type}`,
          `LemonButton--status-${status}`,
          loading && 'LemonButton--loading',
          noPadding && 'LemonButton--no-padding',
          size && `LemonButton--${size}`,
          active && 'LemonButton--active',
          fullWidth && 'LemonButton--full-width',
          center && 'LemonButton--centered',
          !children && 'LemonButton--no-content',
          icon && 'LemonButton--has-icon',
          (sideIcon || (targetBlank && !icon)) && 'LemonButton--has-side-icon',
          truncate && 'LemonButton--truncate',
          className
        )}
        onClick={(e) => {
          if (isDisabled) return
          if (to) {
            if (targetBlank) {
              window.open(to, '_blank', 'noopener,noreferrer')
            } else {
              window.location.href = to
            }
          }
          onClick?.(e)
        }}
        aria-disabled={isDisabled}
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        title={typeof title === 'string' ? (disabledReason ? `${title} (${disabledReason})` : title) : disabledReason ? String(disabledReason) : undefined}
        data-attr={dataAttr}
        type="button"
      >
        <span className="LemonButton__chrome">
          {loading ? <Spinner size="small" /> : icon ? <span className="LemonButton__icon">{icon}</span> : null}
          {children && <span className="LemonButton__content">{children}</span>}
          {sideIcon ? (
            <span className="LemonButton__icon">{sideIcon}</span>
          ) : targetBlank ? (
            <span className="LemonButton__icon">
              <IconExternal />
            </span>
          ) : null}
        </span>
      </button>
    )

    if (buttonWrapper) {
      mainButton = buttonWrapper(mainButton)
    }

    if (sideAction) {
      return (
        <div
          className={clsx(
            'LemonButtonWithSideAction',
            `LemonButtonWithSideAction--${type}`,
            fullWidth && 'LemonButtonWithSideAction--full-width'
          )}
          style={{ position: 'relative', display: fullWidth ? 'flex' : 'inline-flex', alignItems: 'center' }}
        >
          {mainButton}
          <div className="LemonButtonWithSideAction__side-button">
            <LemonButton
              type={type}
              size={size}
              status={status}
              noPadding
              icon={sideAction.icon ?? <IconChevronDown />}
              onClick={(e) => {
                if (sideAction.dropdown) {
                  setSideDropdownOpen(!sideDropdownOpen)
                }
                sideAction.onClick?.(e)
              }}
              title={typeof sideAction.tooltip === 'string' ? sideAction.tooltip : undefined}
            />
          </div>
          {sideDropdownOpen && sideAction.dropdown && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                right: 0,
                zIndex: 9999,
                minWidth: '180px',
                backgroundColor: 'var(--color-bg-surface-primary)',
                border: '1px solid var(--border-3000)',
                borderRadius: 'var(--radius)',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
                padding: '0.25rem 0',
              }}
            >
              {sideAction.dropdown.overlay}
            </div>
          )}
        </div>
      )
    }

    return mainButton
  }
)
LemonButton.displayName = 'LemonButton'

// ─── LemonButtonWithSideAction ──────────────────────────────────────────────

export function LemonButtonWithSideAction({
  type = 'tertiary',
  status = 'default',
  size,
  fullWidth,
  sideAction,
  children,
  ...buttonProps
}: LemonButtonProps & { sideAction: LemonButtonSideAction }): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={ref}
      className={clsx('LemonButtonWithSideAction', `LemonButtonWithSideAction--${type}`, fullWidth && 'LemonButtonWithSideAction--full-width')}
      style={{ position: 'relative', display: fullWidth ? 'flex' : 'inline-flex', alignItems: 'center' }}
    >
      <LemonButton type={type} status={status} size={size} fullWidth={fullWidth} {...buttonProps}>
        {children}
      </LemonButton>
      <div className="LemonButtonWithSideAction__side-button">
        <LemonButton
          type={type}
          size={size}
          status={status}
          noPadding
          icon={sideAction.icon ?? <IconChevronDown />}
          onClick={(e) => {
            if (sideAction.dropdown) setOpen(!open)
            sideAction.onClick?.(e)
          }}
          title={typeof sideAction.tooltip === 'string' ? sideAction.tooltip : undefined}
        />
      </div>
      {open && sideAction.dropdown && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 9999,
            minWidth: '180px',
            backgroundColor: 'var(--color-bg-surface-primary)',
            border: '1px solid var(--border-3000)',
            borderRadius: 'var(--radius)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.16)',
            padding: '0.25rem 0',
          }}
        >
          {sideAction.dropdown.overlay}
        </div>
      )}
    </div>
  )
}

// ─── Popover & LemonDropdown ────────────────────────────────────────────────

export interface PopoverProps {
  visible: boolean
  overlay: React.ReactNode
  placement?: 'bottom' | 'right-start' | 'top' | 'left' | string
  padded?: boolean
  matchWidth?: boolean
  onClickOutside?: () => void
  children?: React.ReactElement
  className?: string
  style?: React.CSSProperties
}

export function Popover({
  visible,
  overlay,
  placement = 'bottom',
  padded = false,
  matchWidth = false,
  onClickOutside,
  children,
  className,
  style,
}: PopoverProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!visible) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClickOutside?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [visible, onClickOutside])

  const isRight = placement === 'right-start'
  const isTop = placement === 'top'

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      {visible && (
        <div
          className={clsx('Popover', padded && 'Popover--padded', className)}
          style={{
            position: 'absolute',
            top: isRight ? 0 : isTop ? 'auto' : 'calc(100% + 4px)',
            bottom: isTop ? 'calc(100% + 4px)' : 'auto',
            left: isRight ? 'calc(100% + 4px)' : 0,
            zIndex: 9999,
            minWidth: matchWidth ? '100%' : '180px',
            ...style,
          }}
        >
          <div className="Popover__box">
            <div className="Popover__content">{overlay}</div>
          </div>
        </div>
      )}
    </div>
  )
}

export interface LemonDropdownProps extends Omit<PopoverProps, 'visible'> {
  visible?: boolean
  startVisible?: boolean
  onVisibilityChange?: (visible: boolean) => void
  closeOnClickInside?: boolean
}

export function LemonDropdown({
  visible,
  startVisible = false,
  onVisibilityChange,
  closeOnClickInside = true,
  children,
  overlay,
  placement = 'bottom',
  matchWidth = false,
  padded = false,
  ...props
}: LemonDropdownProps): JSX.Element {
  const [localVisible, setLocalVisible] = useState(visible ?? startVisible ?? false)
  const isControlled = visible !== undefined
  const effectiveVisible = visible ?? localVisible

  const setVisible = (val: boolean) => {
    if (!isControlled) setLocalVisible(val)
    onVisibilityChange?.(val)
  }

  const childElement = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void; active?: boolean }> | undefined
  const triggerChild = childElement && React.isValidElement(childElement) ? (
    React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent) => {
        childElement.props.onClick?.(e)
        setVisible(!effectiveVisible)
      },
      active: effectiveVisible || childElement.props.active,
    })
  ) : (
    <div onClick={() => setVisible(!effectiveVisible)}>Open Dropdown</div>
  )

  return (
    <Popover
      visible={effectiveVisible}
      overlay={
        <div
          onClick={() => {
            if (closeOnClickInside) setVisible(false)
          }}
        >
          {overlay}
        </div>
      }
      placement={placement}
      matchWidth={matchWidth}
      padded={padded}
      onClickOutside={() => setVisible(false)}
      {...props}
    >
      {triggerChild}
    </Popover>
  )
}

export interface LemonButtonWithDropdownProps extends LemonButtonProps {
  dropdown: {
    overlay: React.ReactNode
    placement?: 'bottom' | 'right-start' | string
    matchWidth?: boolean
    padded?: boolean
  }
}

export function LemonButtonWithDropdown({ dropdown, sideIcon, ...buttonProps }: LemonButtonWithDropdownProps): JSX.Element {
  return (
    <LemonDropdown
      overlay={dropdown.overlay}
      placement={dropdown.placement}
      matchWidth={dropdown.matchWidth}
      padded={dropdown.padded}
    >
      <LemonButton {...buttonProps} sideIcon={sideIcon ?? <IconChevronDown />} />
    </LemonDropdown>
  )
}

// ─── More Button ────────────────────────────────────────────────────────────

export function More({ overlay }: { overlay: React.ReactNode }): JSX.Element {
  return (
    <LemonButtonWithDropdown
      icon={
        <svg width="1rem" height="1rem" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
        </svg>
      }
      dropdown={{ overlay }}
    />
  )
}

// ─── LemonBadge ─────────────────────────────────────────────────────────────

export interface LemonBadgeProps {
  children?: React.ReactNode
  content?: React.ReactNode
  status?: 'primary' | 'success' | 'warning' | 'danger' | 'muted' | 'data'
  size?: 'small' | 'medium'
  className?: string
}

export function LemonBadge({ children, content, status = 'primary', size = 'medium', className }: LemonBadgeProps): JSX.Element {
  if (children) {
    return (
      <span className={clsx('LemonBadgeWrapper', className)} style={{ position: 'relative', display: 'inline-flex' }}>
        {children}
        <span
          className={clsx('LemonBadge', `LemonBadge--${status}`, `LemonBadge--${size}`)}
          style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            borderRadius: '1rem',
            padding: '0.125rem 0.375rem',
            fontSize: '0.6875rem',
            fontWeight: 700,
            lineHeight: 1,
            backgroundColor: status === 'danger' ? 'var(--color-red-600)' : status === 'success' ? 'var(--color-green-600)' : 'var(--primary-3000)',
            color: '#fff',
          }}
        >
          {content}
        </span>
      </span>
    )
  }

  return (
    <span
      className={clsx('LemonBadge', `LemonBadge--${status}`, `LemonBadge--${size}`, className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: '1rem',
        padding: '0.125rem 0.5rem',
        fontSize: '0.75rem',
        fontWeight: 600,
        backgroundColor:
          status === 'danger' ? 'var(--color-bg-fill-error-secondary, #fee2e2)' :
          status === 'success' ? 'var(--color-bg-fill-success-secondary, #dcfce7)' :
          status === 'warning' ? 'var(--color-bg-fill-warning-secondary, #fef3c7)' :
          'var(--color-bg-fill-secondary, #e5e7eb)',
        color:
          status === 'danger' ? 'var(--color-text-error, #dc2626)' :
          status === 'success' ? 'var(--color-text-success, #16a34a)' :
          status === 'warning' ? 'var(--color-text-warning, #d97706)' :
          'var(--color-text-primary, #111)',
      }}
    >
      {content}
    </span>
  )
}

// ─── LemonTag ───────────────────────────────────────────────────────────────

export interface LemonTagProps {
  children?: React.ReactNode
  type?: 'highlight' | 'option' | 'muted' | 'completion' | 'warning' | 'danger' | 'success'
  size?: 'small' | 'medium'
  className?: string
  style?: React.CSSProperties
}

export function LemonTag({ children, type = 'muted', size = 'medium', className, style }: LemonTagProps): JSX.Element {
  return (
    <span
      className={clsx('LemonTag', `LemonTag--${type}`, `LemonTag--${size}`, className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--radius)',
        padding: size === 'small' ? '0.125rem 0.375rem' : '0.2rem 0.5rem',
        fontSize: size === 'small' ? '0.6875rem' : '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        textTransform: 'uppercase',
        backgroundColor:
          type === 'highlight' ? 'var(--primary-highlight, rgba(30,58,138,0.1))' :
          type === 'completion' || type === 'success' ? 'rgba(22,163,74,0.12)' :
          type === 'warning' ? 'rgba(217,119,6,0.12)' :
          type === 'danger' ? 'rgba(220,38,38,0.12)' :
          'var(--color-bg-surface-secondary, #f1f5f9)',
        color:
          type === 'highlight' ? 'var(--primary-3000, #1e3a8a)' :
          type === 'completion' || type === 'success' ? '#16a34a' :
          type === 'warning' ? '#d97706' :
          type === 'danger' ? '#dc2626' :
          'var(--color-text-secondary, #64748b)',
        border: '1px solid transparent',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

// ─── LemonBanner ────────────────────────────────────────────────────────────

export interface LemonBannerProps {
  children?: React.ReactNode
  type?: 'info' | 'success' | 'warning' | 'error'
  action?: { children: React.ReactNode; onClick: () => void }
  onClose?: () => void
  className?: string
}

export function LemonBanner({ children, type = 'info', action, onClose, className }: LemonBannerProps): JSX.Element {
  return (
    <div
      className={clsx('LemonBanner', `LemonBanner--${type}`, className)}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        borderRadius: 'var(--radius)',
        backgroundColor:
          type === 'error' ? 'var(--color-bg-fill-error-tertiary, #fef2f2)' :
          type === 'success' ? 'var(--color-bg-fill-success-tertiary, #f0fdf4)' :
          type === 'warning' ? 'var(--color-bg-fill-warning-tertiary, #fffbeb)' :
          'var(--color-bg-fill-info-tertiary, #eff6ff)',
        border: `1px solid ${
          type === 'error' ? 'var(--color-border-error, #fca5a5)' :
          type === 'success' ? 'var(--color-border-success, #86efac)' :
          type === 'warning' ? 'var(--color-border-warning, #fde047)' :
          'var(--color-border-info, #93c5fd)'
        }`,
        color: 'var(--text-3000)',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ flex: 1, lineHeight: 1.5 }}>{children}</div>
      {action && (
        <LemonButton size="small" type="secondary" onClick={action.onClick}>
          {action.children}
        </LemonButton>
      )}
      {onClose && (
        <LemonButton size="small" type="tertiary" icon={<IconX />} onClick={onClose} aria-label="Close banner" />
      )}
    </div>
  )
}

// ─── LemonInput ─────────────────────────────────────────────────────────────

export interface LemonInputProps {
  type?: 'text' | 'email' | 'search' | 'password' | 'number'
  value?: string | number
  defaultValue?: string | number
  onChange?: (newValue: string) => void
  placeholder?: string
  prefix?: React.ReactNode
  suffix?: React.ReactNode
  allowClear?: boolean
  disabled?: boolean
  fullWidth?: boolean
  size?: 'small' | 'medium' | 'large'
  className?: string
  autoFocus?: boolean
}

export const LemonInput = forwardRef<HTMLInputElement, LemonInputProps>(function LemonInput(
  {
    type = 'text',
    value,
    defaultValue,
    onChange,
    placeholder,
    prefix,
    suffix,
    allowClear,
    disabled,
    fullWidth,
    size = 'medium',
    className,
    autoFocus,
  },
  ref
) {
  const [internalValue, setInternalValue] = useState(value ?? defaultValue ?? '')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInternalValue(val)
    onChange?.(val)
  }

  const handleClear = () => {
    setInternalValue('')
    onChange?.('')
  }

  const displayValue = value !== undefined ? value : internalValue

  return (
    <span
      className={clsx(
        'LemonInput',
        'input-like',
        `LemonInput--${size}`,
        fullWidth && 'LemonInput--full-width',
        disabled && 'LemonInput--disabled',
        className
      )}
      style={{
        display: fullWidth ? 'flex' : 'inline-flex',
        alignItems: 'center',
        backgroundColor: 'var(--color-bg-surface-primary)',
        border: '1px solid var(--border-3000)',
        borderRadius: 'var(--radius)',
        padding: size === 'small' ? '0.25rem 0.5rem' : '0.375rem 0.625rem',
        fontSize: '0.8125rem',
        width: fullWidth ? '100%' : 'auto',
        gap: '0.375rem',
      }}
    >
      {prefix && <span className="LemonInput__prefix" style={{ display: 'inline-flex', color: 'var(--color-text-secondary)' }}>{prefix}</span>}
      <input
        ref={ref}
        type={type}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className="LemonInput__input"
        style={{
          border: 'none',
          outline: 'none',
          background: 'transparent',
          flex: 1,
          fontSize: 'inherit',
          color: 'var(--text-3000)',
          minWidth: 0,
        }}
      />
      {allowClear && displayValue && (
        <button
          type="button"
          onClick={handleClear}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'inline-flex', color: 'var(--color-text-secondary)' }}
        >
          <IconX style={{ fontSize: '0.875rem' }} />
        </button>
      )}
      {suffix && <span className="LemonInput__suffix" style={{ display: 'inline-flex', color: 'var(--color-text-secondary)' }}>{suffix}</span>}
    </span>
  )
})

// ─── LemonSelect ────────────────────────────────────────────────────────────

export interface LemonSelectOption<T> {
  value: T
  label: React.ReactNode
}

export interface LemonSelectProps<T> {
  value?: T
  onChange?: (newValue: T) => void
  options: LemonSelectOption<T>[]
  size?: 'small' | 'medium'
  disabled?: boolean
  className?: string
}

export function LemonSelect<T extends string | number>({ value, onChange, options, size = 'medium', disabled, className }: LemonSelectProps<T>): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange?.(e.target.value as T)}
      disabled={disabled}
      className={clsx('LemonSelect', `LemonSelect--${size}`, className)}
      style={{
        padding: size === 'small' ? '0.25rem 1.75rem 0.25rem 0.5rem' : '0.375rem 2rem 0.375rem 0.75rem',
        fontSize: '0.8125rem',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border-3000)',
        backgroundColor: 'var(--color-bg-surface-primary)',
        color: 'var(--text-3000)',
        outline: 'none',
        cursor: 'pointer',
      }}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={opt.value}>
          {typeof opt.label === 'string' ? opt.label : String(opt.value)}
        </option>
      ))}
    </select>
  )
}

// ─── MemberSelect Dropdown ──────────────────────────────────────────────────

export interface MemberSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  defaultLabel?: string
}

export function MemberSelectDropdown({
  value,
  onChange,
  options,
  defaultLabel = 'All Members',
}: MemberSelectProps): JSX.Element {
  const selectedOption = options.find((opt) => opt.value === value)
  const label = selectedOption && selectedOption.value !== 'all' ? selectedOption.label : defaultLabel

  return (
    <LemonButtonWithDropdown
      size="small"
      type="secondary"
      dropdown={{
        overlay: (
          <div>
            {options.map((opt) => (
              <LemonButton
                key={opt.value}
                fullWidth
                active={opt.value === value}
                onClick={() => onChange(opt.value)}
              >
                {opt.label}
              </LemonButton>
            ))}
          </div>
        ),
      }}
    >
      {label}
    </LemonButtonWithDropdown>
  )
}

// ─── LemonCard ──────────────────────────────────────────────────────────────

export interface LemonCardProps {
  children?: React.ReactNode
  hoverEffect?: boolean
  focused?: boolean
  closeable?: boolean
  onClose?: () => void
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function LemonCard({ children, hoverEffect = true, focused, closeable, onClose, onClick, className, style }: LemonCardProps): JSX.Element {
  return (
    <div
      className={clsx('LemonCard', hoverEffect && 'LemonCard--hoverEffect', focused && 'LemonCard--focused', className)}
      onClick={onClick}
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-bg-surface-primary)',
        border: focused ? '2px solid var(--primary-3000)' : '1px solid var(--border-3000)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 150ms ease',
        ...style,
      }}
    >
      {closeable && (
        <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem' }}>
          <LemonButton size="xsmall" type="tertiary" icon={<IconX />} onClick={onClose} />
        </div>
      )}
      {children}
    </div>
  )
}

// ─── LemonCollapse ──────────────────────────────────────────────────────────

export interface LemonCollapsePanelProps {
  header: React.ReactNode
  children: React.ReactNode
  defaultExpanded?: boolean
}

export function LemonCollapsePanel({ header, children, defaultExpanded = false }: LemonCollapsePanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div style={{ border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)', overflow: 'hidden', marginBottom: '0.5rem' }}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          backgroundColor: 'var(--color-bg-surface-secondary)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: 'var(--text-3000)',
        }}
      >
        <span>{header}</span>
        {expanded ? <IconChevronDown /> : <IconChevronRight />}
      </button>
      {expanded && (
        <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-surface-primary)', borderTop: '1px solid var(--border-3000)', fontSize: '0.875rem' }}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── LemonCalendar ──────────────────────────────────────────────────────────

export function LemonCalendar({ onSelectDate }: { onSelectDate?: (date: number) => void }): JSX.Element {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  const [selectedDay, setSelectedDay] = useState(15)

  return (
    <div style={{ padding: '1rem', backgroundColor: 'var(--color-bg-surface-primary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-lg)', maxWidth: '300px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 700, fontSize: '0.9375rem' }}>
        <LemonButton size="xsmall" type="tertiary" icon={<IconChevronLeft />} />
        <span>July 2026</span>
        <LemonButton size="xsmall" type="tertiary" icon={<IconChevronRight />} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '0.375rem' }}>
        <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => { setSelectedDay(d); onSelectDate?.(d); }}
            style={{
              height: '2rem',
              borderRadius: 'var(--radius)',
              border: 'none',
              backgroundColor: d === selectedDay ? 'var(--primary-3000)' : 'transparent',
              color: d === selectedDay ? '#fff' : 'var(--text-3000)',
              fontWeight: d === selectedDay ? 700 : 400,
              fontSize: '0.8125rem',
              cursor: 'pointer',
            }}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── LemonColor ─────────────────────────────────────────────────────────────

export function LemonColor({ color = '#1e3a8a', onChange }: { color?: string; onChange?: (c: string) => void }): JSX.Element {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
      <span style={{ width: '1.5rem', height: '1.5rem', borderRadius: '50%', backgroundColor: color, border: '2px solid var(--border-3000)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
      <input type="color" value={color} onChange={(e) => onChange?.(e.target.value)} style={{ display: 'none' }} />
      <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{color}</span>
    </label>
  )
}

// ─── Splotch ────────────────────────────────────────────────────────────────

export function Splotch({ color = '#1e3a8a' }: { color?: string }): JSX.Element {
  return (
    <span style={{ display: 'inline-block', width: '0.875rem', height: '0.875rem', borderRadius: '50%', backgroundColor: color, verticalAlign: 'middle' }} />
  )
}

// ─── LemonProgressCircle ────────────────────────────────────────────────────

export function LemonProgressCircle({ progress = 0.75, size = 36 }: { progress?: number; size?: number }): JSX.Element {
  const r = size / 2 - 3
  const c = 2 * Math.PI * r
  const offset = c - progress * c
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border-3000)" strokeWidth="4" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--primary-3000)" strokeWidth="4" fill="none" strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  )
}

// ─── PaginationControl ──────────────────────────────────────────────────────

export function PaginationControl({ page = 1, totalPages = 5, onChange }: { page?: number; totalPages?: number; onChange?: (p: number) => void }): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}>
      <LemonButton size="small" type="secondary" icon={<IconChevronLeft />} disabled={page <= 1} onClick={() => onChange?.(page - 1)} />
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3000)', padding: '0 0.5rem' }}>
        Page {page} of {totalPages}
      </span>
      <LemonButton size="small" type="secondary" icon={<IconChevronRight />} disabled={page >= totalPages} onClick={() => onChange?.(page + 1)} />
    </div>
  )
}

// ─── LemonTree ──────────────────────────────────────────────────────────────

export function LemonTreeItem({ label, children, defaultOpen = false }: { label: React.ReactNode; children?: React.ReactNode; defaultOpen?: boolean }): JSX.Element {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ paddingLeft: '0.75rem' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.25rem 0.5rem', cursor: children ? 'pointer' : 'default', borderRadius: 'var(--radius)', fontSize: '0.875rem' }}
      >
        {children ? (open ? <IconChevronDown /> : <IconChevronRight />) : <span style={{ width: '1em' }} />}
        <span>{label}</span>
      </div>
      {open && children && <div style={{ borderLeft: '1px dashed var(--border-3000)', marginLeft: '0.5rem' }}>{children}</div>}
    </div>
  )
}

// ─── LemonFileInput ─────────────────────────────────────────────────────────

export function LemonFileInput({ onFiles }: { onFiles?: (files: FileList) => void }): JSX.Element {
  return (
    <div style={{ border: '2px dashed var(--border-3000)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--color-bg-surface-secondary)', cursor: 'pointer' }}>
      <input type="file" onChange={(e) => e.target.files && onFiles?.(e.target.files)} style={{ display: 'none' }} id="lemon-file-input" />
      <label htmlFor="lemon-file-input" style={{ cursor: 'pointer' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary-3000)', marginBottom: '0.25rem' }}>
          Click to upload file
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
          Supports CSV, JSON, PNG (up to 10MB)
        </div>
      </label>
    </div>
  )
}

// ─── LemonDisabledArea ──────────────────────────────────────────────────────

export function LemonDisabledArea({ disabled = true, children }: { disabled?: boolean; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto', position: 'relative' }}>
      {children}
    </div>
  )
}

// ─── LemonField & LemonLabel ────────────────────────────────────────────────

export function LemonLabel({ children, info }: { children: React.ReactNode; info?: string }): JSX.Element {
  return (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-3000)' }}>
      {children}
      {info && <IconInfo aria-label={info} style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }} />}
    </label>
  )
}

export function LemonField({ label, error, help, children }: { label?: string; error?: string; help?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {label && <LemonLabel>{label}</LemonLabel>}
      {children}
      {error && <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>{error}</div>}
      {help && !error && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '0.25rem' }}>{help}</div>}
    </div>
  )
}

// ─── LemonSnack ─────────────────────────────────────────────────────────────

export function LemonSnack({ children, onClose }: { children: React.ReactNode; onClose?: () => void }): JSX.Element {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', borderRadius: '1rem', padding: '0.25rem 0.625rem', fontSize: '0.8125rem', fontWeight: 500 }}>
      {children}
      {onClose && (
        <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}>
          <IconX style={{ fontSize: '0.75rem' }} />
        </button>
      )}
    </span>
  )
}

// ─── LemonModal & LemonDialog ───────────────────────────────────────────────

export function LemonModal({ isOpen, onClose, title, children, footer }: { isOpen: boolean; onClose: () => void; title?: React.ReactNode; children?: React.ReactNode; footer?: React.ReactNode }): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}>
      <div style={{ backgroundColor: 'var(--color-bg-surface-primary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-lg)', boxShadow: '0 12px 32px rgba(0,0,0,0.2)', width: '90%', maxWidth: '480px', padding: '1.5rem', animation: 'pulse 150ms ease-out' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{title}</h3>
          <LemonButton size="xsmall" type="tertiary" icon={<IconX />} onClick={onClose} />
        </div>
        <div style={{ marginBottom: '1.5rem', fontSize: '0.875rem' }}>{children}</div>
        {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>{footer}</div>}
      </div>
    </div>
  )
}

// ─── LemonDrawer ────────────────────────────────────────────────────────────

export function LemonDrawer({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title?: React.ReactNode; children?: React.ReactNode }): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' }}>
      <div style={{ width: '380px', height: '100%', backgroundColor: 'var(--color-bg-surface-primary)', borderLeft: '1px solid var(--border-3000)', boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700 }}>{title}</h3>
          <LemonButton size="xsmall" type="tertiary" icon={<IconX />} onClick={onClose} />
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── LemonRow ───────────────────────────────────────────────────────────────

export function LemonRow({ icon, title, description, sideAction }: { icon?: React.ReactNode; title: React.ReactNode; description?: React.ReactNode; sideAction?: React.ReactNode }): JSX.Element {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '0.75rem 0', borderBottom: '1px solid var(--border-3000)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {icon && <span style={{ fontSize: '1.25rem', color: 'var(--primary-3000)' }}>{icon}</span>}
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-3000)' }}>{title}</div>
          {description && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>{description}</div>}
        </div>
      </div>
      {sideAction}
    </div>
  )
}

// ─── LemonMenu ──────────────────────────────────────────────────────────────

export function LemonMenu({ items }: { items: { label: React.ReactNode; icon?: React.ReactNode; onClick?: () => void; status?: 'danger' | 'default' }[] }): JSX.Element {
  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface-primary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-lg)', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', padding: '0.25rem 0', width: '220px' }}>
      {items.map((item, idx) => (
        <LemonButton
          key={idx}
          fullWidth
          icon={item.icon as React.ReactElement}
          status={item.status}
          onClick={item.onClick}
        >
          {item.label}
        </LemonButton>
      ))}
    </div>
  )
}

// ─── LemonTextArea ──────────────────────────────────────────────────────────

export interface LemonTextAreaProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  rows?: number
  disabled?: boolean
  maxLength?: number
}

export function LemonTextArea({ value, onChange, placeholder, rows = 3, disabled, maxLength }: LemonTextAreaProps): JSX.Element {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      maxLength={maxLength}
      style={{
        width: '100%',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-3000)',
        backgroundColor: 'var(--color-bg-surface-primary)',
        border: '1px solid var(--border-3000)',
        borderRadius: 'var(--radius)',
        outline: 'none',
        resize: 'vertical',
      }}
    />
  )
}

// ─── LemonRadio ─────────────────────────────────────────────────────────────

export interface LemonRadioOption<T> {
  value: T
  label: React.ReactNode
}

export interface LemonRadioProps<T> {
  value?: T
  onChange?: (value: T) => void
  options: LemonRadioOption<T>[]
}

export function LemonRadio<T extends string>({ value, onChange, options }: LemonRadioProps<T>): JSX.Element {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {options.map((opt) => (
        <label key={opt.value} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
          <input
            type="radio"
            name="lemon-radio"
            checked={opt.value === value}
            onChange={() => onChange?.(opt.value)}
            style={{ accentColor: 'var(--primary-3000)' }}
          />
          <span>{opt.label}</span>
        </label>
      ))}
    </div>
  )
}

// ─── LemonProgress ──────────────────────────────────────────────────────────

export function LemonProgress({ percent = 0, status = 'default' }: { percent?: number; status?: 'default' | 'success' | 'danger' }): JSX.Element {
  return (
    <div style={{ width: '100%', height: '0.5rem', backgroundColor: 'var(--border-3000)', borderRadius: '1rem', overflow: 'hidden' }}>
      <div
        style={{
          width: `${Math.min(100, Math.max(0, percent))}%`,
          height: '100%',
          backgroundColor: status === 'success' ? '#16a34a' : status === 'danger' ? '#dc2626' : 'var(--primary-3000)',
          transition: 'width 300ms ease',
        }}
      />
    </div>
  )
}

// ─── LemonSkeleton ──────────────────────────────────────────────────────────

export function LemonSkeleton({ width, height = '1.25rem', className }: { width?: string | number; height?: string | number; className?: string }): JSX.Element {
  return (
    <div
      className={clsx('LemonSkeleton', className)}
      style={{
        width: width ?? '100%',
        height,
        backgroundColor: 'var(--border-3000)',
        borderRadius: 'var(--radius)',
        animation: 'pulse 1.5s infinite ease-in-out',
        opacity: 0.6,
      }}
    />
  )
}

// ─── LemonSlider ────────────────────────────────────────────────────────────

export function LemonSlider({ min = 0, max = 100, value = 50, onChange }: { min?: number; max?: number; value?: number; onChange?: (val: number) => void }): JSX.Element {
  return (
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange?.(Number(e.target.value))}
      style={{ width: '100%', accentColor: 'var(--primary-3000)', cursor: 'pointer' }}
    />
  )
}

// ─── LemonSegmentedButton ───────────────────────────────────────────────────

export function LemonSegmentedButton<T extends string>({ value, onChange, options }: { value: T; onChange: (val: T) => void; options: { value: T; label: React.ReactNode }[] }): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', backgroundColor: 'var(--color-bg-surface-secondary)', padding: '0.1875rem', borderRadius: 'var(--radius)', gap: '0.125rem' }}>
      {options.map((opt) => {
        const isActive = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: '0.25rem 0.625rem',
              fontSize: '0.8125rem',
              fontWeight: isActive ? 600 : 500,
              borderRadius: 'calc(var(--radius) - 2px)',
              border: 'none',
              backgroundColor: isActive ? 'var(--color-bg-surface-primary)' : 'transparent',
              color: isActive ? 'var(--text-3000)' : 'var(--color-text-secondary)',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Lettermark ─────────────────────────────────────────────────────────────

export function Lettermark({ name, index = 1 }: { name: string; index?: number }): JSX.Element {
  const initial = name ? name.trim().charAt(0).toUpperCase() : 'P'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1.75rem',
        height: '1.75rem',
        borderRadius: 'var(--radius)',
        backgroundColor: index % 2 === 0 ? '#8da9e7' : '#dcb1e3',
        color: '#fff',
        fontWeight: 700,
        fontSize: '0.875rem',
      }}
    >
      {initial}
    </span>
  )
}

// ─── ProfilePicture ──────────────────────────────────────────────────────────

export interface ProfilePictureProps {
  name?: string
  email?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showName?: boolean
  index?: number
}

export function ProfilePicture({ name = 'Paul', email, size = 'md', showName = false }: ProfilePictureProps): JSX.Element {
  const sizePx = size === 'xs' ? 18 : size === 'sm' ? 24 : size === 'lg' ? 36 : 28
  const initial = name.charAt(0).toUpperCase()

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span
        style={{
          width: `${sizePx}px`,
          height: `${sizePx}px`,
          borderRadius: '50%',
          backgroundColor: 'var(--primary-3000)',
          color: '#fff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: `${sizePx * 0.45}px`,
          fontWeight: 600,
          userSelect: 'none',
        }}
      >
        {initial}
      </span>
      {showName && <span style={{ marginLeft: '0.375rem', fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-3000)' }}>{name}</span>}
    </span>
  )
}

// ─── LemonCheckbox ───────────────────────────────────────────────────────────

export interface LemonCheckboxProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}

export function LemonCheckbox({ checked = false, onChange, label, disabled = false, className }: LemonCheckboxProps): JSX.Element {
  return (
    <label className={clsx('LemonCheckbox', disabled && 'LemonCheckbox--disabled', className)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ accentColor: 'var(--primary-3000)', width: '1rem', height: '1rem', cursor: 'inherit' }}
      />
      {label && <span style={{ fontSize: '0.875rem', color: 'var(--text-3000)' }}>{label}</span>}
    </label>
  )
}

// ─── LemonSwitch ──────────────────────────────────────────────────────────────

export interface LemonSwitchProps {
  checked?: boolean
  onChange?: (checked: boolean) => void
  label?: React.ReactNode
  disabled?: boolean
  className?: string
}

export function LemonSwitch({ checked = false, onChange, label, disabled = false, className }: LemonSwitchProps): JSX.Element {
  return (
    <label className={clsx('LemonSwitch', disabled && 'LemonSwitch--disabled', className)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem', cursor: disabled ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        style={{
          width: '2.25rem',
          height: '1.25rem',
          borderRadius: '1rem',
          backgroundColor: checked ? 'var(--primary-3000)' : 'var(--color-border-primary)',
          position: 'relative',
          border: 'none',
          cursor: 'inherit',
          transition: 'background-color 200ms ease',
          padding: 0,
        }}
      >
        <span
          style={{
            width: '1rem',
            height: '1rem',
            borderRadius: '50%',
            backgroundColor: '#fff',
            position: 'absolute',
            top: '0.125rem',
            left: checked ? '1.125rem' : '0.125rem',
            transition: 'left 200ms ease',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        />
      </button>
      {label && <span style={{ fontSize: '0.875rem', color: 'var(--text-3000)' }}>{label}</span>}
    </label>
  )
}

// ─── LemonTabs ────────────────────────────────────────────────────────────────

export interface LemonTabsProps<T extends string = string> {
  activeKey: T
  onChange: (key: T) => void
  tabs: { key: T; label: React.ReactNode; badge?: React.ReactNode }[]
}

export function LemonTabs<T extends string = string>({ activeKey, onChange, tabs }: LemonTabsProps<T>): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '1px solid var(--border-3000)', paddingBottom: '2px' }}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            style={{
              padding: '0.5rem 0.875rem',
              fontSize: '0.875rem',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--primary-3000)' : 'var(--color-text-secondary)',
              border: 'none',
              background: 'none',
              borderBottom: isActive ? '2px solid var(--primary-3000)' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-3px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.375rem',
            }}
          >
            {tab.label}
            {tab.badge}
          </button>
        )
      })}
    </div>
  )
}

// ─── LemonDivider ───────────────────────────────────────────────────────────

export function LemonDivider({ vertical = false, className }: { vertical?: boolean; className?: string }): JSX.Element {
  return <div className={clsx('LemonDivider', vertical && 'LemonDivider--vertical', className)} style={{ height: vertical ? '100%' : '1px', width: vertical ? '1px' : '100%', backgroundColor: 'var(--border-3000)', margin: '0.5rem 0' }} />
}

// ─── LemonTable ─────────────────────────────────────────────────────────────

export interface LemonTableColumn<T> {
  title: React.ReactNode
  dataIndex?: keyof T
  key?: string
// eslint-disable-next-line @typescript-eslint/no-explicit-any
  render?: (value: any, record: T, index: number) => React.ReactNode
}

export interface LemonTableProps<T> {
  columns: LemonTableColumn<T>[]
  dataSource: T[]
  loading?: boolean
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function LemonTable<T extends Record<string, any>>({ columns, dataSource, loading, className }: LemonTableProps<T>): JSX.Element {
  return (
    <div style={{ position: 'relative', overflowX: 'auto' }}>
      {loading && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', backgroundColor: 'var(--primary-3000)', animation: 'pulse 1s infinite' }} />
      )}
      <table className={clsx('LemonTable', className)}>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th key={col.key ?? String(col.dataIndex) ?? idx}>{col.title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((row, rIdx) => (
            <tr key={rIdx}>
              {columns.map((col, cIdx) => {
                const val = col.dataIndex ? row[col.dataIndex] : undefined
                return (
                  <td key={col.key ?? cIdx}>
                    {col.render ? col.render(val, row, rIdx) : String(val ?? '')}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

export function Tooltip({ title, children }: { title: React.ReactNode; children: React.ReactElement }): JSX.Element {
  const [show, setShow] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)', backgroundColor: '#1E293B', color: '#fff', fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius)', whiteSpace: 'nowrap', zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          {title}
        </div>
      )}
    </div>
  )
}

// ─── LemonWidget ────────────────────────────────────────────────────────────

export function LemonWidget({ title, actions, children }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ backgroundColor: 'var(--color-bg-surface-primary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>{title}</h4>
        {actions}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── Link ───────────────────────────────────────────────────────────────────

export function Link({ to, targetBlank, children, className }: { to?: string; targetBlank?: boolean; children: React.ReactNode; className?: string }): JSX.Element {
  return (
    <a href={to ?? '#'} target={targetBlank ? '_blank' : undefined} rel={targetBlank ? 'noopener noreferrer' : undefined} className={clsx('Link', className)} style={{ color: 'var(--primary-3000)', textDecoration: 'none', fontWeight: 500 }}>
      {children}
    </a>
  )
}

// ─── LoadingBar ─────────────────────────────────────────────────────────────

export function LoadingBar({ loading }: { loading?: boolean }): JSX.Element | null {
  if (!loading) return null
  return <div style={{ height: '3px', width: '100%', backgroundColor: 'var(--primary-3000)', animation: 'pulse 1s infinite' }} />
}

// ─── UploadedLogo ───────────────────────────────────────────────────────────

export function UploadedLogo({ src, name = 'Logo' }: { src?: string; name?: string }): JSX.Element {
  return src ? (
    <img src={src} alt={name} style={{ width: '2rem', height: '2rem', borderRadius: 'var(--radius)', objectFit: 'contain' }} />
  ) : (
    <div style={{ width: '2rem', height: '2rem', borderRadius: 'var(--radius)', backgroundColor: 'var(--color-bg-surface-secondary)', border: '1px solid var(--border-3000)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
      {name.charAt(0)}
    </div>
  )
}

// ─── LemonInputSelect ───────────────────────────────────────────────────────

export function LemonInputSelect({ value, onChange, options }: { value?: string; onChange?: (val: string) => void; options: string[] }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      <LemonInput value={value} onChange={onChange} placeholder="Custom value..." />
      <LemonSelect value={value} onChange={onChange} options={options.map((o) => ({ value: o, label: o }))} />
    </div>
  )
}

// ─── LemonCalendarRange ─────────────────────────────────────────────────────

export function LemonCalendarRange({ startDate = '2026-07-01', endDate = '2026-07-22' }: { startDate?: string; endDate?: string }): JSX.Element {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.375rem 0.75rem', backgroundColor: 'var(--color-bg-surface-primary)', border: '1px solid var(--border-3000)', borderRadius: 'var(--radius)', fontSize: '0.8125rem' }}>
      <span>📅</span>
      <span>{startDate}</span>
      <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
      <span>{endDate}</span>
    </div>
  )
}
