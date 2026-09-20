import React, { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { SpriteSheetStudioView } from './SpriteSheetStudioView';
import { SavedAnimation, CharacterModel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  characters?: CharacterModel[];
  onImportAnimationAsCharacter?: (anim: SavedAnimation) => void;
  onRemoveAnimationFromCharacterList?: (anim: SavedAnimation) => void;
  onOpenMainCharacterList?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  characters,
  onImportAnimationAsCharacter,
  onRemoveAnimationFromCharacterList,
  onOpenMainCharacterList,
}) => {
  const [activeTab, setActiveTab] = useState<'spritesheet' | null>('spritesheet');

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="settings-fullscreen-page"
      className="fixed inset-0 z-50 flex flex-col bg-[#0b0f19] text-slate-100 select-none overflow-hidden"
    >
      {/* FULL SCREEN HEADER */}
      <header className="h-14 sm:h-16 px-4 sm:px-6 bg-[#111726] border-b border-slate-800 flex items-center justify-between shrink-0 shadow-md z-40">
        {/* Left: Sprite Sheet to Animation button */}
        <div className="flex items-center space-x-3">
          <button
            id="btn-sprite-sheet-animation"
            type="button"
            onClick={() => setActiveTab('spritesheet')}
            className={`flex items-center space-x-2 px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all cursor-pointer ${
              activeTab === 'spritesheet'
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40 ring-2 ring-rose-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4 text-rose-200" />
            <span>Sprite Sheet to Animation</span>
          </button>
        </div>

        {/* Right: Close icon */}
        <button
          onClick={onClose}
          className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Close (Esc)"
        >
          <X className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </header>

      {/* FULL SCREEN CONTENT BODY - ZERO GAP, 100% RESPONSIVE FIT */}
      <main className="flex-1 w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] p-0 m-0 relative overflow-hidden flex flex-col">
        {activeTab === 'spritesheet' && (
          <div className="w-full h-full flex-1 relative overflow-hidden">
            <SpriteSheetStudioView
              characters={characters}
              onImportAnimationAsCharacter={onImportAnimationAsCharacter}
              onRemoveAnimationFromCharacterList={onRemoveAnimationFromCharacterList}
              onOpenMainCharacterList={onOpenMainCharacterList}
            />
          </div>
        )}
      </main>
    </div>
  );
};

