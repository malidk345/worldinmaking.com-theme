import React, { useState } from 'react';
import { SidePanel } from '../../LemonUI/LemonDrawer/LemonDrawer';
import { LemonButton } from '../../LemonUI/LemonButton/LemonButton';
import { LemonInput } from '../../LemonUI/LemonInput/LemonInput';
import { IconSparkles, IconSend } from '@posthog/icons';

export interface SidePanelMaxProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SidePanelMax({ isOpen, onClose }: SidePanelMaxProps) {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([
    { role: 'assistant', text: 'Hello! I am Max, your PostHog AI assistant. How can I help you analyze your data or answer questions today?' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Analyzing "${userMsg}"... Here are the insights based on your telemetry and event data.` },
      ]);
    }, 600);
  };

  return (
    <SidePanel
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
          <IconSparkles className="size-4 text-[var(--primary-3000)]" />
          Max AI Assistant
        </span>
      }
      description="PostHog 3000 AI intelligence & analytics assistant"
      width="28rem"
      footer={
        <div className="flex items-center gap-2 w-full">
          <LemonInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask Max anything..."
            fullWidth
            size="small"
          />
          <LemonButton
            icon={<IconSend className="size-3.5" />}
            type="primary"
            size="small"
            onClick={handleSend}
          />
        </div>
      }
    >
      <div className="flex flex-col gap-3 py-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg text-xs leading-relaxed max-w-[90%] ${
              msg.role === 'user'
                ? 'ml-auto bg-[var(--primary-3000)] text-white font-medium'
                : 'mr-auto bg-[var(--color-accent-3000)] text-[var(--text-3000)] border border-[var(--border-3000)]'
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>
    </SidePanel>
  );
}
