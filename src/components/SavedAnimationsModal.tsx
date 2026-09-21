import React, { useState } from "react";
import { X, Trash2, CheckCircle2, Loader2, Zap } from "lucide-react";
import { SavedAnimation, CharacterModel } from "../types";
import { RunnerIcon } from "./RunnerIcon";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";

interface SavedAnimationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  animations: SavedAnimation[];
  onSelectAnimation: (anim: SavedAnimation) => void;
  onDeleteAnimation: (id: string, e: React.MouseEvent) => void;
  selectedId?: string;
  characters?: CharacterModel[];
  onImportAnimationAsCharacter?: (anim: SavedAnimation) => void;
  onRemoveAnimationFromCharacterList?: (anim: SavedAnimation) => void;
  onOpenMainCharacterList?: () => void;
}

export const SavedAnimationsModal: React.FC<SavedAnimationsModalProps> = ({
  isOpen,
  onClose,
  animations,
  onSelectAnimation,
  onDeleteAnimation,
  selectedId,
  characters = [],
  onImportAnimationAsCharacter,
  onRemoveAnimationFromCharacterList,
  onOpenMainCharacterList,
}) => {
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
  const [animToDelete, setAnimToDelete] = useState<SavedAnimation | null>(null);
  const [notification, setNotification] = useState<{
    type: 'added' | 'removed';
    serialNumber: number;
  } | null>(null);

  if (!isOpen) return null;

  const isAnimationInCharacterList = (anim: SavedAnimation): boolean => {
    if (removedIds.has(anim.id)) return false;
    if (importedIds.has(anim.id)) return true;
    if (!characters || characters.length === 0) return false;
    return characters.some(
      (c) =>
        c.isSpriteSheet &&
        (c.id === `custom-char-sprite-${anim.id}` ||
          c.id.includes(anim.id) ||
          c.spriteSheet?.serialNumber === anim.serialNumber ||
          (c.spriteSheet?.imageUrl &&
            anim.imageUrl &&
            c.spriteSheet.imageUrl === anim.imageUrl))
    );
  };

  const handleFlashToggle = (anim: SavedAnimation, e: React.MouseEvent) => {
    e.stopPropagation();
    const inList = isAnimationInCharacterList(anim);

    if (inList) {
      // Remove / hide from character list
      if (onRemoveAnimationFromCharacterList) {
        onRemoveAnimationFromCharacterList(anim);
      }
      setImportedIds((prev) => {
        const next = new Set(prev);
        next.delete(anim.id);
        return next;
      });
      setRemovedIds((prev) => new Set(prev).add(anim.id));
      setNotification({
        type: 'removed',
        serialNumber: anim.serialNumber,
      });
      setTimeout(() => {
        setNotification((prev) =>
          prev?.serialNumber === anim.serialNumber && prev?.type === 'removed'
            ? null
            : prev
        );
      }, 3500);
    } else {
      // Add into character list
      if (onImportAnimationAsCharacter) {
        onImportAnimationAsCharacter(anim);
      }
      setRemovedIds((prev) => {
        const next = new Set(prev);
        next.delete(anim.id);
        return next;
      });
      setImportedIds((prev) => new Set(prev).add(anim.id));
      setNotification({
        type: 'added',
        serialNumber: anim.serialNumber,
      });
      setTimeout(() => {
        setNotification((prev) =>
          prev?.serialNumber === anim.serialNumber && prev?.type === 'added'
            ? null
            : prev
        );
      }, 3500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Main Modal Container */}
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-10">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800 bg-neutral-950/60">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center">
              <RunnerIcon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Saved Animations</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/30 font-mono">
                  {animations.length}
                </span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {animations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-neutral-800/50 border border-neutral-700/50 mb-3 text-neutral-500">
                <RunnerIcon className="w-12 h-12 opacity-40" />
              </div>
              <p className="text-neutral-300 font-medium text-sm">
                No saved animations yet
              </p>
              <p className="text-neutral-500 text-xs mt-1 font-mono">
                Click the "Save" button in the bottom dock to save Animation 1
              </p>
            </div>
          ) : (
            /* Grid Layout: Mobile 2 items per row, PC 6 items per row */
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              {animations.map((anim) => {
                const singleW = anim.frameWidth || Math.max(1, anim.naturalWidth / anim.frameCount);
                const singleH = anim.frameHeight || Math.max(1, anim.naturalHeight);
                const ratio = singleW / singleH;
                const isSelected = selectedId === anim.id;

                return (
                  <div
                    key={anim.id}
                    onClick={() => {
                      onSelectAnimation(anim);
                      onClose();
                    }}
                    className={`group relative flex flex-col bg-neutral-950/80 rounded-xl border transition-all cursor-pointer overflow-hidden p-2 hover:shadow-xl hover:border-rose-500/70 hover:scale-[1.02] ${
                      isSelected
                        ? "border-rose-500 ring-2 ring-rose-500/30 bg-rose-950/20"
                        : "border-neutral-800"
                    }`}
                  >
                    {/* Top Serial Number Badge & Actions (Top-Right: Flash Icon + Delete) */}
                    <div className="flex items-center justify-between w-full mb-1.5 z-10">
                      {/* Strictly just the serial number: 1, 2, 3... */}
                      <span className="px-2 py-0.5 rounded-lg bg-neutral-800/90 text-white font-mono font-bold text-xs border border-neutral-700/70 shadow-sm flex items-center gap-1">
                        <span>{anim.serialNumber}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                      </span>

                      {/* Top right corner actions: FLASH Icon + Delete Button */}
                      <div className="flex items-center gap-1">
                        {(() => {
                          const isInList = isAnimationInCharacterList(anim);
                          return (
                            <button
                              type="button"
                              onClick={(e) => handleFlashToggle(anim, e)}
                              title={
                                isInList
                                  ? `Animation #${anim.serialNumber} is in Character List (Click Flash to remove / hide)`
                                  : `Add Animation #${anim.serialNumber} to Character List`
                              }
                              className={`p-1.5 rounded-md transition-all cursor-pointer flex items-center justify-center ${
                                isInList
                                  ? "bg-amber-500 text-black border border-amber-400 shadow-md scale-105 hover:bg-amber-400 active:scale-95"
                                  : "bg-neutral-800/90 text-neutral-400 hover:text-amber-400 hover:bg-amber-500/20 hover:scale-110 active:scale-95 border border-neutral-700/60 shadow-sm"
                              }`}
                            >
                              <Zap
                                className={`w-3.5 h-3.5 transition-colors ${
                                  isInList
                                    ? "fill-black text-black"
                                    : "fill-none text-neutral-400 hover:text-amber-400"
                                }`}
                              />
                            </button>
                          );
                        })()}

                        {/* Delete button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setAnimToDelete(anim);
                          }}
                          title="Delete from Firebase"
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-rose-950/80 text-rose-300 hover:text-white hover:bg-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* LIVE ANIMATED PREVIEW BOX (Always actively animating, never stopped!) */}
                    <div className="relative w-full aspect-square bg-neutral-900 rounded-lg overflow-hidden border border-neutral-800 flex items-center justify-center p-1">
                      {/* Checkerboard Pattern for Alpha Sprites */}
                      <div className="absolute inset-0 bg-checker-dark opacity-80 pointer-events-none" />

                      {/* Scaled Frame Box strictly preserving aspect ratio */}
                      <div
                        className="relative overflow-hidden rounded flex items-center justify-start pointer-events-none"
                        style={{
                          width: ratio >= 1 ? "90%" : `${Math.min(90, 90 * ratio)}%`,
                          height: ratio >= 1 ? `${Math.min(90, 90 / ratio)}%` : "90%",
                        }}
                      >
                        {anim.imageUrl ? (
                          /* The Animated Running Sprite Strip */
                          <div
                            className="h-full flex items-center shrink-0"
                            style={{
                              width: `${anim.frameCount * 100}%`,
                              height: "100%",
                              animationName: "run",
                              animationDuration: `${anim.duration}s`,
                              animationTimingFunction: `steps(${anim.frameCount})`,
                              animationIterationCount: "infinite",
                              willChange: "transform",
                            }}
                          >
                            <img
                              src={anim.imageUrl}
                              alt={`Animation ${anim.serialNumber}`}
                              className="w-full h-full object-fill select-none"
                              style={{
                                imageRendering:
                                  anim.naturalHeight <= 64 ? "pixelated" : "auto",
                              }}
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subtle Specs footer */}
                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>{anim.frameCount} steps</span>
                      <span>{anim.duration}s</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Flash Toggle Toast Notification */}
        {notification && (
          <div
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900/95 border ${
              notification.type === 'added' ? 'border-amber-500/60' : 'border-rose-500/60'
            } text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-fade-in text-xs max-w-[90%] backdrop-blur-md`}
          >
            <div
              className={`p-1.5 rounded-lg shrink-0 ${
                notification.type === 'added'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Zap
                className={`w-4 h-4 ${
                  notification.type === 'added'
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-rose-400'
                }`}
              />
            </div>
            <div className="flex flex-col">
              <span
                className={`font-semibold ${
                  notification.type === 'added' ? 'text-amber-300' : 'text-rose-300'
                }`}
              >
                {notification.type === 'added'
                  ? `Animation #${notification.serialNumber} added to Character List!`
                  : `Animation #${notification.serialNumber} removed from Character List.`}
              </span>
              <span className="text-neutral-400 text-[11px]">
                {notification.type === 'added'
                  ? 'Saved permanently. Ready to add to timeline & canvas in original ratio.'
                  : 'Hidden from character list. Click the flash icon anytime to restore it.'}
              </span>
            </div>
            {notification.type === 'added' && onOpenMainCharacterList && (
              <button
                type="button"
                onClick={() => {
                  onOpenMainCharacterList();
                  onClose();
                }}
                className="ml-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold rounded-lg text-xs cursor-pointer transition shadow-md whitespace-nowrap"
              >
                Open in Timeline
              </button>
            )}
          </div>
        )}

        {/* Security Verified Delete Modal with Passcode 686800 */}
        {animToDelete && (
          <ConfirmDeleteModal
            isOpen={true}
            title="Delete Saved Animation"
            itemName={animToDelete.fileName ? animToDelete.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') : `Animation ${animToDelete.serialNumber}`}
            itemType="animation asset"
            description="This will permanently remove the animation from Firebase cloud storage and delete it from your character assets."
            onClose={() => setAnimToDelete(null)}
            onConfirm={() => {
              const targetId = animToDelete.id;
              setAnimToDelete(null);
              onDeleteAnimation(targetId, { stopPropagation: () => {} } as React.MouseEvent);
            }}
          />
        )}
      </div>
    </div>
  );
};
