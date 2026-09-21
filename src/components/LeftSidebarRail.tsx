import React from 'react';
import {
  User,
  Folder,
  FolderArchive,
  LayoutTemplate,
  Sparkles,
  Video,
  Mic,
  Image as ImageIcon,
  Bot,
  Activity,
  Type,
} from 'lucide-react';

export type LeftNavTab =
  | 'character'
  | 'media'
  | 'assetLibrary'
  | 'templates'
  | 'imageGen'
  | 'videoGen'
  | 'aiVoice'
  | 'aiThumbnail'
  | 'aiCharacter'
  | 'animIK'
  | 'text'
  | null;

interface LeftSidebarRailProps {
  activeTab: LeftNavTab;
  onSelectTab: (tab: LeftNavTab) => void;
  onOpenAnimIKStudio: () => void;
}

export const LeftSidebarRail: React.FC<LeftSidebarRailProps> = ({
  activeTab,
  onSelectTab,
  onOpenAnimIKStudio,
}) => {
  const navItems = [
    { id: 'character' as const, label: 'Character', icon: User, hasAI: false },
    { id: 'media' as const, label: 'Media', icon: Folder, hasAI: false },
    { id: 'assetLibrary' as const, label: 'Asset Library', icon: FolderArchive, hasAI: false },
    { id: 'templates' as const, label: 'Templates', icon: LayoutTemplate, hasAI: false },
    { id: 'imageGen' as const, label: 'Image Gen', icon: Sparkles, hasAI: true },
    { id: 'videoGen' as const, label: 'Video Gen', icon: Video, hasAI: true },
    { id: 'aiVoice' as const, label: 'AI Voice', icon: Mic, hasAI: true },
    { id: 'aiThumbnail' as const, label: 'AI Thumbnail', icon: ImageIcon, hasAI: true },
    { id: 'aiCharacter' as const, label: 'AI Character', icon: Bot, hasAI: true },
    { id: 'animIK' as const, label: 'Anim IK', icon: Activity, hasAI: false, isSpecial: true },
    { id: 'text' as const, label: 'Text', icon: Type, hasAI: false },
  ];

  return (
    <div className="w-[68px] bg-white border-r border-slate-200 flex flex-col items-center py-2 select-none z-30 shrink-0 shadow-xs">
      <div className="flex flex-col space-y-1 w-full px-1">
        {navItems.map(item => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'animIK') {
                  onOpenAnimIKStudio();
                } else {
                  onSelectTab(isActive ? null : item.id);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-2 px-1 w-full rounded-xl transition-all cursor-pointer group ${
                isActive
                  ? 'bg-blue-50 text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={item.label}
            >
              {/* AI Badge Pill */}
              {item.hasAI && (
                <span className="absolute top-1 right-2 px-1 py-0.2 text-[8px] font-bold bg-blue-600 text-white rounded leading-tight shadow-xs">
                  AI
                </span>
              )}

              <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-blue-600' : 'text-slate-500 group-hover:text-slate-900'}`} />
              
              <span className={`text-[9px] leading-tight text-center px-0.5 ${isActive ? 'font-bold text-blue-600' : 'font-medium text-slate-600'}`}>
                {item.label}
              </span>

              {/* Active Indicator Bar */}
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-600 rounded-r-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
