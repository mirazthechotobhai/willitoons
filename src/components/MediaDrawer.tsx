import React, { useState, useRef } from 'react';
import { MediaAsset, BackgroundAsset } from '../types';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from '../utils/mediaStock';
import { playSyntheticAudio, playUploadedAudio } from '../utils/audioEngine';
import { uploadImageToImgBB } from '../services/imgbbService';
import {
  saveBackgroundToCloud,
} from '../services/backgroundService';
import {
  saveMediaAssetToCloud,
  deleteMediaAssetFromCloud,
  fileToPermanentDataURL,
} from '../services/mediaAssetService';
import {
  Upload,
  Sparkles,
  Trash2,
  Play,
  Square,
  Music,
  Image as ImageIcon,
  Mic,
  X,
  Cloud,
  CheckCircle,
  Layers,
  AlertCircle,
  Loader2,
  Volume2,
} from 'lucide-react';

interface MediaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userAssets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onSelectAssetForStage: (asset: MediaAsset) => void;
  onApplyBackground?: (url: string) => void;
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
  onApplyBackground,
  onDragStartMedia,
  onOpenAIVoiceModal,
}) => {
  const [activeTab, setActiveTab] = useState<'asset' | 'audio'>('asset');
  const [assetFilter, setAssetFilter] = useState<'all' | 'custom' | 'stock'>('all');
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const activeAudioStopperRef = useRef<{ stop: () => void } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  // Uploading and API states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadStatusType, setUploadStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Separate user uploaded assets and stock backgrounds
  const userUploadedVisuals = userAssets.filter(a => a.type === 'image' || a.type === 'video');
  const stockVisuals = STOCK_BACKGROUNDS;

  let displayedVisualAssets: MediaAsset[] = [];
  if (assetFilter === 'custom') {
    displayedVisualAssets = userUploadedVisuals;
  } else if (assetFilter === 'stock') {
    displayedVisualAssets = stockVisuals;
  } else {
    displayedVisualAssets = [...userUploadedVisuals, ...stockVisuals];
  }

  // Combine stock audios with user uploaded audios
  const userAudioAssets = userAssets.filter(a => a.type === 'audio');
  const allAudioAssets = [
    ...userAudioAssets,
    ...STOCK_AUDIO,
  ];

  // Upload handler with ImgBB + permanent Firestore saving for images, music, audio
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, forceType?: 'image' | 'video' | 'audio') => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      let inferredType: 'image' | 'video' | 'audio' = 'image';

      if (file.type.startsWith('video/')) inferredType = 'video';
      else if (file.type.startsWith('audio/')) inferredType = 'audio';
      else if (file.type.startsWith('image/')) inferredType = 'image';
      else if (forceType) inferredType = forceType;

      if (inferredType === 'image') {
        // Upload image to ImgBB API and persist permanently to Firestore & localStorage
        setIsUploading(true);
        setUploadStatusType('info');
        setUploadStatus(`Uploading "${file.name}" to Cloud...`);

        try {
          const result = await uploadImageToImgBB(file, file.name);

          const bgAsset: BackgroundAsset = {
            id: `bg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            url: result.url,
            thumbnail: result.thumbnailUrl || result.url,
            deleteUrl: result.deleteUrl,
            imgbbId: result.id,
            width: result.width,
            height: result.height,
            createdAt: Date.now(),
          };

          // Save to Firebase Firestore & local storage
          await saveBackgroundToCloud(bgAsset);

          const mediaAsset: MediaAsset = {
            id: bgAsset.id,
            name: bgAsset.name,
            type: 'image',
            url: bgAsset.url,
            thumbnail: bgAsset.thumbnail || bgAsset.url,
            width: bgAsset.width,
            height: bgAsset.height,
            category: 'Uploaded Background',
          };

          // Also save in media_assets collection
          await saveMediaAssetToCloud(mediaAsset);

          onAddAsset(mediaAsset);

          setUploadStatusType('success');
          setUploadStatus('Background uploaded & saved to Firestore permanently!');
          setTimeout(() => setUploadStatus(null), 3500);
        } catch (err) {
          console.error('Upload background error:', err);
          setUploadStatusType('error');
          setUploadStatus(`Upload error: ${err instanceof Error ? err.message : 'Failed'}`);
          setTimeout(() => setUploadStatus(null), 4000);
        } finally {
          setIsUploading(false);
        }
      } else if (inferredType === 'audio') {
        // Upload and persist audio/music permanently to Firestore & localStorage
        setIsUploading(true);
        setUploadStatusType('info');
        setUploadStatus(`Saving audio "${file.name}" to Cloud...`);

        try {
          const permanentUrl = await fileToPermanentDataURL(file);
          const audioAsset: MediaAsset = {
            id: `audio-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'audio',
            url: permanentUrl,
            category: 'Uploaded Audio',
          };

          await saveMediaAssetToCloud(audioAsset);
          onAddAsset(audioAsset);

          setUploadStatusType('success');
          setUploadStatus('Audio saved to Firestore permanently!');
          setTimeout(() => setUploadStatus(null), 3500);
        } catch (err) {
          console.error('Upload audio error:', err);
          setUploadStatusType('error');
          setUploadStatus(`Audio upload error: ${err instanceof Error ? err.message : 'Failed'}`);
          setTimeout(() => setUploadStatus(null), 4000);
        } finally {
          setIsUploading(false);
        }
      } else {
        // Video file
        const url = URL.createObjectURL(file);
        const newAsset: MediaAsset = {
          id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          type: inferredType,
          url,
          thumbnail: '🎬',
        };
        onAddAsset(newAsset);
      }
    }
    e.target.value = '';
  };

  // Permanently delete an uploaded background or audio asset
  const handleDeleteUploadedAsset = async (assetId: string) => {
    try {
      await deleteMediaAssetFromCloud(assetId);
    } catch (err) {
      console.warn('Error deleting media asset:', err);
    }
    onDeleteAsset(assetId);
    setDeleteConfirmId(null);
    setUploadStatusType('info');
    setUploadStatus('Asset permanently deleted');
    setTimeout(() => setUploadStatus(null), 2500);
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
          <polygon points="0,520 280,340 560,540 880,310 1140,490 1280,380 1280,720 0,720" fill="#16a34a"/>
          <polygon points="0,560 380,430 720,580 1060,420 1280,520 1280,720 0,720" fill="#4ade80"/>
          <ellipse cx="640" cy="620" rx="420" ry="80" fill="#0284c7"/>
        </svg>
      `),
      thumbnail: '✨',
    };
    onAddAsset(newScene);
  };

  return (
    <div className="w-full sm:w-84 md:w-88 max-w-full h-full max-h-[100dvh] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl select-none relative overflow-hidden">
      
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

      {/* Header & Main Tabs - Fully responsive on mobile */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-lg">
          <button
            onClick={() => setActiveTab('asset')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs transition-colors cursor-pointer rounded-md ${
              activeTab === 'asset'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Backgrounds</span>
          </button>

          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs transition-colors cursor-pointer rounded-md ${
              activeTab === 'audio'
                ? 'bg-white text-slate-800 font-bold shadow-xs'
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Audio & Music</span>
          </button>
        </div>

        <div className="flex items-center space-x-1">
          {/* Close button - prominent for mobile */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors bg-slate-50"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* TAB CONTENT 1: BACKGROUNDS & VISUAL ASSETS */}
      {activeTab === 'asset' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/40">
          
          {/* Filter Sub-Tabs */}
          <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-100 text-xs shrink-0">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setAssetFilter('all')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                  assetFilter === 'all'
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                All ({userUploadedVisuals.length + stockVisuals.length})
              </button>

              <button
                onClick={() => setAssetFilter('custom')}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                  assetFilter === 'custom'
                    ? 'bg-emerald-50 text-emerald-700 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Your uploaded background images stored permanently"
              >
                <Cloud className="w-3 h-3 text-emerald-600" />
                <span>Uploaded ({userUploadedVisuals.length})</span>
              </button>

              <button
                onClick={() => setAssetFilter('stock')}
                className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer transition-colors ${
                  assetFilter === 'stock'
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Stock ({stockVisuals.length})
              </button>
            </div>
          </div>

          {/* Upload Status Banner */}
          {uploadStatus && (
            <div
              className={`px-3 py-1.5 text-xs flex items-center space-x-1.5 border-b select-none transition-all shrink-0 ${
                uploadStatusType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : uploadStatusType === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              ) : uploadStatusType === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              )}
              <span className="truncate font-medium">{uploadStatus}</span>
            </div>
          )}

          {/* Scrollable Grid of Visual Assets */}
          <div className="flex-1 min-h-0 p-2.5 sm:p-3 overflow-y-auto">
            {displayedVisualAssets.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <Cloud className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No uploaded backgrounds yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Upload images using the button below. They will be stored permanently in Firestore.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload Background</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5 auto-rows-max">
                {displayedVisualAssets.map(asset => {
                  const isUserUploaded = userAssets.some(ua => ua.id === asset.id);

                  return (
                    <div
                      key={asset.id}
                      draggable
                      onDragStart={e => onDragStartMedia(e, asset)}
                      onClick={() => onSelectAssetForStage(asset)}
                      className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col cursor-pointer active:scale-98"
                      title="Click to add as new layer on timeline"
                    >
                      {/* Visual Thumbnail */}
                      <div
                        className="w-full h-20 sm:h-24 bg-slate-100 overflow-hidden relative flex items-center justify-center cursor-pointer"
                      >
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
                            loading="lazy"
                          />
                        )}

                        {/* Top Badges & Actions */}
                        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                          {isUserUploaded ? (
                            <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600/90 backdrop-blur-xs text-white font-medium rounded flex items-center space-x-0.5 shadow-xs">
                              <Cloud className="w-2.5 h-2.5" />
                              <span>Cloud</span>
                            </span>
                          ) : (
                            <span className="text-[9px] px-1.5 py-0.5 bg-black/60 backdrop-blur-xs text-slate-100 font-medium rounded">
                              Stock
                            </span>
                          )}

                          {isUserUploaded && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setDeleteConfirmId(asset.id);
                              }}
                              className="pointer-events-auto p-1 bg-red-600/90 hover:bg-red-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                              title="Delete background permanently"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Bottom Asset Name */}
                      <div className="px-2 py-1 bg-white border-t border-slate-100 flex items-center justify-between">
                        <p className="text-[11px] font-semibold text-slate-700 truncate" title={asset.name}>
                          {asset.name}
                        </p>
                        {isUserUploaded && (
                          <span className="text-[9px] text-emerald-600 font-mono font-medium ml-1 shrink-0">
                            Saved
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sticky Bottom Action Bar - Always visible on mobile */}
          <div className="p-3 border-t border-slate-200 bg-white/95 backdrop-blur-xs space-y-2 shrink-0 sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <span className="flex items-center space-x-1 text-emerald-600">
                <Cloud className="w-3 h-3" />
                <span>Firestore Cloud Active</span>
              </span>
              <span>PNG, JPG, WebP, GIF</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
                title="Upload background image via ImgBB & Firestore"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{isUploading ? 'Uploading...' : 'Upload BG'}</span>
              </button>

              <button
                onClick={handleGenerateAIScene}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>AI Scene</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: AUDIO & MUSIC */}
      {activeTab === 'audio' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/40">
          {/* Upload Status Banner */}
          {uploadStatus && (
            <div
              className={`px-3 py-1.5 text-xs flex items-center space-x-1.5 border-b select-none transition-all shrink-0 ${
                uploadStatusType === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : uploadStatusType === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200'
                  : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              ) : uploadStatusType === 'success' ? (
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              )}
              <span className="truncate font-medium">{uploadStatus}</span>
            </div>
          )}

          {/* List of Audio Items */}
          <div className="flex-1 min-h-0 p-2.5 sm:p-3 overflow-y-auto space-y-2">
            {allAudioAssets.map(audio => {
              const isPlaying = playingAudioId === audio.id;
              const isUserUploaded = userAssets.some(ua => ua.id === audio.id);

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
                      className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors cursor-pointer ${
                        isPlaying
                          ? 'bg-amber-500 text-white animate-pulse'
                          : 'bg-slate-100 text-blue-600 hover:bg-blue-600 hover:text-white'
                      }`}
                      title={isPlaying ? 'Pause' : 'Preview audio'}
                    >
                      {isPlaying ? (
                        <Square className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-semibold text-slate-700 truncate">
                          {audio.name}
                        </p>
                        {isUserUploaded && (
                          <span className="text-[9px] px-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded font-mono">
                            Cloud
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {audio.category || 'Audio'} • {audio.duration ? `${audio.duration}s` : 'Track'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {isUserUploaded && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteConfirmId(audio.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        title="Delete audio permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Action Bar - Always visible on mobile */}
          <div className="p-3 border-t border-slate-200 bg-white/95 backdrop-blur-xs space-y-2 shrink-0 sticky bottom-0 z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <p className="text-[10px] text-center text-slate-400 font-medium">
              Permanent Cloud Storage: MP3, WAV, M4A, OGG
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={isUploading}
                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>Upload Music/Audio</span>
              </button>

              <button
                onClick={onOpenAIVoiceModal}
                className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>AI Voice / Mic</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {deleteConfirmId && (
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 w-full max-w-xs space-y-3 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5 text-red-600">
              <div className="p-2 bg-red-50 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Delete Asset?</h4>
                <p className="text-[11px] text-slate-500">This will permanently remove it from Firestore cloud & local storage.</p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUploadedAsset(deleteConfirmId)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
