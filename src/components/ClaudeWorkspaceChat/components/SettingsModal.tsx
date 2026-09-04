import React from 'react';
import { UserSettings } from '../types';
import { X, Settings as SettingsIcon, RefreshCw, Sparkles } from 'lucide-react';
import { useUser } from '../../../hooks/useUser';
import { useApp } from '../../../context/App';
import { isUserPro } from '../../../lib/wim-billing';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onResetData,
}) => {
  const { user } = useUser();
  const app = useApp();
  const isPro = isUserPro(user as any);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md rounded-2xl border border-primary bg-primary text-primary p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-base">
            <SettingsIcon className="h-5 w-5 text-secondary" />
            <span>AI Workspace Settings</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-secondary hover:text-primary cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs">
          {/* Plan & Membership (Subtle & Contextual) */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50/70 dark:border-stone-800 dark:bg-stone-900/40">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <span>Current Plan:</span>
                {isPro ? (
                  <span className="text-blue-600 dark:text-blue-400 font-bold">study</span>
                ) : user ? (
                  <span className="text-stone-700 dark:text-stone-300 font-medium">desk</span>
                ) : (
                  <span className="text-stone-500 font-medium">Guest Session</span>
                )}
              </div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                {isPro
                  ? 'deeper models and notebook memory are on.'
                  : 'open study for deeper models, panel debates, and memory that lasts.'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                app?.addWindow?.({ path: isPro ? '/account' : '/pricing' });
              }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded-lg border border-primary/20 bg-primary hover:bg-accent text-primary transition-all cursor-pointer shrink-0 flex items-center gap-1"
            >
              {isPro ? 'Manage' : 'Plans'}
            </button>
          </div>

          {/* Typewriter Speed */}
          <div>
            <label className="block font-semibold text-stone-800 dark:text-stone-200 mb-1">
              Response motion
            </label>
            <p className="text-[11px] text-stone-500 dark:text-stone-400 mb-2">
              Pace the on-screen reveal so short answers still linger a little.
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'slow', label: 'Gentle' },
                { id: 'smooth', label: 'Smooth' },
                { id: 'fast', label: 'Snappy' },
                { id: 'off', label: 'Off' },
              ].map((sp) => (
                <button
                  key={sp.id}
                  onClick={() => onUpdateSettings({ typewriterSpeed: sp.id as any })}
                  className={`py-2 rounded-xl border text-center font-medium transition-all ${
                    settings.typewriterSpeed === sp.id
                      ? 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-semibold'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900/30 dark:text-stone-300'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Open Artifacts */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50 dark:border-stone-800 dark:bg-stone-900/30">
            <div>
              <div className="font-semibold text-stone-800 dark:text-stone-200">Auto-open artifacts</div>
              <div className="text-[10px] text-stone-500 dark:text-stone-400">Open the canvas when a document or chart is created.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoOpenArtifacts}
              onChange={(e) => onUpdateSettings({ autoOpenArtifacts: e.target.checked })}
              className="h-4 w-4 accent-[#1E3A8A] rounded"
            />
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
            <button
              onClick={() => {
                if (confirm('Reset all chats and local demo data?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2 font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-900/30 dark:bg-rose-950/20 dark:text-rose-400 transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset chat data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 dark:bg-stone-100 px-4 py-2 text-xs font-semibold text-white dark:text-stone-900 hover:opacity-90 cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
