import React from 'react';
import { UserSettings, ThinkingBudget, ModelId } from '../types';
import { X, Settings as SettingsIcon, Brain, Zap, Layers, RefreshCw } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-base">
            <SettingsIcon className="h-5 w-5 text-stone-700" />
            <span>wim's ai bots settings</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Options */}
        <div className="space-y-4 text-xs">
          {/* Typewriter Speed */}
          <div>
            <label className="block font-semibold text-stone-800 mb-1">
              Daktilo Yanıt Hızı (Typewriter Effect)
            </label>
            <p className="text-[11px] text-stone-500 mb-2">
              Arayüzde model yanıtının akış hızını ayarlayın.
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'slow', label: 'Yavaş' },
                { id: 'smooth', label: 'Akıcı' },
                { id: 'fast', label: 'Hızlı' },
                { id: 'off', label: 'Kapalı' },
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

          {/* Default Thinking Budget */}
          <div>
            <label className="block font-semibold text-stone-800 mb-1 flex items-center gap-1.5">
              <Brain className="h-4 w-4 text-amber-700" /> varsayılan Düşünme Bütçesi
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'minimal', label: '1.0k (Hızlı)' },
                { id: 'balanced', label: '3.0k (Dengeli)' },
                { id: 'extended', label: '6.0k (Derin)' },
              ].map((b) => (
                <button
                  key={b.id}
                  onClick={() => onUpdateSettings({ defaultThinkingBudget: b.id as ThinkingBudget })}
                  className={`py-2 rounded-xl border text-center font-medium transition-all ${
                    settings.defaultThinkingBudget === b.id
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-semibold'
                      : 'border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Open Artifacts */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-stone-200 bg-stone-50">
            <div>
              <div className="font-semibold text-stone-800">Otomatik Artifacts Paneli</div>
              <div className="text-[10px] text-stone-500">Kod veya çizim üretildiğinde sağ paneli otomatik aç.</div>
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
                if (confirm('Tüm sohbet geçmişini ve verileri sıfırlamak istiyor musunuz?')) {
                  onResetData();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 py-2 font-medium text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Demo Verilerini Sıfırla
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
