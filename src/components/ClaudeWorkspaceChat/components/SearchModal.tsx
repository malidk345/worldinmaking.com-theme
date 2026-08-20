import React, { useState, useEffect } from 'react';
import { Chat } from '../types';
import { Search, X, MessageSquare, ArrowRight, Calendar } from 'lucide-react';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  chats: Chat[];
  onSelectChat: (chatId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  chats,
  onSelectChat,
}) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Search results
  const results = chats.flatMap((chat) => {
    const titleMatch = chat.title.toLowerCase().includes(query.toLowerCase());
    const matchingMessages = chat.messages.filter((m) =>
      m.content.toLowerCase().includes(query.toLowerCase())
    );

    if (titleMatch || matchingMessages.length > 0) {
      return [
        {
          chat,
          matchingMessage: matchingMessages[0] || chat.messages[0],
        },
      ];
    }
    return [];
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-stone-950/30 backdrop-blur-xs font-sans">
      <div className="w-full max-w-xl rounded-2xl border border-primary bg-primary text-primary shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Header */}
        <div className="flex items-center gap-3 border-b border-primary px-4 py-3 bg-primary">
          <Search className="h-5 w-5 text-muted shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats and messages..."
            className="w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
            autoFocus
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-secondary hover:bg-accent hover:text-primary cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted">
              {query ? 'No matching chats.' : 'Type to search.'}
            </div>
          ) : (
            results.map(({ chat, matchingMessage }) => (
              <div
                key={chat.id}
                onClick={() => {
                  onSelectChat(chat.id);
                  onClose();
                }}
                className="group flex cursor-pointer items-start justify-between rounded-xl p-3 hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                    <MessageSquare className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold text-primary truncate">
                        {chat.title}
                      </h4>
                      <span className="flex items-center gap-1 text-[10px] text-muted shrink-0">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(chat.createdAt).toLocaleDateString('en-US')}
                      </span>
                    </div>

                    {matchingMessage && (
                      <p className="text-[11.5px] text-secondary line-clamp-2 leading-relaxed">
                        {matchingMessage.content}
                      </p>
                    )}
                  </div>
                </div>

                <ArrowRight className="h-4 w-4 text-muted group-hover:text-primary transition-colors shrink-0 mt-1" />
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="border-t border-primary px-4 py-2 bg-primary text-[11px] text-muted flex items-center justify-between">
          <span>
            Press <strong>ESC</strong> to close
          </span>
          <span>{results.length} {results.length === 1 ? 'result' : 'results'}</span>
        </div>
      </div>
    </div>
  );
};
