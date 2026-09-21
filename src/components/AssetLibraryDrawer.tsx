import React, { useState, useRef } from 'react';
import { MediaAsset } from '../types';
import { STOCK_PROPS_AND_ASSETS, STOCK_ASSET_CATEGORIES } from '../utils/assetStock';
import { uploadImageToImgBB } from '../services/imgbbService';
import { saveMediaAssetToCloud, deleteMediaAssetFromCloud, loadAllMediaAssetsFromCloud } from '../services/mediaAssetService';
import { isGifMedia, getGifDuration } from '../utils/gifUtils';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  Upload,
  Search,
  X,
  Cloud,
  Layers,
  Loader2,
  Trash2,
  FolderArchive,
  Package,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface AssetLibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userAssets: MediaAsset[];
  onAddAsset: (asset: MediaAsset) => void;
  onDeleteAsset: (id: string) => void;
  onSelectAssetForStage: (asset: MediaAsset) => void;
  onDragStartAsset: (e: React.DragEvent, asset: MediaAsset) => void;
  onRefreshAssets?: () => Promise<void>;
}

// Fast lightweight thumbnail generator for zero-latency preview across slow networks
function createClientThumbnail(file: File | Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          resolve('');
          return;
        }
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const maxDim = 120;
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > maxDim) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              }
            } else {
              if (h > maxDim) {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = Math.max(1, w);
            canvas.height = Math.max(1, h);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resolve(canvas.toDataURL('image/jpeg', 0.6));
              return;
            }
          } catch {
            // ignore
          }
          resolve('');
        };
        img.onerror = () => resolve('');
        img.src = dataUrl;
      };
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
    } catch {
      resolve('');
    }
  });
}

