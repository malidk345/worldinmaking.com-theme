import React, { useState } from 'react';
import { Chat } from '../types';
import { X, Share2, Copy, Check, Download, Globe } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, chat }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !chat) return null;

  const shareUrl = `${window.location.origin}/share/${chat.id}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportMarkdown = () => {
    let mdContent = `# ${chat.title}\n*Oluşturulma Tarihi: ${new Date(chat.createdAt).toLocaleString('tr-TR')}*\n\n---\n\n`;

    chat.messages.forEach((m) => {
      mdContent += `### ${m.role === 'user' ? 'you' : "wim's ai bots"}\n${m.content}\n\n`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-base">
            <Share2 className="h-5 w-5 text-[#1E3A8A]" />
            <span>Sohbeti Paylaş & Dışa Aktar</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-stone-700 mb-1">Doğrudan Bağlantı / Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 rounded-xl border border-stone-200 bg-stone-50 p-2.5 font-mono text-stone-600 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 shrink-0 rounded-xl bg-[#1E3A8A] px-3.5 py-2.5 font-semibold text-white hover:bg-[#1e40af]"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-stone-100">
            <button
              onClick={handleExportMarkdown}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-2.5 font-semibold text-stone-800 hover:bg-stone-100 transition-colors"
            >
              <Download className="h-4 w-4" /> Markdown (.md) Olarak İndir
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 px-4 py-2 font-medium text-stone-600 hover:bg-stone-100"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
