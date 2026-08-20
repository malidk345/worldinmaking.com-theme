import React from 'react';
import { UserSettings } from '../types';
import { X, Settings as SettingsIcon, RefreshCw } from 'lucide-react';

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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30 backdrop-blur-xs font-sans">
      <div className="w-full max-w-md rounded-2xl border border-primary bg-primary text-primary p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-primary pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-base">
            <SettingsIcon className="h-5 w-5 text-secondary" />
            <span>wim's ai bots settings</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-secondary hover:text-primary cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs">
          {/* Typewriter Speed */}
          <div>
            <label className="block font-semibold text-stone-800 mb-1">
              Response motion
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
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
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Open Artifacts */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
            <div>
              <div className="font-semibold text-stone-800">Auto-open artifacts</div>
              <div className="text-[10px] text-stone-500">Open the canvas when a document or chart is created.</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoOpenArtifacts}
              onChange={(e) => onUpdateSettings({ autoOpenArtifacts: e.target.checked })}
              className="h-4 w-4 accent-[#1E3A8A] rounded"
            />
          </div>

          {/* Reset Demo Data */}
          <div className="pt-2 border-t border-stone-100">
            <button
              onClick={() => {
                if (confirm('Reset all chats and local demo data?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2 font-medium text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset demo data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2">
          <button
            onClick={onClose}
            className="rounded-xl bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-800"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
