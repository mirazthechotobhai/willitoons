import React from 'react';
import { StageElement, CharacterAnimationType, CharacterModel, AudioTrackItem, Scene, ProjectSettings } from '../types';
import {
  Sliders,
  Trash2,
  Copy,
  FlipHorizontal,
  ArrowUp,
  ArrowDown,
  Activity,
  Type,
  MessageSquare,
  Sparkles,
  RotateCw,
  X,
  Volume2,
  VolumeX,
  Play,
  Lock,
  Unlock,
  Music,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Camera,
  Link,
  Unlink,
  FileUp,
  Check,
  Palette,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { playSyntheticAudio, playUploadedAudio } from '../utils/audioEngine';
import { VISEME_CONFIGS, MouthPreviewThumbnail } from '../utils/mouthRenderer';

interface ElementInspectorProps {
  element?: StageElement | null;
  audioTrack?: AudioTrackItem | null;
  scene?: Scene;
  project?: ProjectSettings;
  onUpdateScene?: (updates: Partial<Scene>) => void;
  onSelectElement?: (id: string | null) => void;
  onSelectAudioTrack?: (id: string | null) => void;
  onUpdateElement?: (id: string, updates: Partial<StageElement>) => void;
  onDeleteElement?: (id: string) => void;
  onDuplicateElement?: (id: string, atStartTime?: number) => void;
  onOpenCharacterStudioForEdit?: (model: CharacterModel) => void;
  onUpdateAudioTrack?: (id: string, updates: Partial<AudioTrackItem>) => void;
  onDeleteAudioTrack?: (id: string) => void;
  onClose?: () => void;
}

const ANIMATION_PRESETS: { id: CharacterAnimationType; label: string; icon: string }[] = [
  { id: 'idle', label: 'Idle Stance', icon: '🧍' },
  { id: 'talk', label: 'Talking & Lip Sync', icon: '🗣️' },
  { id: 'walk', label: 'Walking Cycle', icon: '🚶' },
  { id: 'wave', label: 'Wave Hand', icon: '👋' },
  { id: 'celebrate', label: 'Celebrate / Cheer', icon: '🎉' },
  { id: 'jump', label: 'Joyful Jump', icon: '🦘' },
  { id: 'run', label: 'Fast Run', icon: '🏃' },
  { id: 'dance', label: 'Cartoon Dance', icon: '💃' },
];

export const ElementInspector: React.FC<ElementInspectorProps> = ({
  element,
  audioTrack,
  scene,
  project,
  onUpdateScene,
  onSelectElement,
  onSelectAudioTrack,
  onUpdateElement,
  onDeleteElement,
  onDuplicateElement,
  onOpenCharacterStudioForEdit,
  onUpdateAudioTrack,
  onDeleteAudioTrack,
  onClose,
}) => {
  const [keepAspect, setKeepAspect] = React.useState(true);

  // --- SCENE & CANVAS PROPERTIES (Shown when no element or audio track is selected) ---
  if (!element && !audioTrack) {
    return (
      <div className="w-full h-full max-h-[100dvh] bg-white flex flex-col z-20 select-none relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
              Scene & Properties
            </span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Properties"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/30">
          {/* Active Scene Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Current Scene
              </span>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                {scene?.name || 'Active Scene'}
              </span>
            </div>

            {/* Scene Duration */}
            {scene && onUpdateScene && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Scene Duration (seconds)</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onUpdateScene({ duration: Math.max(1, scene.duration - 5) })}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                    title="Decrease duration by 5 seconds"
                  >
                    -5s
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="600"
                    value={scene.duration}
                    onChange={e => onUpdateScene({ duration: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="flex-1 p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-center font-bold"
                  />
                  <button
                    onClick={() => onUpdateScene({ duration: Math.min(600, scene.duration + 5) })}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold cursor-pointer transition-colors"
                    title="Increase duration by 5 seconds"
                  >
                    +5s
                  </button>
                </div>
              </div>
            )}

            {/* Scene Background Color */}
            {scene && onUpdateScene && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                  <Palette className="w-3 h-3 text-slate-400" />
                  <span>Scene Background Color</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={scene.background.type === 'color' ? scene.background.value : '#0f172a'}
                    onChange={e => onUpdateScene({ background: { type: 'color', value: e.target.value } })}
                    className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 shrink-0"
                  />
                  <div className="flex-1 grid grid-cols-5 gap-1.5">
                    {['#ffffff', '#0f172a', '#1e293b', '#38bdf8', '#22c55e'].map(color => (
                      <button
                        key={color}
                        onClick={() => onUpdateScene({ background: { type: 'color', value: color } })}
                        className="h-7 rounded-lg border border-slate-200 hover:scale-105 transition-transform cursor-pointer shadow-2xs"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Scene Elements List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
              <Layers className="w-3 h-3 text-slate-400" />
              <span>Layers in this Scene ({scene?.elements.length || 0})</span>
            </span>

            {(!scene?.elements || scene.elements.length === 0) ? (
              <div className="p-4 bg-white border border-dashed border-slate-200 rounded-xl text-center text-slate-400">
                <p className="text-xs font-medium">No layers added yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">Select Characters or Media from the left sidebar to add them.</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                {scene.elements.map(el => (
                  <button
                    key={el.id}
                    onClick={() => onSelectElement?.(el.id)}
                    className="w-full p-2 bg-white hover:bg-blue-50/70 border border-slate-200 hover:border-blue-300 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate">
                        {el.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        ({el.type})
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Inspect →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Audio Tracks in Scene */}
          {scene?.audioTracks && scene.audioTracks.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1">
                <Music className="w-3 h-3 text-green-500" />
                <span>Audio Tracks ({scene.audioTracks.length})</span>
              </span>
              <div className="space-y-1.5">
                {scene.audioTracks.map(at => (
                  <button
                    key={at.id}
                    onClick={() => onSelectAudioTrack?.(at.id)}
                    className="w-full p-2 bg-white hover:bg-green-50/70 border border-slate-200 hover:border-green-300 rounded-xl flex items-center justify-between transition-all text-left cursor-pointer group shadow-2xs"
                  >
                    <div className="flex items-center space-x-2 truncate min-w-0">
                      <Music className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      <span className="text-xs font-semibold text-slate-800 group-hover:text-green-600 truncate">
                        {at.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-medium text-green-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      Inspect →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* User Guide Card */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3 text-slate-600 space-y-1 shadow-2xs">
            <p className="font-semibold text-blue-800 text-[11px] flex items-center space-x-1">
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Layer Properties</span>
            </p>
            <p className="text-[11px] leading-relaxed text-slate-600">
              Select any character, background, prop, or audio track on the canvas or timeline, then open Properties to customize its transforms, animations, visemes, and audio settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --- AUDIO TRACK INSPECTOR ---
  if (audioTrack && !element) {
    const handlePlayPreview = () => {
      if (audioTrack.url.startsWith('audio:')) {
        playSyntheticAudio(audioTrack.url, audioTrack.volume, false);
      } else {
        playUploadedAudio(audioTrack.url, audioTrack.volume, false);
      }
    };

    return (
      <div className="w-full h-full max-h-[100dvh] bg-white flex flex-col z-20 select-none relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center space-x-2">
            <Music className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
              Audio Properties
            </span>
          </div>

          <div className="flex items-center space-x-1">
            {onDeleteAudioTrack && (
              <button
                onClick={() => onDeleteAudioTrack(audioTrack.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Delete Audio Track"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close Properties"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Body Controls */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/30">
          {/* Audio Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Audio Clip Name
            </label>
            <input
              type="text"
              value={audioTrack.name}
              onChange={e => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { name: e.target.value })}
              className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-medium focus:outline-none focus:border-green-500 shadow-xs text-xs"
            />
          </div>

          {/* Audio Preview Button */}
          <div className="pt-1">
            <button
              onClick={handlePlayPreview}
              className="w-full py-2 px-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg flex items-center justify-center space-x-2 cursor-pointer shadow-xs transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Preview Sound</span>
            </button>
          </div>

          {/* Volume Slider */}
          <div className="space-y-1.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between text-[11px] text-slate-600">
              <span className="font-semibold flex items-center space-x-1.5">
                {audioTrack.isMuted ? <VolumeX className="w-3.5 h-3.5 text-red-500" /> : <Volume2 className="w-3.5 h-3.5 text-green-600" />}
                <span>Volume</span>
              </span>
              <span className="font-mono text-slate-800 font-bold">
                {audioTrack.isMuted ? 'Muted' : `${Math.round((audioTrack.volume ?? 0.8) * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={audioTrack.isMuted ? 0 : (audioTrack.volume ?? 0.8)}
              disabled={audioTrack.isMuted}
              onChange={e => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { volume: parseFloat(e.target.value) })}
              className="w-full accent-green-600 cursor-pointer disabled:opacity-40"
            />
          </div>

          {/* Timing: Start Time & Duration */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Timeline Alignment
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Start (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={Math.round(audioTrack.startTime * 10) / 10}
                  onChange={e => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { startTime: Math.max(0, parseFloat(e.target.value) || 0) })}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-green-500 shadow-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-1">Duration (seconds)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.5"
                  value={Math.round(audioTrack.duration * 10) / 10}
                  onChange={e => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { duration: Math.max(0.5, parseFloat(e.target.value) || 1) })}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-green-500 shadow-xs"
                />
              </div>
            </div>
          </div>

          {/* Quick Toggles: Mute and Lock */}
          <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { isMuted: !audioTrack.isMuted })}
              className={`p-2 rounded-lg flex items-center justify-center space-x-1.5 font-medium border transition-colors cursor-pointer ${
                audioTrack.isMuted
                  ? 'bg-red-50 text-red-600 border-red-200 font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {audioTrack.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{audioTrack.isMuted ? 'Muted' : 'Mute Track'}</span>
            </button>

            <button
              onClick={() => onUpdateAudioTrack && onUpdateAudioTrack(audioTrack.id, { locked: !audioTrack.locked })}
              className={`p-2 rounded-lg flex items-center justify-center space-x-1.5 font-medium border transition-colors cursor-pointer ${
                audioTrack.locked
                  ? 'bg-amber-50 text-amber-600 border-amber-200 font-semibold'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {audioTrack.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{audioTrack.locked ? 'Locked' : 'Unlocked'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!element) return null;

  return (
    <div className="w-full h-full max-h-[100dvh] bg-white flex flex-col z-20 select-none relative overflow-hidden">
      
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center space-x-2">
          {element.type === 'camera' ? (
            <Camera className="w-4 h-4 text-red-600" />
          ) : element.type === 'image' ? (
            <ImageIcon className="w-4 h-4 text-blue-600" />
          ) : (
            <Sliders className="w-4 h-4 text-blue-600" />
          )}
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider truncate">
            {element.type === 'camera' ? 'Camera Layer' : element.type === 'image' ? 'Image Properties' : `${element.type} Properties`}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {onDuplicateElement && (
            <button
              onClick={() => onDuplicateElement(element.id)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Duplicate"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
          {onDeleteElement && (
            <button
              onClick={() => onDeleteElement(element.id)}
              className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close Properties"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body Controls */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs bg-slate-50/30">
        
        {/* CAMERA SPECIFIC CONTROLS & TIMING (Default 5s, fully customizable) */}
        {element.type === 'camera' && (
          <div className="p-3 bg-gradient-to-br from-rose-50 via-red-50 to-orange-50/50 border border-red-200/80 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <Camera className="w-4 h-4 text-red-600" />
                <span className="font-bold text-slate-800 text-xs">Camera Layer Duration</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100/90 text-red-700 border border-red-200/60">
                16:9 Viewport
              </span>
            </div>

            {/* Duration Input & Quick Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-600 font-medium">Clip Duration:</span>
                <span className="font-mono text-xs font-bold text-red-600 bg-white px-2 py-0.5 rounded border border-red-200 shadow-2xs">
                  {Math.round(element.duration * 10) / 10}s
                </span>
              </div>

              {/* Quick Preset Buttons (Default 5s) */}
              <div className="grid grid-cols-4 gap-1">
                {[2, 3, 5, 10].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => {
                      if (onUpdateElement) {
                        onUpdateElement(element.id, { duration: sec });
                      }
                    }}
                    className={`py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                      Math.abs(element.duration - sec) < 0.05
                        ? 'bg-red-600 text-white border-red-600 shadow-xs'
                        : 'bg-white hover:bg-red-50 border-slate-200 text-slate-700'
                    }`}
                    title={`Set camera layer duration to ${sec} seconds`}
                  >
                    {sec}s{sec === 5 ? ' (Default)' : ''}
                  </button>
                ))}
              </div>

              {/* Slider for smooth resizing duration */}
              <div className="pt-1">
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={element.duration}
                  onChange={e => {
                    if (onUpdateElement) {
                      onUpdateElement(element.id, { duration: parseFloat(e.target.value) });
                    }
                  }}
                  className="w-full accent-red-600 cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5 font-mono">
                  <span>0.5s</span>
                  <span className="font-semibold text-red-500">5s (Default)</span>
                  <span>30s</span>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-tight border-t border-red-100 pt-2">
              💡 <strong>ক্যামেরা ডিউরেশন:</strong> টাইমলাইনে ড্র্যাগ করে অথবা উপরোক্ত স্লাইডার ও প্রিসেট দিয়ে ইচ্ছামতো সময় ছোট-বড় করতে পারবেন।
            </p>
          </div>
        )}

        {/* IMAGE SPECIFIC CONTROLS & FIT TO SCREEN (One-click adjust without touching or manual zoom) */}
        {element.type === 'image' && (
          <div className="p-3 bg-gradient-to-br from-blue-50 via-sky-50 to-indigo-50/60 border border-blue-200/80 rounded-xl space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-xs">Image Screen Fit</span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100/90 text-blue-700 border border-blue-200/60">
                {element.isBackground ? 'Full Background' : 'Floating Prop'}
              </span>
            </div>

            {/* Primary One-Click "Fit to Screen" Button */}
            <button
              type="button"
              onClick={() => {
                if (onUpdateElement) {
                  onUpdateElement(element.id, {
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    rotation: 0,
                    isBackground: true,
                    fitMode: 'cover',
                  });
                }
              }}
              className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold rounded-lg shadow-sm flex items-center justify-center space-x-2 cursor-pointer transition-all hover:shadow-md transform active:scale-[0.99]"
              title="Click to automatically fit image to entire screen without manual zooming or touching"
            >
              <Maximize2 className="w-4 h-4" />
              <span className="text-xs">Fit to Screen (স্ক্রিন ফিট করুন)</span>
            </button>

            <p className="text-[10px] text-slate-500 leading-tight">
              One-click auto fit: Centers and scales image across 100% canvas without touching or manual zooming.
            </p>

            {/* Quick Fit Mode Dual Buttons */}
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (onUpdateElement) {
                    onUpdateElement(element.id, {
                      x: 50,
                      y: 50,
                      width: 100,
                      height: 100,
                      rotation: 0,
                      isBackground: true,
                      fitMode: 'cover',
                    });
                  }
                }}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  (element.fitMode === 'cover' || (element.isBackground && element.fitMode !== 'contain')) && element.width >= 98 && element.height >= 98
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Fill 100% of canvas with no border or empty margins"
              >
                <span>Full Cover</span>
                <span className="text-[9px] opacity-75">No borders / Fill</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (onUpdateElement) {
                    onUpdateElement(element.id, {
                      x: 50,
                      y: 50,
                      width: 100,
                      height: 100,
                      rotation: 0,
                      isBackground: false,
                      fitMode: 'contain',
                    });
                  }
                }}
                className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold flex flex-col items-center justify-center transition-all cursor-pointer ${
                  element.fitMode === 'contain' && element.width >= 98 && element.height >= 98
                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title="Fit full image inside canvas keeping original aspect ratio"
              >
                <span>Full Contain</span>
                <span className="text-[9px] opacity-75">Full image / No crop</span>
              </button>
            </div>

            {/* Fitting Aspect Ratio Style Selector */}
            <div className="space-y-1 pt-1.5 border-t border-blue-200/60">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Aspect Ratio Fit Style
              </label>
              <div className="grid grid-cols-3 gap-1 p-1 bg-white/90 rounded-lg border border-blue-200/60">
                <button
                  type="button"
                  onClick={() => onUpdateElement && onUpdateElement(element.id, { fitMode: 'cover', isBackground: true })}
                  className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${
                    element.fitMode === 'cover' || (element.isBackground && element.fitMode !== 'contain' && element.fitMode !== 'fill')
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Cover entire area without black borders"
                >
                  Cover
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement && onUpdateElement(element.id, { fitMode: 'contain', isBackground: false })}
                  className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${
                    element.fitMode === 'contain'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Preserve entire image without cropping"
                >
                  Contain
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateElement && onUpdateElement(element.id, { fitMode: 'fill' })}
                  className={`py-1 px-1 rounded text-[10px] font-bold text-center cursor-pointer transition-colors ${
                    element.fitMode === 'fill'
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                  title="Stretch directly to width and height"
                >
                  Stretch
                </button>
              </div>
            </div>

            {/* Quick Reset to Small Sticker/Prop */}
            <div className="flex items-center justify-between pt-1 border-t border-blue-200/40">
              <span className="text-[11px] text-slate-500">Need small prop/sticker?</span>
              <button
                type="button"
                onClick={() => {
                  if (onUpdateElement) {
                    onUpdateElement(element.id, {
                      x: 50,
                      y: 50,
                      width: 28,
                      height: 28,
                      rotation: 0,
                      isBackground: false,
                      fitMode: 'contain',
                    });
                  }
                }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline cursor-pointer"
              >
                Reset to Prop (28%)
              </button>
            </div>
          </div>
        )}

        {/* CHARACTER SPECIFIC CONTROLS */}
        {element.type === 'character' && element.characterData && (
          <div className="space-y-3 pb-3 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">{element.characterData.name}</span>
              <button
                onClick={() => onOpenCharacterStudioForEdit(element.characterData!)}
                className="flex items-center space-x-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-semibold cursor-pointer shadow-xs"
              >
                <Activity className="w-3 h-3" />
                <span>IK Rig / Edit</span>
              </button>
            </div>

            {/* Animation Selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Active Animation Pose
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ANIMATION_PRESETS.map(anim => {
                  const isActive = (element.animation || 'idle') === anim.id;
                  return (
                    <button
                      key={anim.id}
                      onClick={() => onUpdateElement(element.id, { animation: anim.id })}
                      className={`p-2 rounded-lg text-left flex items-center space-x-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white font-bold shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span>{anim.icon}</span>
                      <span className="truncate text-[11px]">{anim.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Character Angle (3/4 Front, Front, 3/4 Back) */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Character Angle
                </label>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/60">
                  {element.characterData.angle === 'front' ? 'Front' : element.characterData.angle === 'threeQuarterBack' ? '3/4 Back' : '3/4 Front'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      angle: 'threeQuarterFront',
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className={`py-1.5 px-1 rounded-md font-bold text-[10px] text-center transition-all cursor-pointer ${
                    (element.characterData.angle || 'threeQuarterFront') === 'threeQuarterFront'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="3/4 Front Angle"
                >
                  3/4 Front
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      angle: 'front',
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className={`py-1.5 px-1 rounded-md font-bold text-[10px] text-center transition-all cursor-pointer ${
                    element.characterData.angle === 'front'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="Front Angle"
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      angle: 'threeQuarterBack',
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className={`py-1.5 px-1 rounded-md font-bold text-[10px] text-center transition-all cursor-pointer ${
                    element.characterData.angle === 'threeQuarterBack'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                  title="3/4 Back Angle"
                >
                  3/4 Back
                </button>
              </div>
            </div>

            {/* Flip Horizontal */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-500 font-medium">Direction Facing</span>
              <button
                onClick={() => onUpdateElement(element.id, { scaleX: (element.scaleX || 1) === 1 ? -1 : 1 })}
                className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-pointer shadow-xs transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>{element.scaleX === -1 ? 'Flipped (Left)' : 'Normal (Right)'}</span>
              </button>
            </div>

            {/* LIPS & MOUTH CONTROLS (Format 1 vs Format 2) */}
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
                  <span>👄</span>
                  <span>Lips / Mouth Format</span>
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  {element.characterData.appearance.lipsFormat === 'format2' ? 'Format 2 (Realistic)' : 'Format 1 (Classic)'}
                </span>
              </div>

              {/* Toggle Buttons */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      appearance: {
                        ...element.characterData!.appearance,
                        lipsFormat: 'format1',
                      },
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className={`py-1 px-2 rounded-md font-semibold text-[11px] text-center transition-all cursor-pointer ${
                    element.characterData.appearance.lipsFormat !== 'format2'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Format 1: Classic
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      appearance: {
                        ...element.characterData!.appearance,
                        lipsFormat: 'format2',
                        lipColor: element.characterData!.appearance.lipColor || '#8D5538',
                      },
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className={`py-1 px-2 rounded-md font-semibold text-[11px] text-center transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    element.characterData.appearance.lipsFormat === 'format2'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Format 2: Realistic</span>
                </button>
              </div>

              {/* Viseme Quick Strip if Format 2 */}
              {element.characterData.appearance.lipsFormat === 'format2' ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>Viseme Expression:</span>
                    <button
                      type="button"
                      onClick={() => onOpenCharacterStudioForEdit(element.characterData!)}
                      className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      Studio / Upload PNG ↗
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-1">
                    {VISEME_CONFIGS.slice(0, 4).map(v => {
                      const isCurrent =
                        element.characterData!.appearance.mouthType === `mouth${v.id}` ||
                        (v.id === 'X' && (element.characterData!.appearance.mouthType === 'idle' || element.characterData!.appearance.mouthType === 'mouthX')) ||
                        (v.id === 'A' && element.characterData!.appearance.mouthType === 'smile') ||
                        (v.id === 'B' && element.characterData!.appearance.mouthType === 'talkA');
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            const updatedChar: CharacterModel = {
                              ...element.characterData!,
                              appearance: {
                                ...element.characterData!.appearance,
                                mouthType: `mouth${v.id}`,
                              },
                            };
                            onUpdateElement(element.id, { characterData: updatedChar });
                          }}
                          className={`p-1 rounded border flex flex-col items-center justify-center cursor-pointer transition-colors ${
                            isCurrent
                              ? 'bg-blue-50 border-blue-500 text-blue-900 font-bold'
                              : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <MouthPreviewThumbnail
                            viseme={v.id}
                            format="format2"
                            lipColor={element.characterData!.appearance.lipColor || '#8D5538'}
                            customImage={element.characterData!.appearance.customMouthImages?.[v.id]}
                            className="w-7 h-4"
                          />
                          <span className="text-[9px] mt-0.5">{v.id}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1 pt-1">
                  {['idle', 'smile', 'talkA', 'angry'].map(mouth => (
                    <button
                      key={mouth}
                      type="button"
                      onClick={() => {
                        const updatedChar: CharacterModel = {
                          ...element.characterData!,
                          appearance: {
                            ...element.characterData!.appearance,
                            mouthType: mouth,
                          },
                        };
                        onUpdateElement(element.id, { characterData: updatedChar });
                      }}
                      className={`py-1 capitalize rounded text-[10px] border shadow-xs transition-colors cursor-pointer ${
                        element.characterData!.appearance.mouthType === mouth
                          ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                          : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      {mouth}
                    </button>
                  ))}
                </div>
              )}

              {/* Mouth / Lip Scale Slider (Locked anchor at 50, 22.5) */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mb-1">
                  <span>Mouth Size / Scale</span>
                  <span className="font-mono text-slate-700 font-semibold">
                    {Math.round((element.characterData.appearance.mouthScale || 1) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.3"
                  max="3.0"
                  step="0.05"
                  value={element.characterData.appearance.mouthScale || 1}
                  onChange={e => {
                    const newScale = parseFloat(e.target.value);
                    const updatedChar: CharacterModel = {
                      ...element.characterData!,
                      appearance: {
                        ...element.characterData!.appearance,
                        mouthScale: newScale,
                      },
                    };
                    onUpdateElement(element.id, { characterData: updatedChar });
                  }}
                  className="w-full accent-blue-600 cursor-pointer h-1.5"
                />
                <div className="flex justify-between text-[9px] text-slate-400 mt-0.5">
                  <span>30%</span>
                  <span>100% (Default)</span>
                  <span>300%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SPEECH BUBBLE & TEXT CONTROLS */}
        {(element.type === 'speechBubble' || element.type === 'text') && (
          <div className="space-y-3 pb-3 border-b border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {element.type === 'speechBubble' ? 'Dialogue Text' : 'Text Content'}
              </label>
              <textarea
                rows={2}
                value={element.text || ''}
                onChange={e => onUpdateElement(element.id, { text: e.target.value })}
                className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:border-blue-500 resize-none shadow-xs transition-colors"
              />
            </div>

            {element.type === 'speechBubble' && (
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Bubble Color
                </label>
                <div className="flex space-x-2">
                  {['#ffffff', '#fef08a', '#bbf7d0', '#fed7aa', '#e2e8f0'].map(color => (
                    <button
                      key={color}
                      onClick={() => onUpdateElement(element.id, { bubbleColor: color })}
                      className={`w-6 h-6 rounded-full border-2 cursor-pointer transition-transform ${
                        element.bubbleColor === color ? 'border-blue-600 scale-110 shadow-xs' : 'border-slate-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between text-slate-500 text-[11px] mb-1">
                <span>Font Size</span>
                <span className="font-semibold text-slate-700">{element.fontSize || 16}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={element.fontSize || 16}
                onChange={e => onUpdateElement(element.id, { fontSize: parseInt(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* ELEMENT SIZE, ZOOM & SCALE (UNLIMITED BORO / CHOTO) */}
        <div className="p-3 bg-blue-50/60 border border-blue-200/70 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <ZoomIn className="w-3.5 h-3.5 text-blue-600" />
              <span>Zoom & Scale (Size)</span>
            </span>
            <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 shadow-2xs">
              {Math.round(element.width)}% × {Math.round(element.height)}%
            </span>
          </div>

          {/* Direct Zoom In & Out Quick Buttons */}
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                const factor = 0.8;
                onUpdateElement(element.id, {
                  width: Math.max(2, Math.round(element.width * factor)),
                  height: Math.max(2, Math.round(element.height * factor)),
                });
              }}
              className="py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-bold shadow-2xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              title="Make Smaller (-20%)"
            >
              <ZoomOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Smaller (-)</span>
            </button>

            <button
              onClick={() => {
                const factor = 1.25;
                onUpdateElement(element.id, {
                  width: Math.max(2, Math.round(element.width * factor)),
                  height: Math.max(2, Math.round(element.height * factor)),
                });
              }}
              className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-2xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              title="Make Bigger (+25% Unlimited)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Bigger (+)</span>
            </button>
          </div>

          {/* Quick Fit to Screen Button */}
          <button
            type="button"
            onClick={() => {
              onUpdateElement(element.id, {
                x: 50,
                y: 50,
                width: 100,
                height: 100,
                rotation: 0,
                ...(element.type === 'image' ? { isBackground: true, fitMode: 'cover' } : {}),
              });
            }}
            className="w-full py-1.5 px-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold shadow-2xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            title="Fit to Screen (100% Canvas)"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Fit to Screen (100% Canvas)</span>
          </button>

          {/* Quick Presets: 15% Tiny, 30% Small, 50% Medium, 100% Large, 200% Giant, 400%, 800%, 1500% */}
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Quick Size Presets (Unlimited)
            </span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: '15%', w: 15 },
                { label: '30%', w: 30 },
                { label: '50%', w: 50 },
                { label: '100%', w: 90 },
                { label: '200%', w: 180 },
                { label: '400%', w: 360 },
                { label: '800%', w: 720 },
                { label: '1500%', w: 1350 },
              ].map(preset => (
                <button
                  key={preset.label}
                  onClick={() => {
                    const baseRatio = (element.height || 1) / (element.width || 1);
                    const newH = Math.round(preset.w * baseRatio);
                    onUpdateElement(element.id, { width: preset.w, height: newH });
                  }}
                  className="py-1 bg-white hover:bg-blue-100 text-slate-700 hover:text-blue-700 border border-slate-200 rounded text-[10px] font-bold text-center transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Smooth Scale Slider (from 1% to 1500%+) */}
          <div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium mb-1">
              <span>Smooth Scale Slider</span>
              <span className="font-mono text-slate-700 font-semibold">{Math.round(element.width)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="1500"
              step="1"
              value={element.width}
              onChange={e => {
                const newW = parseInt(e.target.value) || 2;
                const ratio = (element.height || 1) / (element.width || 1);
                onUpdateElement(element.id, {
                  width: newW,
                  height: keepAspect ? Math.max(2, Math.round(newW * ratio)) : element.height,
                });
              }}
              className="w-full accent-blue-600 cursor-pointer h-1.5"
            />
          </div>
        </div>

        {/* TRANSFORM CONTROLS (Position, Dimensions, Rotation, Opacity) */}
        <div className="space-y-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Position & Coordinates
          </span>

          {/* Position X & Y */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 font-medium block">Position X (%)</label>
              <input
                type="number"
                value={element.x}
                onChange={e => onUpdateElement(element.id, { x: parseInt(e.target.value) || 0 })}
                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-medium block">Position Y (%)</label>
              <input
                type="number"
                value={element.y}
                onChange={e => onUpdateElement(element.id, { y: parseInt(e.target.value) || 0 })}
                className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-blue-500 shadow-xs"
              />
            </div>
          </div>

          {/* Width & Height with Aspect Ratio lock */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 font-medium">Dimensions (%)</label>
              <button
                type="button"
                onClick={() => setKeepAspect(!keepAspect)}
                className={`text-[10px] flex items-center space-x-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                  keepAspect ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-500'
                }`}
                title={keepAspect ? 'Aspect Ratio Locked' : 'Aspect Ratio Free'}
              >
                {keepAspect ? <Link className="w-2.5 h-2.5" /> : <Unlink className="w-2.5 h-2.5" />}
                <span>{keepAspect ? 'Locked Ratio' : 'Freeform'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Width (%)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={element.width}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 2;
                    const ratio = (element.height || 1) / (element.width || 1);
                    onUpdateElement(element.id, {
                      width: val,
                      ...(keepAspect ? { height: Math.max(2, Math.round(val * ratio)) } : {}),
                    });
                  }}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Height (%)</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={element.height}
                  onChange={e => {
                    const val = parseInt(e.target.value) || 2;
                    const ratio = (element.width || 1) / (element.height || 1);
                    onUpdateElement(element.id, {
                      height: val,
                      ...(keepAspect ? { width: Math.max(2, Math.round(val * ratio)) } : {}),
                    });
                  }}
                  className="w-full p-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 font-mono text-center focus:outline-none focus:border-blue-500 shadow-2xs"
                />
              </div>
            </div>
          </div>

          {/* Rotation */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Rotation</span>
              <span className="font-mono text-slate-700 font-semibold">{element.rotation || 0}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              value={element.rotation || 0}
              onChange={e => onUpdateElement(element.id, { rotation: parseInt(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Opacity */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span>Opacity</span>
              <span className="font-mono text-slate-700 font-semibold">{Math.round((element.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={element.opacity ?? 1}
              onChange={e => onUpdateElement(element.id, { opacity: parseFloat(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          {/* Flip Horizontal */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 font-medium">Flip Orientation</span>
            <button
              onClick={() => onUpdateElement(element.id, { scaleX: (element.scaleX || 1) === 1 ? -1 : 1 })}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg cursor-pointer shadow-xs transition-colors border ${
                element.scaleX === -1
                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-semibold'
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-blue-600" />
              <span>{element.scaleX === -1 ? 'Flipped Horizontal' : 'Normal'}</span>
            </button>
          </div>
        </div>

        {/* Z-Index / Layer Ordering */}
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <span className="text-slate-500 font-medium">Layer Arrangement</span>
          <div className="flex space-x-1">
            <button
              onClick={() => {
                if (scene && onUpdateScene) {
                  const targetTrack = element.trackIndex ?? 0;
                  const uniqueTrackIndices = [...new Set<number>(scene.elements.map(e => e.trackIndex ?? 0))].sort((a, b) => a - b);
                  const currTrackPos = uniqueTrackIndices.indexOf(targetTrack);
                  if (currTrackPos > 0) {
                    const swapTrack = uniqueTrackIndices[currTrackPos - 1];
                    const updated = scene.elements.map(el => {
                      const t = el.trackIndex ?? 0;
                      if (t === targetTrack) {
                        return {
                          ...el,
                          trackIndex: swapTrack,
                          zIndex: Math.max(10, (uniqueTrackIndices.length - (currTrackPos - 1)) * 10),
                        };
                      }
                      if (t === swapTrack) {
                        return {
                          ...el,
                          trackIndex: targetTrack,
                          zIndex: Math.max(10, (uniqueTrackIndices.length - currTrackPos) * 10),
                        };
                      }
                      return el;
                    });
                    onUpdateScene({ elements: updated });
                    return;
                  }
                }
                onUpdateElement(element.id, { zIndex: element.zIndex + 1 });
              }}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-pointer shadow-xs transition-colors"
              title="Bring Forward (Move Layer Up)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (scene && onUpdateScene) {
                  const targetTrack = element.trackIndex ?? 0;
                  const uniqueTrackIndices = [...new Set<number>(scene.elements.map(e => e.trackIndex ?? 0))].sort((a, b) => a - b);
                  const currTrackPos = uniqueTrackIndices.indexOf(targetTrack);
                  if (currTrackPos >= 0 && currTrackPos < uniqueTrackIndices.length - 1) {
                    const swapTrack = uniqueTrackIndices[currTrackPos + 1];
                    const updated = scene.elements.map(el => {
                      const t = el.trackIndex ?? 0;
                      if (t === targetTrack) {
                        return {
                          ...el,
                          trackIndex: swapTrack,
                          zIndex: Math.max(10, (uniqueTrackIndices.length - (currTrackPos + 1)) * 10),
                        };
                      }
                      if (t === swapTrack) {
                        return {
                          ...el,
                          trackIndex: targetTrack,
                          zIndex: Math.max(10, (uniqueTrackIndices.length - currTrackPos) * 10),
                        };
                      }
                      return el;
                    });
                    onUpdateScene({ elements: updated });
                    return;
                  }
                }
                onUpdateElement(element.id, { zIndex: Math.max(1, element.zIndex - 1) });
              }}
              className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg cursor-pointer shadow-xs transition-colors"
              title="Send Backward (Move Layer Down)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
