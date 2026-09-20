import React, { useState } from "react";
import {
  X,
  Upload,
  Trash2,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Crop,
  Layers,
  Image as ImageIcon,
  Check
} from "lucide-react";
import { cropFrameToPhysicsBox, getPhysicsBoxBounds } from "../utils/cropPhysics";
import { FrameData } from "../types";

interface FrameEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: FrameData[];
  defaultFrameIndex: number;
  onUpdateFrames: (newFrames: FrameData[], newDefaultIndex: number) => void;
}

export const FrameEditorModal: React.FC<FrameEditorModalProps> = ({
  isOpen,
  onClose,
  frames,
  defaultFrameIndex,
  onUpdateFrames,
}) => {
  const [localFrames, setLocalFrames] = useState<FrameData[]>(frames);
  const [selectedIndex, setSelectedIndex] = useState<number>(defaultFrameIndex || 0);
  const [cropping, setCropping] = useState(false);

  // Sync state when opened
  React.useEffect(() => {
    if (isOpen) {
      setLocalFrames(frames);
      setSelectedIndex(defaultFrameIndex >= 0 && defaultFrameIndex < frames.length ? defaultFrameIndex : 0);
    }
  }, [isOpen, frames, defaultFrameIndex]);

  if (!isOpen) return null;

  const currentFrame = localFrames[selectedIndex];

  const handleSetDefault = (index: number) => {
    const updated = localFrames.map((f, i) => ({
      ...f,
      isDefault: i === index,
    }));
    setLocalFrames(updated);
    onUpdateFrames(updated, index);
  };

  const handleDeleteFrame = (index: number) => {
    if (localFrames.length <= 1) {
      alert("At least one frame is required for animation.");
      return;
    }
    const updated = localFrames.filter((_, i) => i !== index);
    const newIdx = Math.min(selectedIndex, updated.length - 1);
    setSelectedIndex(newIdx);
    setLocalFrames(updated);
    onUpdateFrames(updated, newIdx);
  };

  const handleMoveFrame = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= localFrames.length) return;
    const item = localFrames[fromIndex];
    const next = [...localFrames];
    next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    setLocalFrames(next);
    setSelectedIndex(toIndex);
    onUpdateFrames(next, toIndex);
  };

  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const updated = [...localFrames];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        name: file.name,
        dataUrl: res,
      };
      setLocalFrames(updated);
      onUpdateFrames(updated, selectedIndex);
    };
    reader.readAsDataURL(file);
  };

  const handleAddNewFrame = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const readPromises = files.map((file: File, idx: number) => {
      return new Promise<FrameData>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({
            id: localFrames.length + idx + 1,
            name: file.name,
            dataUrl: reader.result as string,
            isDefault: false,
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readPromises).then((newItems) => {
      const updated = [...localFrames, ...newItems];
      setLocalFrames(updated);
      onUpdateFrames(updated, selectedIndex);
    });
  };

  const handleCropToPhysics = async () => {
    if (!currentFrame) return;
    setCropping(true);
    try {
      const bounds = getPhysicsBoxBounds(512);
      const croppedDataUrl = await cropFrameToPhysicsBox(currentFrame.dataUrl, bounds);
      const updated = [...localFrames];
      updated[selectedIndex] = {
        ...updated[selectedIndex],
        dataUrl: croppedDataUrl,
      };
      setLocalFrames(updated);
      onUpdateFrames(updated, selectedIndex);
    } catch (err) {
      console.error("Failed to crop frame:", err);
      alert("Error cropping image");
    } finally {
      setCropping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-4xl h-[85vh] shadow-2xl flex flex-col overflow-hidden text-neutral-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Frame Sequence Editor</h3>
            <span className="text-xs px-2 py-0.5 bg-neutral-800 rounded-full text-neutral-400 font-mono">
              {localFrames.length} Frames
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 overflow-hidden">
          {/* Frame List Column */}
          <div className="border-r border-neutral-800 p-4 flex flex-col h-full overflow-hidden bg-neutral-950/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Frames</span>
              <label className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 cursor-pointer px-2 py-1 bg-sky-950/40 border border-sky-800/60 rounded-lg hover:bg-sky-900/40 transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Add Frames</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleAddNewFrame}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {localFrames.map((f, idx) => {
                const isSelected = idx === selectedIndex;
                const isDefault = f.isDefault || idx === defaultFrameIndex;
                return (
                  <div
                    key={f.id || idx}
                    onClick={() => setSelectedIndex(idx)}
                    className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer border transition ${
                      isSelected
                        ? "bg-sky-950/40 border-sky-500/80 text-white"
                        : "bg-neutral-900/80 border-neutral-800 hover:border-neutral-700 text-neutral-300"
                    }`}
                  >
                    <span className="text-xs font-mono text-neutral-500 w-6 text-right">
                      {idx + 1}
                    </span>
                    <div className="w-10 h-10 bg-neutral-950 border border-neutral-800 rounded-md overflow-hidden shrink-0 flex items-center justify-center relative">
                      {f.dataUrl ? (
                        <img src={f.dataUrl} alt={f.name} className="w-full h-full object-contain" />
                      ) : null}
                      {isDefault && (
                        <div className="absolute top-0 right-0 bg-amber-500 text-black p-0.5 rounded-bl">
                          <Sparkles className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{f.name || `Frame ${idx + 1}`}</p>
                      {isDefault && (
                        <span className="text-[10px] text-amber-400 font-medium">Default Stop</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main Inspection View Column */}
          <div className="md:col-span-2 p-6 flex flex-col justify-between overflow-y-auto bg-neutral-900">
            {currentFrame ? (
              <div className="space-y-6">
                {/* Frame Canvas Card */}
                <div className="relative aspect-square max-h-[380px] mx-auto bg-neutral-950 border border-neutral-800 rounded-2xl flex items-center justify-center p-4 overflow-hidden shadow-inner">
                  {/* Chessboard Transparency Grid */}
                  <div
                    className="absolute inset-0 opacity-15 pointer-events-none"
                    style={{
                      backgroundImage: `linear-gradient(45deg, #404040 25%, transparent 25%), linear-gradient(-45deg, #404040 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #404040 75%), linear-gradient(-45deg, transparent 75%, #404040 75%)`,
                      backgroundSize: `16px 16px`,
                      backgroundPosition: `0 0, 0 8px, 8px -8px, -8px 0px`,
                    }}
                  />
                  {currentFrame.dataUrl ? (
                    <img
                      src={currentFrame.dataUrl}
                      alt={currentFrame.name}
                      className="relative max-h-full max-w-full object-contain filter drop-shadow-md"
                    />
                  ) : null}
                  {currentFrame.isDefault && (
                    <div className="absolute top-3 left-3 bg-amber-500/90 text-black text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                      <Sparkles className="w-3.5 h-3.5" />
                      Default Stop Frame
                    </div>
                  )}
                </div>

                {/* Frame Controls */}
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Frame #{selectedIndex + 1}: {currentFrame.name}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Adjust individual sprite order, replace image, or set as default stop pose.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveFrame(selectedIndex, selectedIndex - 1)}
                        disabled={selectedIndex === 0}
                        title="Move Left"
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-lg text-neutral-300 transition cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleMoveFrame(selectedIndex, selectedIndex + 1)}
                        disabled={selectedIndex === localFrames.length - 1}
                        title="Move Right"
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 rounded-lg text-neutral-300 transition cursor-pointer"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                    {/* Set Default */}
                    <button
                      onClick={() => handleSetDefault(selectedIndex)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border transition cursor-pointer ${
                        currentFrame.isDefault || selectedIndex === defaultFrameIndex
                          ? "bg-amber-950/40 border-amber-600 text-amber-300"
                          : "bg-neutral-800/80 border-neutral-700 hover:bg-amber-950/30 hover:border-amber-600/60 text-neutral-300"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{currentFrame.isDefault ? "Default Stop Pose ✓" : "Set as Default Stop"}</span>
                    </button>

                    {/* Replace file */}
                    <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-neutral-800/80 border border-neutral-700 hover:bg-neutral-700 hover:border-neutral-600 rounded-lg text-neutral-200 cursor-pointer transition">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Replace Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReplaceImage}
                        className="hidden"
                      />
                    </label>

                    {/* Crop to Physics Box */}
                    <button
                      onClick={handleCropToPhysics}
                      disabled={cropping}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-neutral-800/80 border border-neutral-700 hover:bg-neutral-700 rounded-lg text-neutral-200 transition cursor-pointer"
                    >
                      <Crop className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{cropping ? "Cropping..." : "Crop to Physics"}</span>
                    </button>

                    {/* Delete Frame */}
                    <button
                      onClick={() => handleDeleteFrame(selectedIndex)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium bg-red-950/30 border border-red-900/60 hover:bg-red-900/40 rounded-lg text-red-300 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      <span>Delete Frame</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-neutral-500 text-sm">
                Select a frame to edit
              </div>
            )}

            {/* Bottom Done button */}
            <div className="flex justify-end pt-4 border-t border-neutral-800 mt-4">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-sm font-medium shadow-lg shadow-sky-900/30 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save & Close</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
