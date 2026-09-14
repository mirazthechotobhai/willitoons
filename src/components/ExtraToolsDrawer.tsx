import React, { useState } from 'react';
import { LeftNavTab } from './LeftSidebarRail';
import { Scene, StageElement, MediaAsset } from '../types';
import {
  Sparkles,
  Type,
  Video,
  Image as ImageIcon,
  LayoutTemplate,
  Bot,
  Plus,
  X,
  MessageSquare,
  Wand2,
} from 'lucide-react';

interface ExtraToolsDrawerProps {
  activeTab: LeftNavTab;
  onClose: () => void;
  onAddTextElement: (type: 'text' | 'speechBubble', customText?: string) => void;
  onApplyBackground: (url: string) => void;
  onAddGeneratedAsset: (asset: MediaAsset) => void;
}

export const ExtraToolsDrawer: React.FC<ExtraToolsDrawerProps> = ({
  activeTab,
  onClose,
  onAddTextElement,
  onApplyBackground,
  onAddGeneratedAsset,
}) => {
  const [promptText, setPromptText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (
    !activeTab ||
    activeTab === 'character' ||
    activeTab === 'media' ||
    activeTab === 'animIK'
  ) {
    return null;
  }

  const handleRunAIGen = () => {
    if (!promptText.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
      setIsGenerating(false);
      if (activeTab === 'imageGen' || activeTab === 'aiThumbnail') {
        const newAsset: MediaAsset = {
          id: `gen-img-${Date.now()}`,
          name: `AI: ${promptText.substring(0, 18)}`,
          type: 'image',
          category: 'AI Generated',
          url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
              <defs>
                <linearGradient id="aiG" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#3b82f6"/>
                  <stop offset="50%" stop-color="#8b5cf6"/>
                  <stop offset="100%" stop-color="#ec4899"/>
                </linearGradient>
              </defs>
              <rect width="1280" height="720" fill="url(#aiG)"/>
              <circle cx="640" cy="360" r="220" fill="#ffffff" opacity="0.2"/>
              <text x="640" y="380" fill="#ffffff" font-size="44" font-family="sans-serif" font-weight="bold" text-anchor="middle">
                ${promptText}
              </text>
            </svg>
          `),
          thumbnail: '✨',
        };
        onAddGeneratedAsset(newAsset);
        onApplyBackground(newAsset.url);
      }
      setPromptText('');
    }, 1200);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-md select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
        <div className="flex items-center space-x-2">
          {activeTab === 'text' && <Type className="w-4 h-4 text-blue-600" />}
          {activeTab === 'templates' && <LayoutTemplate className="w-4 h-4 text-blue-600" />}
          {(activeTab === 'imageGen' || activeTab === 'aiThumbnail') && <Sparkles className="w-4 h-4 text-amber-500" />}
          {activeTab === 'videoGen' && <Video className="w-4 h-4 text-purple-600" />}
          {activeTab === 'aiCharacter' && <Bot className="w-4 h-4 text-emerald-600" />}

          <span className="text-sm font-bold text-slate-800 capitalize">
            {activeTab.replace(/([A-Z])/g, ' $1')}
          </span>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30">
        
        {/* TEXT & DIALOGUES TAB */}
        {activeTab === 'text' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Add speech bubbles, dialogues, or title overlays to the active scene:
            </p>

            <button
              onClick={() => onAddTextElement('speechBubble', 'Hey! Look at this!')}
              className="w-full p-3 bg-white hover:bg-amber-50/50 border border-slate-200 hover:border-amber-400 rounded-xl flex items-center space-x-3 text-left transition-colors cursor-pointer group shadow-xs"
            >
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Speech Bubble</div>
                <div className="text-[10px] text-slate-500">Comic dialogue bubble with character tail</div>
              </div>
            </button>

            <button
              onClick={() => onAddTextElement('text', 'Episode 1: The Adventure Begins')}
              className="w-full p-3 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl flex items-center space-x-3 text-left transition-colors cursor-pointer group shadow-xs"
            >
              <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:scale-105 transition-transform">
                <Type className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">Scene Title / Headline</div>
                <div className="text-[10px] text-slate-500">Bold stylized typography header</div>
              </div>
            </button>
          </div>
        )}

        {/* TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              Choose a pre-built animated story template:
            </p>

            {[
              {
                title: 'Village Comedy Sketch',
                desc: 'Chotu and Uncle Ji comic dialogue interaction',
                bg: 'Village Morning',
              },
              {
                title: 'School Girl Science Talk',
                desc: 'Priya educational explainer animation',
                bg: 'City Street',
              },
              {
                title: 'Horror Night Mystery',
                desc: 'Spooky haunted house adventure',
                bg: 'Night Spooky',
              },
            ].map(tpl => (
              <div
                key={tpl.title}
                className="p-3 bg-white border border-slate-200 rounded-xl space-y-2 hover:border-blue-500 hover:shadow-sm transition-all cursor-pointer shadow-xs"
              >
                <div className="text-xs font-bold text-slate-800">{tpl.title}</div>
                <div className="text-[11px] text-slate-500">{tpl.desc}</div>
                <div className="flex items-center justify-between pt-1 text-[10px] text-blue-600 font-semibold">
                  <span>Includes characters + audio</span>
                  <span className="px-2 py-0.5 bg-blue-50 rounded font-bold">Load</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI GENERATOR TABS */}
        {(activeTab === 'imageGen' || activeTab === 'aiThumbnail' || activeTab === 'videoGen' || activeTab === 'aiCharacter') && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                AI Cartoon Prompt
              </label>
              <textarea
                rows={3}
                value={promptText}
                onChange={e => setPromptText(e.target.value)}
                placeholder="E.g. A vibrant cartoon magical treehouse in a rainbow jungle..."
                className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none shadow-xs transition-colors"
              />
            </div>

            <button
              onClick={handleRunAIGen}
              disabled={isGenerating || !promptText.trim()}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isGenerating ? 'Generating Asset...' : 'Generate with AI'}</span>
            </button>

            <div className="pt-3 border-t border-slate-200">
              <span className="text-[11px] font-semibold text-slate-500 block mb-2">
                Sample Cartoon Prompts
              </span>
              <div className="space-y-1.5">
                {[
                  'Sunlit cartoon forest with cute mushrooms',
                  'Futuristic cartoon hover-car in neon city',
                  'Traditional Indian festival market with lanterns',
                ].map(sample => (
                  <button
                    key={sample}
                    onClick={() => setPromptText(sample)}
                    className="w-full text-left p-2 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors truncate cursor-pointer"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
