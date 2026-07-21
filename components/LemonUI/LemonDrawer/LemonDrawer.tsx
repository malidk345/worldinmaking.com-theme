import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconX } from '@posthog/icons';
import { LemonButton } from '../LemonButton/LemonButton';
import '../lemon-ui.css';

export interface LemonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  width?: string | number;
  className?: string;
}

export function LemonDrawer({
  isOpen,
  onClose,
  title,
  description,
  footer,
  children,
  width = '24rem',
  className = '',
}: LemonDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[9998]"
          />

          {/* SidePanel Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            style={{ width }}
            className={`fixed right-0 top-0 bottom-0 z-[9999] bg-[var(--color-bg-surface-primary)] border-l border-[var(--border-3000)] shadow-2xl flex flex-col overflow-hidden max-w-full ${className}`}
          >
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-3000)] flex items-start justify-between bg-[var(--color-accent-3000)]">
              <div>
                {title && <h2 className="text-sm font-bold text-[var(--text-3000)]">{title}</h2>}
                {description && <p className="text-xs text-[var(--color-text-secondary-3000)] mt-0.5">{description}</p>}
              </div>
              <LemonButton
                icon={<IconX className="size-4" />}
                type="tertiary"
                size="xsmall"
                onClick={onClose}
              />
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 text-xs text-[var(--text-3000)]">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-4 border-t border-[var(--border-3000)] bg-[var(--color-accent-3000)] flex items-center justify-end gap-2">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export { LemonDrawer as SidePanel };
