/**
 * Lemon UI — PostHog 3000 component primitives
 * All styling uses CSS custom properties defined in lemon-ui.css,
 * which are extracted verbatim from posthog/frontend/src/styles/base.scss
 * and posthog/frontend/src/lib/lemon-ui/LemonButton/LemonButton.scss.
 *
 * NO hardcoded blue colors anywhere. Accent = PostHog orange/amber.
 */

import React, { ReactNode, useState } from 'react';
import './lemon-ui.css';

// ── 1. LemonButton (PostHog 1-to-1) ─────────────────────────────────────────
// DOM structure mirrors posthog LemonButton.tsx exactly:
//   <button className="LemonButton LemonButton--{type} LemonButton--status-{status} ...">
//     <span className="LemonButton__chrome">
//       <span className="LemonButton__icon">{icon}</span>
//       <span className="LemonButton__content">{children}</span>
//     </span>
//   </button>

export interface LemonButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  htmlType?: 'button' | 'submit' | 'reset';
  type?: 'primary' | 'secondary' | 'tertiary' | 'stealth' | 'muted';
  variant?: 'primary' | 'secondary' | 'tertiary' | 'stealth' | 'muted';
  status?: 'default' | 'alt' | 'danger';
  size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large';
  icon?: ReactNode;
  sideIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
  active?: boolean;
  fullWidth?: boolean;
  noPadding?: boolean;
  center?: boolean;
  loading?: boolean;
}

