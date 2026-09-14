import React, { useState } from 'react';
import { Chat } from '../types';
import { X, Share2, Copy, Check, Download } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  shareBusy?: boolean;
  onEnableShare?: () => void;
  onDisableShare?: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  chat,
  shareBusy = false,
  onEnableShare,
  onDisableShare,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !chat) return null;

  const shareUrl = chat.shareToken && chat.isShared
    ? `${window.location.origin}/share/${chat.shareToken}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    let mdContent = `# ${chat.title}\n*Created: ${new Date(chat.createdAt).toLocaleString('en-US')}*\n\n---\n\n`;

    chat.messages.forEach((m) => {
      mdContent += `### ${m.role === 'user' ? 'you' : 'WIMBot'}\n${m.content}\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chat.title.replace(/\s+/g, '_').toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/30 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md rounded-2xl border border-primary bg-primary text-primary p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-base">
            <Share2 className="h-5 w-5 text-secondary" />
            <span>Share & export</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-secondary hover:text-primary cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-primary mb-1">Share link</label>
            {shareUrl ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    className="flex-1 rounded-xl border border-primary/20 bg-accent p-2.5 font-mono text-muted select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 shrink-0 rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-white hover:bg-accent"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                {onDisableShare && (
                  <button
                    onClick={onDisableShare}
                    disabled={shareBusy}
                    className="text-[11px] text-muted hover:text-primary"
                  >
                    Disable link
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={onEnableShare}
                disabled={shareBusy || !onEnableShare}
                className="w-full rounded-xl bg-primary px-3.5 py-2.5 font-semibold text-white hover:bg-accent disabled:opacity-60"
              >
                {shareBusy ? 'Creating link…' : 'Create shareable link'}
              </button>
            )}
          </div>

          <div className="pt-2 border-t border-primary/10">
            <button
              onClick={handleExportMarkdown}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/20 bg-accent py-2.5 font-semibold text-primary hover:bg-accent/50 transition-colors"
            >
              <Download className="h-4 w-4" /> Download Markdown
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-primary/20 px-4 py-2 font-medium text-muted hover:bg-accent/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};