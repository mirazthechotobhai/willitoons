import React, { useState } from 'react';
import { CharacterModel, CharacterAngle } from '../types';
import { CartoonCharacter } from './CartoonCharacter';
import { Search, Plus, Edit2, Sparkles, X, Zap, Settings } from 'lucide-react';

interface CharacterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  characters: CharacterModel[];
  onSelectCharacter: (char: CharacterModel) => void;
  onCreateNewCharacter: () => void;
  onEditCharacter: (char: CharacterModel) => void;
  onDragStartCharacter: (e: React.DragEvent, char: CharacterModel) => void;
}

const CATEGORIES = [
  'All',
  'Desi',
  'Village',
  'Western',
  'Indonesian',
  'Birds',
  'Animals',
  'Vehicles',
  'Religious',
  'Horror',
  'Latest',
];

export const CharacterDrawer: React.FC<CharacterDrawerProps> = ({
  isOpen,
  onClose,
  characters,
  onSelectCharacter,
  onCreateNewCharacter,
  onEditCharacter,
  onDragStartCharacter,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [charAngles, setCharAngles] = useState<Record<string, CharacterAngle>>({});

  if (!isOpen) return null;

  const filteredCharacters = characters.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      activeCategory === 'All' ||
      activeCategory === 'Latest' ||
      char.category.toLowerCase() === activeCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full sm:w-84 md:w-96 max-w-full h-full max-h-[100dvh] bg-white border-r border-slate-200 flex flex-col z-20 shadow-2xl select-none overflow-hidden">
      
      {/* Header (Screenshot 4: Characters + Create) */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-bold text-slate-800">Characters</h2>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
            {characters.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onCreateNewCharacter}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <span>Create</span>
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-slate-100 bg-white">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Characters"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Pills (Scrollable horizontally) */}
      <div className="flex items-center space-x-1.5 px-3 py-2 overflow-x-auto no-scrollbar border-b border-slate-100 bg-slate-50/70">
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* 2-Column Character Cards Grid */}
      <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 gap-3 auto-rows-max bg-slate-50/30">
        {filteredCharacters.map(char => {
          const currentAngle: CharacterAngle = charAngles[char.id] || char.angle || 'threeQuarterFront';
          const effectiveChar: CharacterModel = { ...char, angle: currentAngle };

          return (
            <div
              key={char.id}
              draggable
              onDragStart={e => onDragStartCharacter(e, effectiveChar)}
              onClick={() => onSelectCharacter(effectiveChar)}
              className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col"
            >
              {/* Top Card Bar: Name & Edit Button or Sprite Badge */}
              <div className="flex items-center justify-between p-2 pb-0 z-10">
                <span className="text-[11px] font-semibold text-slate-700 truncate max-w-[85px]">
                  {char.name}
                </span>
                {char.isSpriteSheet ? (
                  <span
                    className="flex items-center space-x-0.5 px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded border border-amber-300"
                    title="Sprite Sheet Animation"
                  >
                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    <span>Sprite</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onEditCharacter(char);
                    }}
                    className="flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded border border-slate-200 transition-colors cursor-pointer"
                    title="Edit Character & IK Rig"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {/* Character Visual - Click here to add to timeline */}
              <div
                className="w-full h-36 flex items-center justify-center p-2 relative bg-slate-50/60 cursor-pointer hover:bg-blue-50/40 transition-colors overflow-hidden"
                title="Click character to add to timeline"
              >
                {effectiveChar.isSpriteSheet ? (
                  !effectiveChar.spriteSheet?.imageUrl ? (
                    <div className="flex flex-col items-center justify-center space-y-1.5 text-amber-500">
                      <Settings className="w-7 h-7 animate-spin text-amber-500" />
                      <span className="text-[10px] font-semibold text-slate-500">Loading sprite...</span>
                    </div>
                  ) : (() => {
                    const sp = effectiveChar.spriteSheet;
                    const ratio = sp.aspectRatio || (sp.frameWidth && sp.frameHeight ? sp.frameWidth / sp.frameHeight : 1);
                    const boxW = ratio >= 1 ? 120 : Math.max(30, Math.round(112 * ratio));
                    const boxH = ratio >= 1 ? Math.max(30, Math.round(120 / ratio)) : 112;

                    return (
                      <div
                        className="group-hover:scale-105 transition-transform flex items-center justify-center"
                        style={{
                          width: `${boxW}px`,
                          height: `${boxH}px`,
                          maxWidth: '100%',
                          maxHeight: '100%',
                        }}
                      >
                        <CartoonCharacter
                          model={effectiveChar}
                          animation="idle"
                          skeletonMode={false}
                          width="100%"
                          height="100%"
                        />
                      </div>
                    );
                  })()
                ) : (
                  <div className="w-24 h-32 group-hover:scale-105 transition-transform flex items-center justify-center">
                    <CartoonCharacter
                      model={effectiveChar}
                      animation="idle"
                      skeletonMode={false}
                      width="100%"
                      height="100%"
                    />
                  </div>
                )}
              </div>

              {/* Interactive 3-Angle Switcher OR Sprite Sheet Info */}
              {char.isSpriteSheet ? (
                <div
                  className="flex items-center justify-between px-2 py-1 bg-amber-50/90 border-t border-amber-200/60 text-[9px] font-medium text-amber-900 select-none"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="flex items-center gap-1 font-mono text-amber-700">
                    <Zap className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                    <span>{char.spriteSheet?.frameCount || 0} frames</span>
                  </span>
                  <span className="text-[8.5px] font-semibold text-amber-700">Add to Timeline</span>
                </div>
              ) : (
                <div
                  className="flex items-center justify-between p-1 bg-slate-100/90 border-t border-slate-200 text-[8.5px] font-bold gap-0.5 select-none"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setCharAngles(prev => ({ ...prev, [char.id]: 'threeQuarterFront' }));
                    }}
                    className={`flex-1 py-1 px-0.5 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
                      currentAngle === 'threeQuarterFront'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="3/4 Front Angle"
                  >
                    3/4 Front
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setCharAngles(prev => ({ ...prev, [char.id]: 'front' }));
                    }}
                    className={`flex-1 py-1 px-0.5 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
                      currentAngle === 'front'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="Front Angle"
                  >
                    Front
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      setCharAngles(prev => ({ ...prev, [char.id]: 'threeQuarterBack' }));
                    }}
                    className={`flex-1 py-1 px-0.5 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
                      currentAngle === 'threeQuarterBack'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                    title="3/4 Back Angle"
                  >
                    3/4 Back
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filteredCharacters.length === 0 && (
          <div className="col-span-2 py-12 text-center text-slate-400 text-xs">
            No characters found in {activeCategory}.
            <div className="mt-2">
              <button
                onClick={onCreateNewCharacter}
                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg inline-flex items-center space-x-1 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create One Now</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick helper at bottom */}
      <div className="px-4 py-2 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Click or Drag onto Stage</span>
        </span>
      </div>
    </div>
  );
};
