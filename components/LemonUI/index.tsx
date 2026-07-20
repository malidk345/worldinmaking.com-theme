import React, { ReactNode, useState } from 'react';
import './lemon-ui.css';

// ── 1. LemonButton ─────────────────────────────────────────────────────────
export interface LemonButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'stealth' | 'active';
  size?: 'xsmall' | 'small' | 'medium' | 'large';
  icon?: ReactNode;
  sideIcon?: ReactNode;
  children?: ReactNode;
  className?: string;
  hotkey?: string;
}

export const LemonButton = React.forwardRef<HTMLButtonElement, LemonButtonProps>(
  ({ variant = 'secondary', size = 'medium', icon, sideIcon, children, className = '', hotkey, ...props }, ref) => {
    const variantClass = `LemonButton--${variant}`;
    const sizeClass = `LemonButton--size-${size}`;

    return (
      <button
        ref={ref}
        className={`LemonButton ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {icon && <span className="inline-flex shrink-0">{icon}</span>}
        {children && <span>{children}</span>}
        {sideIcon && <span className="inline-flex shrink-0 ml-auto">{sideIcon}</span>}
        {hotkey && (
          <kbd className="ml-1.5 px-1 py-0.2 text-[9px] font-mono bg-black/10 dark:bg-white/10 rounded border border-black/10 dark:border-white/10 opacity-70">
            {hotkey}
          </kbd>
        )}
      </button>
    );
  }
);
LemonButton.displayName = 'LemonButton';

// ── 2. LemonSegmentedButton ────────────────────────────────────────────────
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
}

export function LemonSegmentedButton<T extends string>({
  value,
  onChange,
  options,
  className = '',
}: LemonSegmentedButtonProps<T>) {
  return (
    <div className={`LemonSegmentedButton ${className}`}>
      {options.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`LemonSegmentedButton__option ${
              isActive ? 'LemonSegmentedButton__option--active' : ''
            }`}
          >
            {opt.icon && <span className="inline-block mr-1">{opt.icon}</span>}
            {opt.label}
          </button>
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
    <div className={`flex items-center gap-1 border-b border-slate-200 dark:border-blue-500/20 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge && <span className="ml-1">{tab.badge}</span>}
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
  return <span className={`LemonBadge ${className}`}>{content}</span>;
}

// ── 6. LemonSnack ──────────────────────────────────────────────────────────
export interface LemonSnackProps {
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}

export function LemonSnack({ children, onClose, className = '' }: LemonSnackProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-200 dark:bg-blue-950 text-slate-800 dark:text-slate-200 rounded-full border border-slate-300 dark:border-blue-500/30 ${className}`}>
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
export function Lettermark({ name }: { name: string }) {
  const char = (name || 'W').charAt(0).toUpperCase();
  return (
    <div className="w-5 h-5 rounded-md bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center font-bold text-[10px] font-mono shadow-xs shrink-0 select-none">
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
      className={`LemonCard ${onClick ? 'cursor-pointer hover:border-blue-500/40 transition-colors' : ''} ${className}`}
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
      <div className="flex items-center gap-2">
        {icon && <span className="shrink-0">{icon}</span>}
        <div>{children}</div>
      </div>
      {action && (
        <LemonButton variant="secondary" size="small" onClick={action.onClick}>
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
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#141E38] border-b border-slate-200 dark:border-blue-500/20">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{title}</h4>
        {actions && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div className="p-4 text-xs">{children}</div>
    </div>
  );
}

// ── 11. LemonInput ─────────────────────────────────────────────────────────
export interface LemonInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export const LemonInput = React.forwardRef<HTMLInputElement, LemonInputProps>(
  ({ icon, className = '', ...props }, ref) => {
    return (
      <div className="relative inline-flex items-center w-full">
        {icon && (
          <span className="absolute left-2.5 text-slate-400 pointer-events-none shrink-0">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={`w-full text-xs bg-slate-100 dark:bg-[#1C2541] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-blue-500/20 rounded-md py-1.5 ${
            icon ? 'pl-8' : 'pl-3'
          } pr-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all ${className}`}
          {...props}
        />
      </div>
    );
  }
);
LemonInput.displayName = 'LemonInput';

// ── 12. LemonTextArea ──────────────────────────────────────────────────────
export const LemonTextArea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full text-xs bg-slate-100 dark:bg-[#1C2541] text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-blue-500/20 rounded-md p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all ${className}`}
        {...props}
      />
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
      {label && <span className="text-xs text-slate-700 dark:text-slate-200 font-medium">{label}</span>}
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
        className="w-4 h-4 rounded border-slate-300 dark:border-blue-500/30 text-blue-600 focus:ring-blue-500/30 accent-blue-600 cursor-pointer"
      />
      {label && <span className="text-xs text-slate-700 dark:text-slate-200">{label}</span>}
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
            className="w-3.5 h-3.5 text-blue-600 accent-blue-600"
          />
          <span className="text-slate-700 dark:text-slate-200">{opt.label}</span>
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
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label}</label>}
      {children}
      {error && <span className="text-[11px] text-red-500 font-medium">{error}</span>}
      {help && <span className="text-[11px] text-slate-400">{help}</span>}
    </div>
  );
}

// ── 17. LemonDivider ───────────────────────────────────────────────────────
export function LemonDivider({ className = '' }: { className?: string }) {
  return <div className={`w-full h-px bg-slate-200 dark:bg-blue-500/20 my-3 ${className}`} />;
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
    <div className={`w-full overflow-x-auto border border-slate-200 dark:border-blue-500/20 rounded-md ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-slate-100 dark:bg-[#1C2541] border-b border-slate-200 dark:border-blue-500/20 text-slate-600 dark:text-slate-300 font-semibold">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-blue-500/10 bg-white dark:bg-[#0B132B]">
          {dataSource.map((record) => (
            <tr key={rowKey(record)} className="hover:bg-slate-50 dark:hover:bg-[#1C2541]/50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-slate-700 dark:text-slate-200">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white dark:bg-[#1C2541] border border-slate-200 dark:border-blue-500/30 rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-blue-500/20">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>
        <div className="p-5 text-xs text-slate-700 dark:text-slate-200">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 dark:bg-[#0B132B] border-t border-slate-200 dark:border-blue-500/20">
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
}

export function LemonCollapse({ title, children, defaultOpen = false }: LemonCollapseProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 dark:border-blue-500/20 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-[#141E38] text-slate-800 dark:text-slate-100 cursor-pointer"
      >
        <span>{title}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4 text-xs border-t border-slate-200 dark:border-blue-500/20">{children}</div>}
    </div>
  );
}

// ── 21. LemonSkeleton & Spinner ────────────────────────────────────────────
export function LemonSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-slate-200 dark:bg-blue-500/15 rounded-md ${className}`} />;
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin ${className}`} />
  );
}