export const LemonButton = React.forwardRef<HTMLButtonElement, LemonButtonProps>(
  (
    {
      type = 'tertiary',
      variant,
      status = 'default',
      size,
      active = false,
      fullWidth = false,
      noPadding = false,
      center = false,
      loading = false,
      icon,
      sideIcon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const buttonType = variant || type;
    // Exact class names from PostHog LemonButton.tsx
    const classes = [
      'LemonButton',
      `LemonButton--${buttonType}`,
      `LemonButton--status-${status}`,
      size && `LemonButton--${size}`,
      active && 'LemonButton--active',
      loading && 'LemonButton--loading',
      fullWidth && 'LemonButton--full-width',
      noPadding && 'LemonButton--no-padding',
      center && 'LemonButton--centered',
      !children && 'LemonButton--no-content',
      icon && 'LemonButton--has-icon',
      sideIcon && 'LemonButton--has-side-icon',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const effectiveIcon = loading ? <Spinner /> : icon;

    return (
      <button
        ref={ref}
        className={classes}
        aria-disabled={!!disabled || loading}
        type={props.htmlType || 'button'} disabled={disabled || loading}
        {...props}
      >
        <span className="LemonButton__chrome">
          {effectiveIcon && <span className="LemonButton__icon">{effectiveIcon}</span>}
          {children && <span className="LemonButton__content">{children}</span>}
          {sideIcon && <span className="LemonButton__icon">{sideIcon}</span>}
        </span>
      </button>
    );
  }
);
LemonButton.displayName = 'LemonButton';

// ── 2. LemonSegmentedButton ─────────────────────────────────────────────────
export interface LemonSegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

export interface LemonSegmentedButtonProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: LemonSegmentedOption<T>[];
  className?: string;
  size?: 'xxsmall' | 'xsmall' | 'small' | 'medium' | 'large';
}

export function LemonSegmentedButton<T extends string>({
  value,
  onChange,
  options,
  className = '',
  size = 'xsmall',
}: LemonSegmentedButtonProps<T>) {
  return (
    <div className={`flex items-center w-full ${className}`}>
      {options.map((opt, idx) => {
        const isActive = opt.value === value;
        return (
          <LemonButton
            key={opt.value}
            type={isActive ? 'primary' : 'secondary'}
            onClick={() => onChange(opt.value)}
            icon={opt.icon}
            size={size}
            className={`flex-1 !rounded-none text-[11px] font-semibold ${
              idx === 0 
                ? '!rounded-l-[var(--radius)]' 
                : idx === options.length - 1 
                  ? '!rounded-r-[var(--radius)] -ml-px' 
                  : '-ml-px'
            }`}
            center
          >
            {opt.label}
          </LemonButton>
        );
      })}
    </div>
  );
}

// ── 3. LemonTabs ───────────────────────────────────────────────────────────
export interface LemonTab<T extends string> {
  key: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

export interface LemonTabsProps<T extends string> {
  activeKey: T;
  onChange: (key: T) => void;
  tabs: LemonTab<T>[];
  className?: string;
}

export function LemonTabs<T extends string>({ activeKey, onChange, tabs, className = '' }: LemonTabsProps<T>) {
  return (
    <div className={`LemonTabs ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`LemonTabs__tab${isActive ? ' LemonTabs__tab--active' : ''}`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span>{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

// ── 4. LemonTag ────────────────────────────────────────────────────────────
export interface LemonTagProps {
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'option' | 'highlight' | 'muted';
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LemonTag({ type = 'default', icon, children, className = '' }: LemonTagProps) {
  const typeClass = type !== 'default' ? `LemonTag--${type}` : '';
  return (
    <span className={`LemonTag ${typeClass} ${className}`}>
      {icon && <span className="inline-flex shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

// ── 5. LemonBadge ──────────────────────────────────────────────────────────
export interface LemonBadgeProps {
  content?: ReactNode;
  active?: boolean;
  className?: string;
}

export function LemonBadge({ content, active = true, className = '' }: LemonBadgeProps) {
  if (!active) return null;
  return (
    <span
      className={`inline-flex items-center justify-center min-w-[1.125rem] h-[1.125rem] px-1 text-[0.625rem] font-bold rounded-full bg-[var(--primary-3000)] text-white ${className}`}
    >
      {content}
    </span>
  );
}

// ── 6. LemonSnack ──────────────────────────────────────────────────────────
export interface LemonSnackProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function LemonSnack({ children, onClose, className = '' }: LemonSnackProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border border-[var(--border-3000)] bg-[var(--color-accent-3000)] text-[var(--text-3000)] ${className}`}
    >
      <span>{children}</span>
      {onClose && (
        <button onClick={onClose} className="hover:opacity-75 cursor-pointer text-xs font-bold leading-none">
          ×
        </button>
      )}
    </span>
  );
}

// ── 7. Lettermark ──────────────────────────────────────────────────────────
// PostHog brand: orange lettermark, not blue
export function Lettermark({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const char = (name || 'W').charAt(0).toUpperCase();
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[9px]' : size === 'lg' ? 'w-9 h-9 text-base' : 'w-7 h-7 text-xs';
  return (
    <div className={`Lettermark ${sizeClass} rounded font-bold flex items-center justify-center shrink-0 select-none`}>
      {char}
    </div>
  );
}

// ── 8. LemonCard ───────────────────────────────────────────────────────────
export interface LemonCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LemonCard({ children, className = '', onClick }: LemonCardProps) {
  return (
    <div
      onClick={onClick}
      className={`LemonCard ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ── 9. LemonBanner ─────────────────────────────────────────────────────────
export interface LemonBannerProps {
  type?: 'info' | 'warning' | 'success' | 'error';
  icon?: ReactNode;
  action?: { children: ReactNode; onClick: () => void };
  children: ReactNode;
  className?: string;
}

export function LemonBanner({ type = 'info', icon, action, children, className = '' }: LemonBannerProps) {
  return (
    <div className={`LemonBanner LemonBanner--${type} ${className}`}>
      <div className="flex items-start gap-2 flex-1">
        {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
        <div>{children}</div>
      </div>
      {action && (
        <LemonButton type="secondary" size="xsmall" onClick={action.onClick}>
          {action.children}
        </LemonButton>
      )}
    </div>
  );
}

// ── 10. LemonWidget ────────────────────────────────────────────────────────
export interface LemonWidgetProps {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LemonWidget({ title, actions, children, className = '' }: LemonWidgetProps) {
  return (
    <div className={`LemonCard p-0 overflow-hidden ${className}`}>
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: 'var(--border-3000)', background: 'var(--color-accent-3000)' }}
      >
        <h4 className="text-xs font-bold" style={{ color: 'var(--text-3000)' }}>
          {title}
        </h4>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div className="p-4 text-xs">{children}</div>
    </div>
  );
}

// ── 11. LemonInput ─────────────────────────────────────────────────────────
export interface LemonInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix' | 'suffix'> {
  icon?: ReactNode;
  prefix?: ReactNode;
  suffix?: ReactNode;
  status?: 'default' | 'danger';
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  allowClear?: boolean;
  onClear?: () => void;
}

export const LemonInput = React.forwardRef<HTMLInputElement, LemonInputProps>(
  (
    {
      icon,
      prefix,
      suffix,
      status = 'default',
      size = 'medium',
      fullWidth = true,
      allowClear,
      onClear,
      className = '',
      value,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const effectivePrefix = prefix || icon;
    const classes = [
      'LemonInput',
      'input-like',
      status !== 'default' && `LemonInput--status-${status}`,
      type && `LemonInput--type-${type}`,
      size && `LemonInput--${size}`,
      fullWidth && 'LemonInput--full-width',
      value && 'LemonInput--has-content',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={classes}>
        {effectivePrefix && <span className="LemonInput__prefix shrink-0 mr-1.5 opacity-60">{effectivePrefix}</span>}
        <input
          ref={ref}
          type={type}
          value={value}
          className="LemonInput__input"
          {...props}
        />
        {allowClear && value && (
          <button
            type="button"
            className="LemonInput__clear cursor-pointer opacity-60 hover:opacity-100 px-1"
            onClick={onClear}
          >
            ×
          </button>
        )}
        {suffix && <span className="LemonInput__suffix shrink-0 ml-1.5 opacity-60">{suffix}</span>}
      </span>
    );
  }
);
LemonInput.displayName = 'LemonInput';

// ── 12. LemonTextArea ──────────────────────────────────────────────────────
export interface LemonTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  status?: 'default' | 'danger';
}

export const LemonTextArea = React.forwardRef<HTMLTextAreaElement, LemonTextAreaProps>(
  ({ status = 'default', className = '', ...props }, ref) => {
    const classes = [
      'LemonInput',
      'LemonTextArea',
      'input-like',
      status !== 'default' && `LemonInput--status-${status}`,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <span className={classes}>
        <textarea
          ref={ref}
          className="LemonInput__input"
          style={{ resize: 'vertical', minHeight: '5rem' }}
          {...props}
        />
      </span>
    );
  }
);
LemonTextArea.displayName = 'LemonTextArea';

// ── 13. LemonSwitch ────────────────────────────────────────────────────────
export interface LemonSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  className?: string;
}

export function LemonSwitch({ checked, onChange, label, className = '' }: LemonSwitchProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <div
        onClick={() => onChange(!checked)}
        className={`LemonSwitch ${checked ? 'LemonSwitch--checked' : ''}`}
      >
        <div className="LemonSwitch__handle" />
      </div>
      {label && (
        <span className="text-xs font-medium" style={{ color: 'var(--text-3000)' }}>
          {label}
        </span>
      )}
    </label>
  );
}

// ── 14. LemonCheckbox ──────────────────────────────────────────────────────
export interface LemonCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  className?: string;
}

export function LemonCheckbox({ checked, onChange, label, className = '' }: LemonCheckboxProps) {
  return (
    <label className={`inline-flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: 'var(--primary-3000)' }}
        className="w-4 h-4 rounded cursor-pointer"
      />
      {label && (
        <span className="text-xs" style={{ color: 'var(--text-3000)' }}>
          {label}
        </span>
      )}
    </label>
  );
}

// ── 15. LemonRadio ─────────────────────────────────────────────────────────
export interface LemonRadioOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface LemonRadioProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: LemonRadioOption<T>[];
  className?: string;
}

export function LemonRadio<T extends string>({ value, onChange, options, className = '' }: LemonRadioProps<T>) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {options.map((opt) => (
        <label key={opt.value} className="inline-flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="radio"
            name="lemon-radio"
            checked={opt.value === value}
            onChange={() => onChange(opt.value)}
            style={{ accentColor: 'var(--primary-3000)' }}
            className="w-3.5 h-3.5"
          />
          <span style={{ color: 'var(--text-3000)' }}>{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

// ── 16. LemonField ─────────────────────────────────────────────────────────
export interface LemonFieldProps {
  label?: ReactNode;
  error?: ReactNode;
  help?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LemonField({ label, error, help, children, className = '' }: LemonFieldProps) {
  return (
    <div className={`LemonField ${className}`}>
      {label && <label className="LemonField__label">{label}</label>}
      {children}
      {error && <span className="LemonField__error">{error}</span>}
      {help && <span className="LemonField__help">{help}</span>}
    </div>
  );
}

// ── 17. LemonDivider ───────────────────────────────────────────────────────
export function LemonDivider({ className = '' }: { className?: string }) {
  return (
    <div
      className={`w-full h-px my-3 ${className}`}
      style={{ background: 'var(--border-3000)' }}
    />
  );
}

// ── 18. LemonTable ─────────────────────────────────────────────────────────
export interface LemonTableColumn<T> {
  title: string;
  key: string;
  render?: (record: T) => ReactNode;
}

export interface LemonTableProps<T> {
  columns: LemonTableColumn<T>[];
  dataSource: T[];
  rowKey: (record: T) => string;
  className?: string;
}

export function LemonTable<T extends Record<string, unknown>>({
  columns,
  dataSource,
  rowKey,
  className = '',
}: LemonTableProps<T>) {
  return (
    <div
      className={`w-full overflow-x-auto rounded border ${className}`}
      style={{ borderColor: 'var(--border-3000)' }}
    >
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr
            className="text-xs font-semibold border-b"
            style={{
              background: 'var(--color-accent-3000)',
              color: 'var(--color-text-secondary-3000)',
              borderColor: 'var(--border-3000)',
            }}
          >
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataSource.map((record) => (
            <tr
              key={rowKey(record)}
              className="border-b transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--border-3000)', background: 'var(--color-bg-surface-primary)' }}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2" style={{ color: 'var(--text-3000)' }}>
                  {col.render ? col.render(record) : String(record[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── 19. LemonModal ─────────────────────────────────────────────────────────
export interface LemonModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function LemonModal({ isOpen, onClose, title, children, footer }: LemonModalProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="w-full max-w-lg rounded-lg shadow-xl overflow-hidden border"
        style={{
          background: 'var(--color-bg-surface-primary)',
          borderColor: 'var(--border-3000)',
        }}
      >
        <div
          className="flex items-center justify-between px-5 py-3.5 border-b"
          style={{ borderColor: 'var(--border-3000)' }}
        >
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-3000)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-lg leading-none cursor-pointer hover:opacity-70"
            style={{ color: 'var(--muted-3000)' }}
          >
            ×
          </button>
        </div>
        <div className="p-5 text-xs" style={{ color: 'var(--text-3000)' }}>
          {children}
        </div>
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3 border-t"
            style={{ background: 'var(--color-accent-3000)', borderColor: 'var(--border-3000)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 20. LemonCollapse ──────────────────────────────────────────────────────
export interface LemonCollapseProps {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  embedded?: boolean;
}

export function LemonCollapse({ title, children, defaultOpen = false, embedded = false }: LemonCollapseProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`LemonCollapse ${embedded ? 'LemonCollapse--embedded' : ''}`}>
      <div className="LemonCollapsePanel" aria-expanded={open}>
        <LemonButton
          fullWidth
          className="LemonCollapsePanel__header"
          onClick={() => setOpen(!open)}
          icon={open ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          )}
          style={{ display: 'flex', width: '100%' }}
        >
          <span className="font-semibold text-xs lowercase">{title}</span>
        </LemonButton>
        <div
          className="LemonCollapsePanel__body"
          style={{ maxHeight: open ? '1000px' : '0px', transition: 'max-height 200ms ease-in-out' }}
        >
          <div className="LemonCollapsePanel__content" style={{ padding: 0 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 21. LemonSkeleton & Spinner ─────────────────────────────────────────────
export function LemonSkeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className}`}
      style={{ background: 'var(--border-3000)' }}
    />
  );
}

// Spinner — PostHog uses orange/amber, not blue
export interface SpinnerProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  textColored?: boolean;
}

export function Spinner({ className = '', size = 'small', textColored = false }: SpinnerProps) {
  const sizeMap = { small: 'w-4 h-4', medium: 'w-5 h-5', large: 'w-6 h-6' };
  return (
    <span
      className={`LemonSpinner ${sizeMap[size]} ${className}`}
      style={textColored ? { color: 'currentColor' } : { borderColor: 'var(--primary-3000)', borderTopColor: 'transparent' }}
    />
  );
}

// ── 22. LemonProgress & LemonProgressCircle ───────────────────────────────
export interface LemonProgressProps {
  percent: number;
  size?: 'medium' | 'large';
  bgColor?: string;
  strokeColor?: string;
  className?: string;
  children?: ReactNode;
}

export function LemonProgress({
  percent,
  size = 'medium',
  bgColor = 'var(--color-bg-3000)',
  strokeColor = 'var(--primary-3000)',
  className = '',
  children,
}: LemonProgressProps) {
  const width = isNaN(percent) ? 0 : Math.max(Math.min(percent, 100), 0);
  return (
    <div
      className={`LemonProgress rounded-full w-full inline-block ${size === 'large' ? 'h-5' : 'h-1.5'} ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      <span
        className="LemonProgress__track block h-full rounded-full transition-all duration-300"
        style={{ width: `${width}%`, backgroundColor: strokeColor }}
      >
        {children}
      </span>
    </div>
  );
}

export function LemonProgressCircle({ percent, size = 36, strokeWidth = 4 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--border-3000)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="var(--primary-3000)"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        fill="none"
        className="transition-all duration-300"
      />
    </svg>
  );
}

// ── 23. LemonFileInput ─────────────────────────────────────────────────────
export interface LemonFileInputProps {
  value?: File[];
  onChange?: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  loading?: boolean;
  callToAction?: ReactNode;
  className?: string;
}

export function LemonFileInput({
  value = [],
  onChange,
  accept,
  multiple = false,
  loading = false,
  callToAction = 'Drop files here or click to upload',
  className = '',
}: LemonFileInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onChange) {
      onChange(Array.from(e.target.files));
    }
  };

  return (
    <div className={`LemonFileInput border-2 border-dashed border-[var(--border-3000)] hover:border-[var(--primary-3000)] rounded-lg p-6 text-center cursor-pointer transition-colors ${className}`}>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        id="lemon-file-input"
      />
      <label htmlFor="lemon-file-input" className="cursor-pointer flex flex-col items-center gap-2">
        {loading ? <Spinner size="medium" /> : <span className="text-xs font-semibold text-[var(--text-3000)]">{callToAction}</span>}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {value.map((f, i) => (
              <LemonTag key={i} type="muted">{f.name}</LemonTag>
            ))}
          </div>
        )}
      </label>
    </div>
  );
}

// ── 24. LemonTree ──────────────────────────────────────────────────────────
export interface LemonTreeItem {
  id: string;
  name: string;
  icon?: ReactNode;
  children?: LemonTreeItem[];
}

export function LemonTree({ items, onSelect, className = '' }: { items: LemonTreeItem[]; onSelect?: (item: LemonTreeItem) => void; className?: string }) {
  return (
    <div className={`LemonTree flex flex-col gap-1 ${className}`}>
      {items.map((item) => (
        <LemonTreeRow key={item.id} item={item} onSelect={onSelect} level={0} />
      ))}
    </div>
  );
}

function LemonTreeRow({ item, onSelect, level }: { item: LemonTreeItem; onSelect?: (item: LemonTreeItem) => void; level: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        onClick={() => {
          if (hasChildren) setExpanded(!expanded);
          onSelect?.(item);
        }}
        className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-[var(--color-bg-fill-button-tertiary-hover)] text-xs text-[var(--text-3000)]"
        style={{ paddingLeft: `${(level + 1) * 0.75}rem` }}
      >
        {hasChildren && <span className="text-[10px] opacity-60">{expanded ? '▼' : '▶'}</span>}
        {item.icon && <span>{item.icon}</span>}
        <span className="font-medium">{item.name}</span>
      </div>
      {hasChildren && expanded && (
        <div className="flex flex-col gap-0.5">
          {item.children!.map((child) => (
            <LemonTreeRow key={child.id} item={child} onSelect={onSelect} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── 25. LemonMenu & LemonDropdown ──────────────────────────────────────────
export interface LemonMenuItem {
  key: string;
  label: ReactNode;
  icon?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
}

export function LemonMenu({ items, className = '' }: { items: LemonMenuItem[]; className?: string }) {
  return (
    <div className={`LemonMenu bg-[var(--color-bg-surface-primary)] border border-[var(--border-3000)] rounded-md shadow-lg p-1 min-w-[160px] ${className}`}>
      {items.map((item) => (
        <button
          key={item.key}
          onClick={item.onClick}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded text-left transition-colors ${
            item.danger ? 'text-red-500 hover:bg-red-500/10' : 'text-[var(--text-3000)] hover:bg-[var(--color-bg-fill-button-tertiary-hover)]'
          }`}
        >
          {item.icon && <span>{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