export const AssetLibraryDrawer: React.FC<AssetLibraryDrawerProps> = ({
  isOpen,
  onClose,
  userAssets,
  onAddAsset,
  onDeleteAsset,
  onSelectAssetForStage,
  onDragStartAsset,
  onRefreshAssets,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadStatusType, setUploadStatusType] = useState<'info' | 'success' | 'error'>('info');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sortOrder, setSortOrder] = useState<'serial-asc' | 'serial-desc' | 'name'>('serial-asc');
  
  // Track image loading state for graceful spinners when net is slow
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  // Protected deletion state
  const [assetToDelete, setAssetToDelete] = useState<MediaAsset | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Filter user assets to only include those specifically uploaded to Asset Library
  const userUploadedProps = userAssets.filter(
    a => a.isAssetLibrary === true || a.id.startsWith('asset-prop-') || a.id.startsWith('asset-')
  );

  // Combine user uploads with stock cartoon props and assets
  const allAvailableAssets = [...userUploadedProps, ...STOCK_PROPS_AND_ASSETS];

  // Filter by category
  let categoryFiltered = allAvailableAssets;
  if (activeCategory === 'My Uploads') {
    categoryFiltered = userUploadedProps;
  } else if (activeCategory !== 'All') {
    categoryFiltered = allAvailableAssets.filter(
      a => a.category?.toLowerCase() === activeCategory.toLowerCase()
    );
  }

  // Filter by search query
  const queryFiltered = categoryFiltered.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  // Apply deterministic serial / name sorting
  const displayedAssets = [...queryFiltered].sort((a, b) => {
    const isUserA = userUploadedProps.some(u => u.id === a.id);
    const isUserB = userUploadedProps.some(u => u.id === b.id);

    if (sortOrder === 'name') {
      return a.name.localeCompare(b.name);
    }

    if (isUserA && isUserB) {
      const serialA = a.serialNumber ?? a.createdAt ?? 0;
      const serialB = b.serialNumber ?? b.createdAt ?? 0;
      return sortOrder === 'serial-asc' ? serialA - serialB : serialB - serialA;
    }

    // User uploads prioritized before stock
    if (isUserA && !isUserB) return -1;
    if (!isUserA && isUserB) return 1;

    return 0;
  });

  // Manual Cloud Sync handler
  const handleSyncCloud = async () => {
    setIsSyncing(true);
    setUploadStatusType('info');
    setUploadStatus('Syncing assets from Firebase Firestore across devices...');
    try {
      if (onRefreshAssets) {
        await onRefreshAssets();
      } else {
        await loadAllMediaAssetsFromCloud();
      }
      setUploadStatusType('success');
      setUploadStatus('Synced with Firebase Cloud!');
    } catch (err) {
      setUploadStatusType('error');
      setUploadStatus('Could not sync with cloud. Check internet connection.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setUploadStatus(null), 2500);
    }
  };

  // Upload handler for all image formats (PNG, JPG, JPEG, WEBP, SVG, GIF, AVIF)
  const handleFilesUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    // Calculate starting serial strictly sequentially so order is 100% maintained
    let maxSerial = 0;
    userUploadedProps.forEach(a => {
      if (typeof a.serialNumber === 'number' && a.serialNumber > maxSerial) {
        maxSerial = a.serialNumber;
      }
    });
    if (maxSerial === 0) {
      maxSerial = userUploadedProps.length;
    }

    const baseTimestamp = Date.now();

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const assignedSerial = maxSerial + i + 1;
        const assignedCreatedAt = baseTimestamp + i * 20;

        setUploadStatusType('info');
        setUploadStatus(
          files.length > 1
            ? `Uploading (${i + 1}/${files.length}): "${file.name}" [Serial #${assignedSerial}]...`
            : `Uploading "${file.name}" [Serial #${assignedSerial}] to Firebase Cloud...`
        );

        try {
          const isGif = file.type === 'image/gif' || file.name.toLowerCase().endsWith('.gif');
          let gifDuration: number | undefined;

          if (isGif) {
            try {
              const detected = await getGifDuration(file);
              if (detected && detected > 0) {
                gifDuration = detected;
              }
            } catch (err) {
              console.warn('Could not parse GIF duration:', err);
            }
          }

          // Generate instant fast thumbnail for slow networks
          const clientThumb = await createClientThumbnail(file);

          // Upload to ImgBB and get permanent image URL
          const result = await uploadImageToImgBB(file, file.name);

          const assetItem: MediaAsset = {
            id: `asset-prop-${baseTimestamp}-${i}-${Math.random().toString(36).substring(2, 6)}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            type: 'image',
            url: result.url,
            thumbnail: result.thumbnailUrl || clientThumb || result.url,
            duration: gifDuration,
            width: result.width,
            height: result.height,
            category: 'My Uploads',
            isAssetLibrary: true, // Stored strictly in Asset Library, hidden from Media Library
            serialNumber: assignedSerial, // Strictly assigned serial sequence
            createdAt: assignedCreatedAt, // Strictly assigned monotonic timestamp
          };

          // Save permanently to Firebase Firestore & local IndexedDB
          await saveMediaAssetToCloud(assetItem);
          onAddAsset(assetItem);
          successCount++;
        } catch (err) {
          console.error(`Error uploading "${file.name}":`, err);
        }
      }

      if (successCount > 0) {
        setUploadStatusType('success');
        setUploadStatus(
          files.length > 1
            ? `Successfully uploaded ${successCount} assets in sequential serial to Firebase!`
            : 'Asset uploaded & saved permanently to Firebase Firestore!'
        );
      } else {
        setUploadStatusType('error');
        setUploadStatus('Failed to upload assets. Please check your internet connection.');
      }
      setTimeout(() => setUploadStatus(null), 3500);
    } catch (err) {
      console.error('Batch upload error:', err);
      setUploadStatusType('error');
      setUploadStatus(`Upload error: ${err instanceof Error ? err.message : 'Failed'}`);
      setTimeout(() => setUploadStatus(null), 4000);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFilesUpload(e.target.files);
      e.target.value = '';
    }
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!assetToDelete) return;
    try {
      await deleteMediaAssetFromCloud(assetToDelete.id);
    } catch (err) {
      console.warn('Error deleting asset:', err);
    }
    onDeleteAsset(assetToDelete.id);
    setAssetToDelete(null);
    setUploadStatusType('info');
    setUploadStatus('Asset permanently deleted from Cloud');
    setTimeout(() => setUploadStatus(null), 2500);
  };

  const allCategories = ['All', 'My Uploads', ...STOCK_ASSET_CATEGORIES.filter(c => c !== 'All')];

  return (
    <div className="w-full sm:w-84 md:w-88 max-w-full h-full max-h-[100dvh] bg-white border-r border-slate-200 flex flex-col z-20 shadow-xl select-none relative overflow-hidden animate-in slide-in-from-left duration-200">
      {/* Hidden File Input supporting all image formats */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.webp,.svg,.gif,.avif,.bmp"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* 1. Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shadow-2xs">
            <FolderArchive className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-sm font-bold text-slate-800">Asset Library</span>
              <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full">
                {displayedAssets.length}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Props, Objects & Visual Elements
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Cloud Sync Button */}
          <button
            onClick={handleSyncCloud}
            disabled={isSyncing}
            className={`p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${
              isSyncing ? 'text-blue-600 bg-blue-50' : ''
            }`}
            title="Sync latest assets from Firebase Firestore across all devices"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Close Drawer */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Upload Card (Drag & Drop + Button) */}
      <div className="p-3 border-b border-slate-100 bg-slate-50/70">
        <div
          onDragOver={e => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDropFiles}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center transition-all cursor-pointer ${
            isDragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/80 shadow-2xs'
          }`}
        >
          {isUploading ? (
            <div className="flex items-center space-x-2 py-1">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <span className="text-xs font-semibold text-blue-700">Uploading to Firebase Cloud...</span>
            </div>
          ) : (
            <>
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5 shadow-2xs">
                <Upload className="w-4 h-4" />
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-700">
                  Upload Asset / Prop
                </p>
                <p className="text-[10px] text-slate-400">
                  PNG, JPG, WEBP, SVG, GIF (Syncs to all devices)
                </p>
              </div>
            </>
          )}
        </div>

        {/* Upload Status Toast */}
        {uploadStatus && (
          <div
            className={`mt-2 px-2.5 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 animate-in fade-in duration-150 ${
              uploadStatusType === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : uploadStatusType === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-blue-50 text-blue-700 border border-blue-200'
            }`}
          >
            {uploadStatusType === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
            ) : uploadStatusType === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin text-blue-600" />
            )}
            <span className="truncate flex-1">{uploadStatus}</span>
          </div>
        )}
      </div>

      {/* 3. Search Bar & Serial Sorting Bar */}
      <div className="px-3 pt-2.5 pb-1 space-y-1.5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search props, objects & assets..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-blue-400 rounded-lg outline-hidden transition-all text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Controls (Serial Order preservation) */}
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
          <div className="flex items-center space-x-1">
            <span className="text-slate-400">Sort:</span>
            <button
              onClick={() => setSortOrder('serial-asc')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                sortOrder === 'serial-asc'
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Sequential upload order (#1, #2, #3...)"
            >
              Serial 1→N
            </button>
            <button
              onClick={() => setSortOrder('serial-desc')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                sortOrder === 'serial-desc'
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Newest uploaded first"
            >
              Newest
            </button>
            <button
              onClick={() => setSortOrder('name')}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                sortOrder === 'name'
                  ? 'bg-blue-100 text-blue-700 font-semibold'
                  : 'hover:bg-slate-100 text-slate-600'
              }`}
              title="Alphabetical order"
            >
              A-Z
            </button>
          </div>
          <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
            <Cloud className="w-2.5 h-2.5 text-emerald-600" />
            <span>Firestore Sync</span>
          </span>
        </div>
      </div>

      {/* 4. Category Filter Pills */}
      <div className="px-3 py-1.5 flex items-center space-x-1 overflow-x-auto no-scrollbar border-b border-slate-100 pb-2">
        {allCategories.map(cat => {
          const isActive = activeCategory === cat;
          const count =
            cat === 'All'
              ? allAvailableAssets.length
              : cat === 'My Uploads'
              ? userUploadedProps.length
              : allAvailableAssets.filter(a => a.category?.toLowerCase() === cat.toLowerCase()).length;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer flex items-center space-x-1 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{cat}</span>
              <span
                className={`text-[9px] px-1 rounded-full ${
                  isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-200 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5. Assets Grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {displayedAssets.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center p-4">
            <Package className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-600">No assets found</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {searchQuery
                ? `No results for "${searchQuery}"`
                : activeCategory === 'My Uploads'
                ? 'Upload transparent PNGs, SVGs or GIFs to get started'
                : 'Try selecting a different category'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {displayedAssets.map(asset => {
              const isUserUploaded = userUploadedProps.some(u => u.id === asset.id);
              const isGif = isGifMedia(asset.url, asset.name);
              const isImgLoading = loadingImages[asset.id] === true;
              const hasError = imageErrors[asset.id] === true;

              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={e => onDragStartAsset(e, asset)}
                  onClick={() => onSelectAssetForStage(asset)}
                  className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-all flex flex-col cursor-pointer active:scale-98"
                  title="Click to add asset as a new layer on Canvas & Timeline"
                >
                  {/* Asset Preview Container with Checkered pattern for transparent images */}
                  <div
                    className="w-full h-24 bg-slate-50 relative flex items-center justify-center overflow-hidden"
                    style={{
                      backgroundImage: `
                        linear-gradient(45deg, #f1f5f9 25%, transparent 25%), 
                        linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), 
                        linear-gradient(45deg, transparent 75%, #f1f5f9 75%), 
                        linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)
                      `,
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    {/* Slow network loading spinner */}
                    {isImgLoading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-2xs z-5">
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin mb-1" />
                        <span className="text-[9px] text-slate-400 font-medium">Loading asset...</span>
                      </div>
                    )}

                    {/* Network error placeholder */}
                    {hasError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 p-2 text-center z-5">
                        <AlertCircle className="w-4 h-4 text-amber-500 mb-1" />
                        <span className="text-[9px] text-slate-500 font-medium">Slow Network</span>
                        <span className="text-[8px] text-slate-400">Retrying...</span>
                      </div>
                    )}

                    <img
                      src={asset.url || asset.thumbnail}
                      alt={asset.name}
                      className={`w-full h-full object-contain p-2 group-hover:scale-105 transition-all duration-300 drop-shadow-xs ${
                        isImgLoading ? 'opacity-30 blur-2xs' : 'opacity-100'
                      }`}
                      loading="lazy"
                      onLoad={() => {
                        setLoadingImages(prev => ({ ...prev, [asset.id]: false }));
                      }}
                      onError={() => {
                        setLoadingImages(prev => ({ ...prev, [asset.id]: false }));
                        setImageErrors(prev => ({ ...prev, [asset.id]: true }));
                      }}
                    />

                    {/* Top Badges & Delete Button */}
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between pointer-events-none">
                      <div className="flex items-center space-x-1">
                        {/* Serial Number Badge for uploaded assets */}
                        {isUserUploaded && asset.serialNumber !== undefined && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-600 text-white font-bold rounded flex items-center space-x-0.5 shadow-2xs">
                            <span>#{asset.serialNumber}</span>
                          </span>
                        )}

                        {isUserUploaded ? (
                          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-600/90 backdrop-blur-xs text-white font-medium rounded flex items-center space-x-0.5 shadow-2xs">
                            <Cloud className="w-2.5 h-2.5" />
                            <span>Cloud</span>
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-700/80 backdrop-blur-xs text-white font-medium rounded">
                            Stock
                          </span>
                        )}

                        {isGif && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-purple-600/90 backdrop-blur-xs text-white font-bold rounded shadow-2xs">
                            GIF
                          </span>
                        )}
                      </div>

                      {/* Protected Delete Button for user uploads */}
                      {isUserUploaded && (
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setAssetToDelete(asset);
                          }}
                          className="pointer-events-auto p-1 bg-red-600/90 hover:bg-red-700 text-white rounded shadow-xs transition-colors cursor-pointer"
                          title="Delete Asset permanently (Security code required)"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Asset Footer: Name & Action Hint */}
                  <div className="px-2 py-1.5 bg-white border-t border-slate-100 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-slate-700 truncate" title={asset.name}>
                      {asset.name}
                    </p>
                    <span className="text-[9px] text-blue-600 group-hover:underline font-medium ml-1 shrink-0">
                      + Add
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Footer Hint */}
      <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-center">
        <span className="text-[10px] text-slate-500 font-medium flex items-center justify-center space-x-1">
          <Layers className="w-3 h-3 text-blue-600" />
          <span>Click to add as interactive layer on Canvas & Timeline</span>
        </span>
      </div>

      {/* 7. Passcode Protected Deletion Modal */}
      {assetToDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Delete Asset"
          itemName={assetToDelete.name}
          itemType="asset prop"
          description="This will permanently delete this asset from Firestore cloud and local storage."
          onClose={() => setAssetToDelete(null)}
          onConfirm={handleDeleteConfirmed}
        />
      )}
    </div>
  );
};
