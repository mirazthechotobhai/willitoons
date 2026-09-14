import React, { useState, useRef } from 'react';
import { MediaAsset } from '../types';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from '../utils/mediaStock';
import { playSyntheticAudio, playUploadedAudio } from '../utils/audioEngine';
import {
  Upload,
  Sparkles,
  Trash2,
  Play,
  Square,
  Music,
  Image as ImageIcon,
  Film,
  Mic,
  X,
  Volume2,
} from 'lucide-react';

interface MediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userAssets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onSelectAssetForStage: (asset: MediaAsset) => void;
  onDragStartMedia: (e: React.DragEvent, asset: MediaAsset) => void;
  onOpenAIVoiceModal?: () => void;
}

export const MediaDrawer: React.FC<MediaDrawerProps> = ({
  isOpen,
  onClose,
  userAssets,
  onAddAsset,
  onDeleteAsset,
  onSelectAssetForStage,
  onDragStartMedia,
  onOpenAIVoiceModal,
}) => {
  const [activeTab, setActiveTab] = useState<'asset' | 'audio'>('asset');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioStopperRef = useRef<{ stop: () => void } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Combine stock backgrounds with user uploaded images/videos
  const allVisualAssets = [
    ...userAssets.filter(a => a.type === 'image' || a.type === 'video'),
    ...STOCK_BACKGROUNDS,
  ];

  // Combine stock audios with user uploaded audios
  const allAudioAssets = [
    ...userAssets.filter(a => a.type === 'audio'),
    ...STOCK_AUDIO,
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, forceType?: 'image' | 'video' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const url = URL.createObjectURL(file);
      let inferredType: 'image' | 'video' | 'audio' = 'image';

      if (file.type.startsWith('video/')) inferredType = 'video';
      else if (file.type.startsWith('audio/')) inferredType = 'audio';
      else if (file.type.startsWith('image/')) inferredType = 'image';
      else if (forceType) inferredType = forceType;

      const newAsset: MediaAsset = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: file.name.replace(/\.[^/.]+$/, ''),
        type: inferredType,
        url,
        thumbnail: inferredType === 'video' ? '🎬' : inferredType === 'audio' ? '🎵' : '🖼️',
      };

      onAddAsset(newAsset);
    }
    e.target.value = '';
  };

  const togglePlayAudio = (asset: MediaAsset) => {
    if (playingAudioId === asset.id) {
      if (activeAudioStopperRef.current) {
        activeAudioStopperRef.current.stop();
        activeAudioStopperRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    // Stop existing
    if (activeAudioStopperRef.current) {
      activeAudioStopperRef.current.stop();
      activeAudioStopperRef.current = null;
    }

    if (asset.url.startsWith('audio:')) {
      const controller = playSyntheticAudio(asset.url, 0.8, false);
      activeAudioStopperRef.current = controller;
      setPlayingAudioId(asset.id);
      setTimeout(() => {
        setPlayingAudioId(null);
      }, (asset.duration || 3) * 1000);
    } else {
      const controller = playUploadedAudio(asset.url, 0.8, false);
      activeAudioStopperRef.current = controller;
      setPlayingAudioId(asset.id);
      controller.audioElement.onended = () => setPlayingAudioId(null);
    }
  };

  const handleGenerateAIScene = () => {
    // Generate a new dynamic cartoon scene variant
    const timeOfDay = ['Morning', 'Golden Sunset', 'Starry Night', 'Rainy Forest'][Math.floor(Math.random() * 4)];
    const newScene: MediaAsset = {
      id: `ai-bg-${Date.now()}`,
      name: `AI Cartoon ${timeOfDay} Scene`,
      type: 'image',
      category: 'AI Generated',
      url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
          <defs>
            <linearGradient id="aiSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0284c7"/>
              <stop offset="50%" stop-color="#38bdf8"/>
              <stop offset="100%" stop-color="#fef08a"/>
            </linearGradient>
          </defs>
          <rect width="1280" height="720" fill="url(#aiSky)"/>
          <circle cx="850" cy="180" r="70" fill="#ffffff" opacity="0.9"/>
          <!-- Rolling Mountains -->
          <polygon points="0,520 280,340 560,540 880,310 1140,490 1280,380 1280,720 0,720" fill="#16a34a"/>
          <polygon points="0,560 380,430 720,580 1060,420 1280,520 1280,720 0,720" fill="#4ade80"/>
          <!-- Winding Lake -->
          <ellipse cx="640" cy="620" rx="420" ry="80" fill="#0284c7"/>
        </svg>
      `),
      thumbnail: '✨',
    };
    onAddAsset(newScene);
  };

  return (
    <div className="w-80 h-full bg-white border-r border-slate-200 flex flex-col z-20 shadow-md select-none">
      
      {/* Hidden File Inputs for all media types */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={e => handleFileUpload(e)}
        multiple
        accept="image/*,video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={audioInputRef}
        onChange={e => handleFileUpload(e, 'audio')}
        multiple
        accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
        className="hidden"
      />

      {/* Header & Tabs (Theme Segmented Button Pattern) */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 bg-white">
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('asset')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs transition-colors cursor-pointer rounded-md ${
              activeTab === 'asset'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Asset</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center space-x-1.5 px-3 py-1 text-xs transition-colors cursor-pointer rounded-md ${
              activeTab === 'audio'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* TAB CONTENT 1: ASSETS (Images & Videos) */}
      {activeTab === 'asset' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
          {/* Grid of Visual Assets */}
          <div className="flex-1 p-3 overflow-y-auto grid grid-cols-2 gap-2.5 auto-rows-max">
            {allVisualAssets.map(asset => (
              <div
                key={asset.id}
                draggable
                onDragStart={e => onDragStartMedia(e, asset)}
                onClick={() => onSelectAssetForStage(asset)}
                className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing flex flex-col"
              >
                {/* Visual Thumbnail */}
                <div className="w-full h-24 bg-slate-100 overflow-hidden relative flex items-center justify-center">
                  {asset.type === 'video' ? (
                    <div className="relative w-full h-full flex items-center justify-center bg-slate-800">
                      <video
                        src={asset.url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                      />
                      <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-[9px] font-mono text-white rounded">
                        VIDEO
                      </span>
                    </div>
                  ) : (
                    <img
                      src={asset.url}
                      alt={asset.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  )}

                  {/* Top Bar with "Edit" badge */}
                  <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between opacity-90">
                    <span className="text-[10px] px-2 py-0.5 bg-black/60 backdrop-blur-sm text-slate-100 font-medium rounded-md">
                      Edit
                    </span>
                    {userAssets.some(ua => ua.id === asset.id) && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteAsset(asset.id);
                        }}
                        className="p-1 bg-red-600 hover:bg-red-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Bottom Asset Name */}
                <div className="px-2 py-1.5 bg-white border-t border-slate-100">
                  <p className="text-[11px] font-semibold text-slate-700 truncate">
                    {asset.name}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
            <p className="text-[10px] text-center text-slate-400 font-medium">
              Supports: PNG, JPEG, GIF, MP4
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload</span>
              </button>

              <button
                onClick={handleGenerateAIScene}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: AUDIO (Voice, Music, SFX) */}
      {activeTab === 'audio' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/40">
          {/* List of Audio Items */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2">
            {allAudioAssets.map(audio => {
              const isPlaying = playingAudioId === audio.id;
              return (
                <div
                  key={audio.id}
                  draggable
                  onDragStart={e => onDragStartMedia(e, audio)}
                  onClick={() => onSelectAssetForStage(audio)}
                  className="group flex items-center justify-between p-2.5 bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-400 rounded-xl transition-all cursor-grab active:cursor-grabbing shadow-xs"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        togglePlayAudio(audio);
                      }}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        isPlaying
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                      }`}
                    >
                      {isPlaying ? (
                        <Square className="w-3 h-3 fill-current" />
                      ) : (
                        <Play className="w-3 h-3 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-700 truncate">
                        {audio.name}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {audio.category || 'Audio'} • {audio.duration ? `${audio.duration}s` : 'Loop'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {userAssets.some(ua => ua.id === audio.id) && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onDeleteAsset(audio.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Delete audio"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Sticky Action Bar */}
          <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2">
            <p className="text-[10px] text-center text-slate-400 font-medium">
              Supports: MP3, WAV
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => audioInputRef.current?.click()}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Upload Audio</span>
              </button>

              <button
                onClick={onOpenAIVoiceModal}
                className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>AI Voice / Mic</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
