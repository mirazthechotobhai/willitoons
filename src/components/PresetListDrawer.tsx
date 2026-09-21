import React, { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Loader2,
  Film,
  Sparkles,
  RefreshCw,
  FolderOpen
} from "lucide-react";
import { AnimationPreset } from "../types";
import {
  getPresetsFromFirebase,
  getPresetFrames,
  deletePresetFromFirebase
} from "../utils/firebasePresets";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface PresetListDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadPreset: (preset: AnimationPreset) => void;
}

export const PresetListDrawer: React.FC<PresetListDrawerProps> = ({
  isOpen,
  onClose,
  onLoadPreset,
}) => {
  const [presets, setPresets] = useState<AnimationPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [presetToDelete, setPresetToDelete] = useState<AnimationPreset | null>(null);
  const [loadingPresetId, setLoadingPresetId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fetchPresets = async () => {
    setLoading(true);
    try {
      const list = await getPresetsFromFirebase();
      setPresets(list);
    } catch (err) {
      console.error("Failed to load presets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = async (preset: AnimationPreset) => {
    setLoadingPresetId(preset.id);
    try {
      // If frames are already embedded
      if (preset.frames && preset.frames.length > 0) {
        onLoadPreset(preset);
        onClose();
        return;
      }

      // Otherwise fetch the frames subcollection
      const fullFrames = await getPresetFrames(preset.id);
      onLoadPreset({
        ...preset,
        frames: fullFrames,
      });
      onClose();
    } catch (err) {
      console.error("Failed to load preset frames:", err);
      alert("Failed to load preset frames from Firestore");
    } finally {
      setLoadingPresetId(null);
    }
  };

  const handleDeleteClick = (preset: AnimationPreset, e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetToDelete(preset);
  };

  const handleConfirmDeletePreset = async (presetId: string) => {
    setDeletingId(presetId);
    try {
      await deletePresetFromFirebase(presetId);
      setPresets((prev) => prev.filter((p) => p.id !== presetId));
    } catch (err) {
      console.error("Delete preset error:", err);
      alert("Failed to delete preset");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = filterCategory === "all"
    ? presets
    : presets.filter((p) => (p.category || "walking") === filterCategory);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-neutral-900 border-l border-neutral-800 h-full flex flex-col shadow-2xl text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Saved Cloud Presets</h3>
            <span className="text-xs px-2 py-0.5 bg-neutral-800 rounded-full text-neutral-400 font-mono">
              {presets.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPresets}
              disabled={loading}
              title="Refresh presets"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-400" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter categories */}
        <div className="px-6 py-3 border-b border-neutral-800 flex items-center gap-2 overflow-x-auto text-xs no-scrollbar">
          {["all", "walking", "running", "idle", "talking", "action"].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition cursor-pointer ${
                filterCategory === cat
                  ? "bg-sky-600 text-white font-medium shadow"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Preset List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && presets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-400 text-sm">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
              <span>Loading presets from Firestore...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-neutral-500 text-sm">
              <Film className="w-10 h-10 mb-2 stroke-1 text-neutral-600" />
              <p className="font-medium text-neutral-400">No Presets Saved Yet</p>
              <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                Upload frames, adjust FPS and stop frame, then click "Save Preset" to store in Firestore.
              </p>
            </div>
          ) : (
            filtered.map((preset) => (
              <div
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="group relative flex items-center gap-3 p-3 bg-neutral-950/70 border border-neutral-800/80 hover:border-sky-500/60 rounded-xl cursor-pointer transition shadow-sm hover:shadow-sky-950/20"
              >
                {/* Thumbnail / Stop Frame */}
                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                  {preset.thumbnailUrl ? (
                    <img
                      src={preset.thumbnailUrl}
                      alt={preset.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Film className="w-6 h-6 text-neutral-600" />
                  )}
                  {preset.defaultFrameIndex !== undefined && (
                    <span
                      title={`Default Stop Frame #${preset.defaultFrameIndex + 1}`}
                      className="absolute bottom-0 right-0 bg-amber-500/90 text-black text-[9px] font-bold px-1 rounded-tl-sm flex items-center gap-0.5"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      #{preset.defaultFrameIndex + 1}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate group-hover:text-sky-300 transition">
                      {preset.name}
                    </h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 font-mono">
                    <span className="capitalize text-sky-400/90">{preset.category || "walking"}</span>
                    <span>&bull;</span>
                    <span>{preset.frameCount || preset.frames?.length || 0} frames</span>
                    <span>&bull;</span>
                    <span>{preset.fps} FPS</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {loadingPresetId === preset.id ? (
                    <Loader2 className="w-5 h-5 text-sky-400 animate-spin mr-1" />
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteClick(preset, e)}
                      disabled={deletingId === preset.id}
                      title="Delete Preset"
                      className="p-2 text-neutral-500 hover:text-red-400 hover:bg-neutral-800/80 rounded-lg transition cursor-pointer"
                    >
                      {deletingId === preset.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Protected Deletion Modal with secret code 686800 */}
        {presetToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            title="Delete Animation Preset"
            itemName={presetToDelete.name}
            itemType="preset animation"
            description="This will permanently delete the preset from Firestore cloud database. Once deleted, other sessions will not be able to load this preset."
            onClose={() => setPresetToDelete(null)}
            onConfirm={() => {
              const id = presetToDelete.id;
              setPresetToDelete(null);
              handleConfirmDeletePreset(id);
            }}
          />
        )}
      </div>
    </div>
  );
};
