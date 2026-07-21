import React, { useState } from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonInput } from '../../LemonUI/LemonInput/LemonInput';
import { LemonTag } from '../../LemonUI/LemonTag/LemonTag';
import { LemonBanner } from '../../LemonUI/LemonBanner/LemonBanner';
import { IconHelmet, IconWarning, IconFeatures, IconMap } from '@posthog/icons';

export type SupportTicketKind = 'bug' | 'feedback' | 'support';

export interface SidePanelSupportProps {
  isOpen: boolean;
  onClose: () => void;
  statusMessage?: { severity: 'warning' | 'outage'; description: string; url?: string };
  onSubmit?: (kind: SupportTicketKind, subject: string, message: string) => void;
}

export function SidePanelSupport({ isOpen, onClose, statusMessage, onSubmit }: SidePanelSupportProps) {
  const [kind, setKind] = useState<SupportTicketKind>('support');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!subject.trim() || !message.trim()) return;
    onSubmit?.(kind, subject.trim(), message.trim());
    setSubmitted(true);
    setSubject('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 3000);
  };

  const kindOptions: { value: SupportTicketKind; label: string; icon: React.ReactNode }[] = [
    { value: 'bug', label: 'Bug report', icon: <IconWarning className="size-3.5" /> },
    { value: 'feedback', label: 'Feature request', icon: <IconFeatures className="size-3.5" /> },
    { value: 'support', label: 'Support', icon: <IconHelmet className="size-3.5" /> },
  ];

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconHelmet className="size-4 text-[var(--primary-3000)]" />
          Support
        </span>
      }
      description="Get help, report bugs, or request features"
      width="26rem"
      footer={
        <LemonButton
          type="primary"
          onClick={handleSubmit}
          fullWidth
          disabled={!subject.trim() || !message.trim()}
        >
          {submitted ? '✓ Submitted!' : 'Submit'}
        </LemonButton>
      }
    >
      <div className="flex flex-col gap-4 py-2">
        {statusMessage && (
          <LemonBanner type={statusMessage.severity === 'outage' ? 'error' : 'warning'}>
            <span className="text-xs">{statusMessage.description}</span>
          </LemonBanner>
        )}

        {/* Quick links */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)]">Quick resources</p>
          <div className="flex flex-wrap gap-2">
            <a href="https://posthog.com/docs" target="_blank" rel="noopener noreferrer">
              <LemonButton size="small" type="secondary" icon={<IconMap className="size-3.5" />}>
                Docs
              </LemonButton>
            </a>
            <a href="https://posthog.com/questions" target="_blank" rel="noopener noreferrer">
              <LemonButton size="small" type="secondary" icon={<IconFeatures className="size-3.5" />}>
                Community
              </LemonButton>
            </a>
          </div>
        </div>

        {/* Kind selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted-3000)]">Type</p>
          <div className="flex gap-2 flex-wrap">
            {kindOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setKind(opt.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors cursor-pointer ${
                  kind === opt.value
                    ? 'border-[var(--primary-3000)] bg-[var(--primary-3000-hover)] text-[var(--primary-3000)]'
                    : 'border-[var(--border-3000)] bg-transparent text-[var(--text-3000)] hover:bg-[var(--color-bg-fill-button-tertiary-hover)]'
                }`}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-3000)]">Subject</label>
            <LemonInput
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              fullWidth
              size="small"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--text-3000)]">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe in detail what you're experiencing..."
              rows={5}
              className="w-full rounded border border-[var(--border-3000)] bg-[var(--color-bg-surface-primary)] text-[var(--text-3000)] text-xs px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-[var(--primary-3000)] placeholder:text-[var(--muted-3000)]"
            />
          </div>
        </div>
      </div>
    </SidePanel>
  );
}
