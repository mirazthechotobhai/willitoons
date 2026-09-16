import React, { useState } from 'react';
import { ProjectSettings } from '../types';
import {
  ArrowLeft,
  Edit2,
  AlertCircle,
  History,
  Save,
  Tv,
  Download,
  Settings,
  Zap,
  Check,
  Globe,
  Wand2,
} from 'lucide-react';

interface NavbarProps {
  project: ProjectSettings;
  onUpdateProject: (updates: Partial<ProjectSettings>) => void;
  onSave: () => void;
  onExportClick: () => void;
  lastSavedText?: string;
  onToggleMobileLeftRail?: () => void;
  isMobileLeftRailOpen?: boolean;
  onToggleMobileRightRail?: () => void;
  isMobileRightRailOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  onUpdateProject,
  onSave,
  onExportClick,
  lastSavedText = 'All changes saved',
  onToggleMobileLeftRail,
  isMobileLeftRailOpen = false,
  onToggleMobileRightRail,
  isMobileRightRailOpen = false,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [isSavedBadge, setIsSavedBadge] = useState(false);
  const [showAspectDropdown, setShowAspectDropdown] = useState(false);

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      onUpdateProject({ title: titleInput.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleSaveClick = () => {
    onSave();
    setIsSavedBadge(true);
    setTimeout(() => setIsSavedBadge(false), 2000);
  };

  return (
    <header className="h-12 bg-[#1E293B] border-b border-slate-700 flex items-center justify-between px-4 text-white select-none z-40 shrink-0">
      
      {/* LEFT SECTION (Logo badge, Title, Menu items, ID & Autosaved status) */}
      <div className="flex items-center space-x-4">
        {/* Brand Icon Badge / Mobile Left Rail Toggle */}
        <button
          onClick={onToggleMobileLeftRail}
          title="WilliToons Studio - 2D Animation & Cartoon Video Maker"
          className={`flex items-center space-x-2 p-1 -ml-1 rounded-lg transition-all cursor-pointer active:scale-95 ${
            isMobileLeftRailOpen
              ? 'bg-slate-700 ring-1 ring-amber-400'
              : 'hover:bg-slate-700/60'
          }`}
        >
          <div className="w-6 h-6 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-md flex items-center justify-center font-black text-xs italic text-white shadow-sm ring-1 ring-amber-400/50">
            W
          </div>
          <span className="font-extrabold tracking-tight text-sm text-slate-100 hidden sm:inline-block">
            Willi<span className="text-amber-400">Toons</span> <span className="font-semibold text-slate-300 text-xs">Studio</span>
          </span>
        </button>

        {/* Back Button */}
        <button
          title="Back to Projects"
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Project Title with inline edit (Hidden on mobile version) */}
        <div className="hidden sm:flex items-center space-x-1.5">
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={titleInput}
              onChange={e => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={e => e.key === 'Enter' && handleTitleSubmit()}
              className="px-2 py-0.5 text-xs font-bold bg-slate-800 border border-blue-500 rounded text-white focus:outline-none"
            />
          ) : (
            <div
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center space-x-1.5 px-2 py-1 hover:bg-slate-700/70 rounded cursor-pointer group"
            >
              <span className="text-xs font-semibold text-slate-200 tracking-normal">
                {project.title}
              </span>
              <Edit2 className="w-3 h-3 text-slate-400 group-hover:text-blue-400 transition-colors" />
            </div>
          )}
        </div>

        {/* Quick Menu Navigation (Hidden on mobile version: File, Edit, Rigging, Assets, Help) */}
        <nav className="hidden md:flex space-x-3 text-xs font-medium text-slate-300">
          <span className="hover:text-white cursor-pointer px-1 py-0.5">File</span>
          <span className="text-white cursor-pointer underline decoration-blue-500 underline-offset-4 px-1 py-0.5 font-semibold">Edit</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5">Rigging</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5">Assets</span>
          <span className="hover:text-white cursor-pointer px-1 py-0.5">Help</span>
        </nav>

        {/* ID Badge */}
        <div className="hidden lg:flex items-center px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400">
          ID: {project.id}
        </div>
      </div>

      {/* RIGHT SECTION (Autosaved pill, Save Icon, Mobile Effect Icon, Frame, Export MP4, Settings) */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5">
        {/* Autosaved Pill (Hidden on mobile version) */}
        <div className="hidden md:flex items-center px-3 py-1 bg-slate-700/80 border border-slate-600/60 rounded text-xs text-slate-300 font-medium">
          {isSavedBadge ? '✓ Saved just now' : 'Autosaved 2m ago'}
        </div>

        {/* History Button (Hidden on mobile version) */}
        <button
          title="Version History"
          className="hidden md:flex items-center space-x-1 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
        >
          <History className="w-3.5 h-3.5 text-slate-400" />
          <span>History</span>
        </button>

        {/* Save Button - Icon only (no text, saves header space) */}
        <button
          onClick={handleSaveClick}
          title={isSavedBadge ? 'Saved' : 'Save Project'}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-all cursor-pointer active:scale-95"
        >
          {isSavedBadge ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Save className="w-4 h-4 text-slate-300" />
          )}
        </button>

        {/* Frame / Aspect Ratio Dropdown - Moved to the left */}
        <div className="relative">
          <button
            onClick={() => setShowAspectDropdown(!showAspectDropdown)}
            title={`Aspect Ratio: ${project.aspectRatio}`}
            className="flex items-center p-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded border border-slate-600/70 transition-colors cursor-pointer"
          >
            <Tv className="w-4 h-4 text-slate-400" />
            <span className="hidden md:inline ml-1">{project.aspectRatio}</span>
          </button>

          {showAspectDropdown && (
            <div className="absolute left-0 sm:right-0 top-full mt-1 w-36 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-xs">
              {(['16:9', '9:16', '1:1', '4:3'] as Array<'16:9' | '9:16' | '1:1' | '4:3'>).map(aspect => (
                <button
                  key={aspect}
                  onClick={() => {
                    onUpdateProject({ aspectRatio: aspect });
                    setShowAspectDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-700 cursor-pointer ${
                    project.aspectRatio === aspect ? 'text-blue-400 font-bold' : 'text-slate-200'
                  }`}
                >
                  <span>{aspect}</span>
                  {project.aspectRatio === aspect && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* PRIMARY EXPORT BUTTON - Now in Aspect Ratio's place */}
        <button
          onClick={onExportClick}
          title="Export MP4 Video"
          className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white p-1.5 rounded transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Mobile Effect & Tools Toggle Button - Now in Export MP4's place */}
        <button
          onClick={onToggleMobileRightRail}
          className={`md:hidden p-1.5 rounded cursor-pointer active:scale-95 transition-all ${
            isMobileRightRailOpen
              ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400'
              : 'bg-slate-700/90 hover:bg-slate-700 text-purple-300 border border-purple-500/40'
          }`}
          title="Toggle Effects & Tools Rail"
        >
          <Wand2 className="w-4 h-4 text-purple-400" />
        </button>

        {/* Settings */}
        <button
          title="Project Settings"
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Credits Badge (Desktop) */}
        <div className="hidden sm:flex items-center space-x-1 px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-amber-400">
          <Zap className="w-3 h-3 fill-current" />
          <span>0</span>
        </div>
      </div>

    </header>
  );
};
