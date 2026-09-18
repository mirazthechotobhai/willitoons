import React from 'react';
import {
  FolderArchive,
  Wand2,
  Music,
  Volume2,
  Video,
  Sliders,
  MessageCircle,
} from 'lucide-react';

export type RightNavTab = 'assets' | 'effects' | 'music' | 'sounds' | 'tutorials' | 'inspector' | null;

interface RightSidebarRailProps {
  activeTab: RightNavTab;
  onSelectTab: (tab: RightNavTab) => void;
  hasSelectedElement: boolean;
}

export const RightSidebarRail: React.FC<RightSidebarRailProps> = ({
  activeTab,
  onSelectTab,
  hasSelectedElement,
}) => {
  const items = [
    { id: 'inspector' as const, label: 'Properties', icon: Sliders },
    { id: 'assets' as const, label: 'Asset Library', icon: FolderArchive },
    { id: 'effects' as const, label: 'Effects', icon: Wand2 },
    { id: 'music' as const, label: 'Music', icon: Music },
    { id: 'sounds' as const, label: 'Sounds', icon: Volume2 },
    { id: 'tutorials' as const, label: 'Tutorials', icon: Video },
  ];

  return (
    <div className="w-[68px] bg-white border-l border-slate-200 flex flex-col justify-between items-center py-2 select-none z-30 shrink-0 shadow-xs">
      <div className="flex flex-col space-y-1 w-full px-1">
        {items.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(isActive ? null : item.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 w-full rounded-xl transition-all cursor-pointer group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-xs font-semibold'
                  : item.id === 'inspector' && hasSelectedElement
                    ? 'text-blue-700 bg-blue-50/50 hover:bg-blue-100/70 border border-blue-200/60'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={item.id === 'inspector' ? 'Open Properties (Transforms, Visemes, Animations)' : item.label}
            >
              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : item.id === 'inspector' && hasSelectedElement ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-900'}`} />
              
              <span className={`text-[9px] leading-tight text-center truncate max-w-[62px] ${isActive ? 'font-bold text-blue-600' : item.id === 'inspector' && hasSelectedElement ? 'font-semibold text-blue-700' : 'font-medium text-slate-600'}`}>
                {item.label}
              </span>

              {item.id === 'inspector' && hasSelectedElement && !isActive && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
              )}

              {isActive && (
                <div className="absolute right-0 top-2 bottom-2 w-1 bg-blue-600 rounded-l-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Floating Chat / Help Bubble in bottom right (as seen in Screenshot 1) */}
      <div className="p-1 w-full flex justify-center">
        <button
          title="Support & Feedback"
          className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white shadow-md flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
