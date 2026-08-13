import React, { useState } from 'react';
import { ProjectSpace } from '../types';
import { X, FolderPlus } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: Omit<ProjectSpace, 'id' | 'chatCount' | 'createdAt'>) => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const iconName = 'FolderKanban';

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateProject({
      name: name.trim(),
      description: description.trim() || 'Özel çalışma alanı',
      systemPrompt: systemPrompt.trim() || 'Sen yardımsever bir yapay zeka asistanısın.',
      iconName,
      color: 'border-amber-200 text-amber-800',
    });

    setName('');
    setDescription('');
    setSystemPrompt('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/30 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-base">
            <FolderPlus className="h-5 w-5 text-[#1E3A8A]" />
            <h2 className="text-base font-semibold text-stone-900">
              Yeni Çalışma Alanı / Proje
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Proje Adı *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Mobil Uygulama Geliştirme"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#1E3A8A] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Açıklama
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Projenin amacı veya odak noktası..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#1E3A8A] focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Özel Sistem Talimatı (System Prompt)
            </label>
            <textarea
              rows={3}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Bu projedeki tüm sohbetlerde geçerli olacak özel talimatlar..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 focus:border-[#1E3A8A] focus:bg-white focus:outline-none resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              İptal
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#1E3A8A] px-4 py-2 font-semibold text-white hover:bg-[#1e40af] shadow-2xs"
            >
              Proje Oluştur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
