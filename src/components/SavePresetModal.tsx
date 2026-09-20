import React, { useState } from "react";
import { X, CloudUpload, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { FrameData, AnimationPreset } from "../types";
import { savePresetToFirebase } from "../utils/firebasePresets";

interface SavePresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  frames: FrameData[];
  defaultFrameIndex: number;
  currentFps: number;
  currentLoop: boolean;
  onSavedSuccess: (presetName: string) => void;
}

export const SavePresetModal: React.FC<SavePresetModalProps> = ({
  isOpen,
  onClose,
  frames,
  defaultFrameIndex,
  currentFps,
  currentLoop,
  onSavedSuccess,
}) => {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("walking");
  const [saving, setSaving] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter an animation preset name");
      return;
    }

    if (frames.length === 0) {
      setError("No frames available to save in this preset");
      return;
    }

    setSaving(true);
    setError(null);
    setProgressMsg("Preparing preset data...");
    setProgressPercent(5);

    try {
      const presetId = `preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const presetData: Omit<AnimationPreset, "createdAt" | "updatedAt"> = {
        id: presetId,
        name: name.trim(),
        category,
        fps: currentFps,
        loop: currentLoop,
        frameCount: frames.length,
        defaultFrameIndex: defaultFrameIndex,
        frames: frames.map((f, idx) => ({
          id: f.id,
          name: f.name,
          dataUrl: f.dataUrl,
          isDefault: idx === defaultFrameIndex,
        })),
      };

      await savePresetToFirebase(presetData, (cur, total, msg) => {
        const pct = Math.round((cur / total) * 90) + 10;
        setProgressPercent(pct);
        setProgressMsg(msg);
      });

      onSavedSuccess(name.trim());
      setName("");
      onClose();
    } catch (err: any) {
      console.error("Failed to save preset:", err);
      setError(err.message || "Failed to save preset to Firestore. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const defaultFrame = frames[defaultFrameIndex] || frames[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-semibold text-white">Save Animation Preset</h3>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-950/50 border border-red-800/80 rounded-xl p-3 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Preview Box */}
          <div className="flex items-center gap-4 p-3 bg-neutral-950/60 border border-neutral-800/80 rounded-xl">
            {defaultFrame?.dataUrl ? (
              <img
                src={defaultFrame.dataUrl}
                alt="Thumbnail"
                className="w-16 h-16 object-contain bg-neutral-900/80 border border-neutral-800 rounded-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500 text-xs shrink-0">
                No Preview
              </div>
            )}
            <div className="text-xs space-y-1">
              <div className="text-neutral-300 font-medium flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Default Stop Frame: #{defaultFrameIndex + 1}</span>
              </div>
              <p className="text-neutral-400">Total Frames: <span className="text-white font-mono">{frames.length}</span></p>
              <p className="text-neutral-400">Speed: <span className="text-white font-mono">{currentFps} FPS</span> &bull; Loop: <span className="text-white">{currentLoop ? "On" : "Off"}</span></p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Preset Name <span className="text-sky-400">*</span>
            </label>
            <input
              type="text"
              required
              disabled={saving}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hero Normal Walk Cycle v2"
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Category / Animation Type
            </label>
            <select
              value={category}
              disabled={saving}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 transition"
            >
              <option value="walking">Walking Cycle (Hatbe)</option>
              <option value="running">Running (Dourabe)</option>
              <option value="idle">Idle / Stopped (Thakbe)</option>
              <option value="talking">Talking (Kotha bolbe)</option>
              <option value="action">Combat / Action</option>
              <option value="custom">Custom Animation</option>
            </select>
          </div>

          {saving && (
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-neutral-400">
                <span className="truncate pr-2">{progressMsg}</span>
                <span className="font-mono">{progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white rounded-xl shadow-lg shadow-sky-900/30 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Save Preset</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
