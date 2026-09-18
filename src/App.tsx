import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CharacterModel,
  StageElement,
  Scene,
  ProjectSettings,
  MediaAsset,
  AudioTrackItem,
} from './types';
import { INITIAL_PROJECT, INITIAL_SCENES } from './data/initialData';
import { DEFAULT_CHARACTERS } from './utils/characterPresets';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from './utils/mediaStock';
import { playSyntheticAudio, playUploadedAudio } from './utils/audioEngine';
import { loadCharactersFromCloud } from './services/characterService';
import {
  loadAllMediaAssetsFromCloud,
  deleteMediaAssetFromCloud,
} from './services/mediaAssetService';

// Subcomponents
import { Navbar } from './components/Navbar';
import { LeftSidebarRail, LeftNavTab } from './components/LeftSidebarRail';
import { RightSidebarRail, RightNavTab } from './components/RightSidebarRail';
import { CharacterDrawer } from './components/CharacterDrawer';
import { MediaDrawer } from './components/MediaDrawer';
import { ExtraToolsDrawer } from './components/ExtraToolsDrawer';
import { CanvasStage } from './components/CanvasStage';
import { Timeline } from './components/Timeline';
import { ElementInspector } from './components/ElementInspector';
import { CharacterStudioModal } from './components/CharacterStudioModal';
import { ExportModal } from './components/ExportModal';
import { VoiceoverModal } from './components/VoiceoverModal';

export default function App() {
  // Project & Scenes State
  const [project, setProject] = useState<ProjectSettings>(INITIAL_PROJECT);
  const [scenes, setScenes] = useState<Scene[]>(INITIAL_SCENES);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  // Undo / Redo History Tracking (Up to 80 granular checkpoints)
  const MAX_HISTORY = 80;
  const [history, setHistory] = useState<Scene[][]>([INITIAL_SCENES]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Synchronized refs to avoid stale closures during high-frequency interaction events
  const historyRef = useRef<Scene[][]>([INITIAL_SCENES]);
  const historyIndexRef = useRef<number>(0);
  const scenesRef = useRef<Scene[]>(INITIAL_SCENES);
  const isUndoRedoActionRef = useRef<boolean>(false);
  const isInteractingRef = useRef<boolean>(false);
  const interactionStartScenesRef = useRef<Scene[] | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep scenesRef synchronized with live scenes state
  scenesRef.current = scenes;

  // Push a new snapshot to history
  const pushHistorySnapshot = useCallback((newScenes: Scene[]) => {
    const currentHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    const updated = [...currentHistory, newScenes];
    let finalHistory = updated;
    if (finalHistory.length > MAX_HISTORY) {
      finalHistory = finalHistory.slice(finalHistory.length - MAX_HISTORY);
    }
    const newIdx = finalHistory.length - 1;
    historyRef.current = finalHistory;
    historyIndexRef.current = newIdx;
    setHistory(finalHistory);
    setHistoryIndex(newIdx);
  }, []);

  // Called when user starts an interactive drag, resize, or trim on canvas or timeline
  const handleInteractionStart = useCallback(() => {
    isInteractingRef.current = true;
    // Deep clone current scenes so it acts as an immutable checkpoint prior to user movement
    interactionStartScenesRef.current = JSON.parse(JSON.stringify(scenesRef.current));
  }, []);

  // Called when user finishes the interactive drag, resize, or trim
  const handleInteractionEnd = useCallback(() => {
    if (!isInteractingRef.current) return;
    isInteractingRef.current = false;
    const startScenes = interactionStartScenesRef.current;
    interactionStartScenesRef.current = null;

    if (startScenes) {
      const startStr = JSON.stringify(startScenes);
      const currentStr = JSON.stringify(scenesRef.current);
      if (startStr !== currentStr) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        // Ensure the baseline prior to this drag is stored at current pointer
        historyRef.current[historyIndexRef.current] = startScenes;
        // Now push the final state after the drag as the new checkpoint
        pushHistorySnapshot(scenesRef.current);
      }
    }
  }, [pushHistorySnapshot]);

  // Monitor discrete changes to scenes (outside of active dragging/trimming)
  useEffect(() => {
    if (isUndoRedoActionRef.current) {
      isUndoRedoActionRef.current = false;
      return;
    }
    // If user is actively dragging or resizing on canvas/timeline, do NOT push intermediate micro-steps
    if (isInteractingRef.current) {
      return;
    }

    // Debounce discrete changes (e.g. typing dialogue text or slider adjustments)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      const currentHead = historyRef.current[historyIndexRef.current];
      if (currentHead && JSON.stringify(currentHead) !== JSON.stringify(scenes)) {
        pushHistorySnapshot(scenes);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [scenes, pushHistorySnapshot]);

  const handleUndo = useCallback(() => {
    // If an action was just performed and debounce is pending, commit it first before undoing it
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      const currentHead = historyRef.current[historyIndexRef.current];
      if (currentHead && JSON.stringify(currentHead) !== JSON.stringify(scenesRef.current)) {
        pushHistorySnapshot(scenesRef.current);
      }
    }
    if (historyIndexRef.current > 0) {
      const prevIdx = historyIndexRef.current - 1;
      historyIndexRef.current = prevIdx;
      setHistoryIndex(prevIdx);
      isUndoRedoActionRef.current = true;
      const targetScenes = historyRef.current[prevIdx];
      setScenes(targetScenes);
    }
  }, [pushHistorySnapshot]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      const nextIdx = historyIndexRef.current + 1;
      historyIndexRef.current = nextIdx;
      setHistoryIndex(nextIdx);
      isUndoRedoActionRef.current = true;
      const targetScenes = historyRef.current[nextIdx];
      setScenes(targetScenes);
    }
  }, []);

  // Global Keyboard Shortcuts for Undo (Ctrl+Z) and Redo (Ctrl+Y / Ctrl+Shift+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Characters Library State
  const [characters, setCharacters] = useState<CharacterModel[]>(DEFAULT_CHARACTERS);

  // Load saved cloud characters from Firebase Firestore on startup
  useEffect(() => {
    let isMounted = true;
    async function fetchCloudCharacters() {
      try {
        const cloudChars = await loadCharactersFromCloud();
        if (isMounted && cloudChars && cloudChars.length > 0) {
          setCharacters(prev => {
            const map = new Map<string, CharacterModel>();
            cloudChars.forEach(c => map.set(c.id, c));
            prev.forEach(c => {
              if (!map.has(c.id)) {
                map.set(c.id, c);
              }
            });
            return Array.from(map.values());
          });
        }
      } catch (err) {
        console.warn('Could not load characters from Firebase cloud:', err);
      }
    }
    fetchCloudCharacters();
    return () => {
      isMounted = false;
    };
  }, []);

  // Media Library State (user uploaded + stock)
  const [userAssets, setUserAssets] = useState<MediaAsset[]>([]);

  // Load saved cloud media assets (backgrounds, images, audio, music) from Firebase Firestore & local storage on startup
  useEffect(() => {
    let isMounted = true;
    async function fetchCloudMedia() {
      try {
        const cloudAssets = await loadAllMediaAssetsFromCloud();
        if (isMounted && cloudAssets && cloudAssets.length > 0) {
          setUserAssets(cloudAssets);
        }
      } catch (err) {
        console.warn('Could not load media assets from Firebase cloud:', err);
      }
    }
    fetchCloudMedia();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeleteAsset = async (id: string) => {
    setUserAssets(prev => prev.filter(a => a.id !== id));
    try {
      await deleteMediaAssetFromCloud(id);
    } catch (err) {
      console.warn('Could not delete media asset from cloud:', err);
    }
  };

  // Selection & Active Tool States
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftNavTab>(null);
  const [activeRightTab, setActiveRightTab] = useState<RightNavTab>(null);
  const [isMobileLeftRailOpen, setIsMobileLeftRailOpen] = useState(false);
  const [isMobileRightRailOpen, setIsMobileRightRailOpen] = useState(false);

  // Element & Audio Selection Handlers - Selection does NOT auto-open Properties drawer
  const handleSelectElement = (id: string | null) => {
    setSelectedElementId(id);
    if (id) {
      setSelectedAudioId(null);
    }
  };

  const handleSelectAudio = (id: string | null) => {
    setSelectedAudioId(id);
    if (id) {
      setSelectedElementId(null);
    }
  };

  const handleCloseInspector = () => {
    setActiveRightTab(null);
  };

  // Modals
  const [isCharacterStudioOpen, setIsCharacterStudioOpen] = useState(false);
  const [characterBeingEdited, setCharacterBeingEdited] = useState<CharacterModel | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isVoiceoverModalOpen, setIsVoiceoverModalOpen] = useState(false);

  // Playback State
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);

  // Canvas ref for video export recording
  const canvasStageRef = useRef<HTMLDivElement | null>(null);
  const playbackRafRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number | null>(null);

  const activeScene = scenes[activeSceneIndex] || scenes[0];

  // Playback Loop
  useEffect(() => {
    if (!isPlaying) {
      if (playbackRafRef.current) {
        cancelAnimationFrame(playbackRafRef.current);
        playbackRafRef.current = null;
      }
      lastTickTimeRef.current = null;
      return;
    }

    lastTickTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!lastTickTimeRef.current) lastTickTimeRef.current = now;
      const delta = (now - lastTickTimeRef.current) / 1000;
      lastTickTimeRef.current = now;

      setCurrentTime(prevTime => {
        const nextTime = prevTime + delta;
        if (nextTime >= activeScene.duration) {
          // Check if there is a next scene
          if (activeSceneIndex < scenes.length - 1) {
            setActiveSceneIndex(activeSceneIndex + 1);
            return 0;
          } else {
            // Loop to start
            return 0;
          }
        }
        return nextTime;
      });

      playbackRafRef.current = requestAnimationFrame(loop);
    };

    playbackRafRef.current = requestAnimationFrame(loop);

    return () => {
      if (playbackRafRef.current) cancelAnimationFrame(playbackRafRef.current);
    };
  }, [isPlaying, activeScene.duration, activeSceneIndex, scenes.length]);

  // Audio Playback Triggers during Timeline Playback
  useEffect(() => {
    if (!isPlaying) return;

    // Check if any audio track should start playing at current time
    activeScene.audioTracks.forEach(track => {
      if (!track.isMuted) {
        const isTriggerTime = Math.abs(currentTime - track.startTime) < 0.08;
        if (isTriggerTime) {
          if (track.url.startsWith('audio:')) {
            playSyntheticAudio(track.url, track.volume, false);
          } else {
            playUploadedAudio(track.url, track.volume, false);
          }
        }
      }
    });
  }, [currentTime, isPlaying, activeScene.audioTracks]);

  // --- ELEMENT MUTATION HANDLERS ---
  const handleUpdateElement = (id: string, updates: Partial<StageElement>) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          elements: sc.elements.map(el => (el.id === id ? { ...el, ...updates } : el)),
        };
      })
    );
  };

  const handleDeleteElement = (id: string) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          elements: sc.elements.filter(el => el.id !== id),
        };
      })
    );
    if (selectedElementId === id) handleCloseInspector();
  };

  const handleDuplicateElement = (id: string) => {
    const target = activeScene.elements.find(el => el.id === id);
    if (!target) return;

    const duplicated: StageElement = {
      ...target,
      id: `elem-${Date.now()}`,
      name: `${target.name} Copy`,
      x: Math.min(85, target.x + 5),
      y: Math.min(85, target.y + 5),
      zIndex: target.zIndex + 1,
    };

    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          elements: [...sc.elements, duplicated],
        };
      })
    );
    handleSelectElement(duplicated.id);
  };

  const handleAddElement = (newElem: StageElement) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        const maxZ = Math.max(...sc.elements.map(e => e.zIndex || 0), 0);
        // If trackIndex is not explicitly set, place this new layer at the very top (trackIndex: 0)
        // and push all other existing elements and audio tracks down by 1 line
        const isNewTopLayer = newElem.trackIndex === undefined;
        const targetTrackIndex = isNewTopLayer ? 0 : newElem.trackIndex!;

        const shiftedElements = sc.elements.map((el, elIdx) => ({
          ...el,
          trackIndex: isNewTopLayer
            ? (el.trackIndex !== undefined ? el.trackIndex : elIdx) + 1
            : el.trackIndex,
        }));

        const shiftedAudio = (sc.audioTracks || []).map((tr, trIdx) => ({
          ...tr,
          trackIndex: isNewTopLayer
            ? (tr.trackIndex !== undefined ? tr.trackIndex : trIdx) + 1
            : tr.trackIndex,
        }));

        const elementToAdd: StageElement = {
          ...newElem,
          trackIndex: targetTrackIndex,
          zIndex: newElem.zIndex || (maxZ + 10),
        };

        return {
          ...sc,
          elements: [elementToAdd, ...shiftedElements],
          audioTracks: shiftedAudio,
        };
      })
    );
    handleSelectElement(newElem.id);
  };

  const handleAddAudioTrack = (newTrack: AudioTrackItem) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        const isNewTopLayer = newTrack.trackIndex === undefined;
        const targetTrackIndex = isNewTopLayer ? 0 : newTrack.trackIndex!;

        const shiftedElements = sc.elements.map((el, elIdx) => ({
          ...el,
          trackIndex: isNewTopLayer
            ? (el.trackIndex !== undefined ? el.trackIndex : elIdx) + 1
            : el.trackIndex,
        }));

        const shiftedAudio = (sc.audioTracks || []).map((tr, trIdx) => ({
          ...tr,
          trackIndex: isNewTopLayer
            ? (tr.trackIndex !== undefined ? tr.trackIndex : trIdx) + 1
            : tr.trackIndex,
        }));

        const trackToAdd: AudioTrackItem = {
          ...newTrack,
          trackIndex: targetTrackIndex,
        };

        return {
          ...sc,
          elements: shiftedElements,
          audioTracks: [trackToAdd, ...shiftedAudio],
        };
      })
    );
    handleSelectAudio(newTrack.id);
  };

  const handleUpdateAudioTrack = (id: string, updates: Partial<AudioTrackItem>) => {
    setScenes(prev =>
      prev.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          audioTracks: sc.audioTracks.map(tr => (tr.id === id ? { ...tr, ...updates } : tr)),
        };
      })
    );
  };

  const handleDeleteAudioTrack = (id: string) => {
    if (selectedAudioId === id) handleCloseInspector();
    setScenes(prev =>
      prev.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          audioTracks: sc.audioTracks.filter(tr => tr.id !== id),
        };
      })
    );
  };

  // --- SCENE MUTATION HANDLERS ---
  const handleAddScene = () => {
    const newSceneIndex = scenes.length + 1;
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `Scene ${newSceneIndex}`,
      duration: 120, // 2 minutes automatic
      background: {
        type: 'color',
        value: '#0f172a',
      },
      elements: [],
      audioTracks: [],
    };
    setScenes([...scenes, newScene]);
    setActiveSceneIndex(scenes.length);
    setCurrentTime(0);
  };

  const handleDeleteScene = (index: number) => {
    if (scenes.length <= 1) return;
    const filtered = scenes.filter((_, i) => i !== index);
    setScenes(filtered);
    setActiveSceneIndex(Math.max(0, index - 1));
    setCurrentTime(0);
  };

  const handleUpdateScene = (index: number, updates: Partial<Scene>) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => (idx === index ? { ...sc, ...updates } : sc))
    );
  };

  // Split element or audio track at playhead (exact cut without overlapping extra remainder)
  const handleSplitAtPlayhead = (elementId?: string, atTime?: number) => {
    const splitTime = atTime !== undefined ? atTime : currentTime;
    const currentScene = scenes[activeSceneIndex];
    if (!currentScene) return;

    let targetElement = elementId ? currentScene.elements.find(el => el.id === elementId) : null;
    let targetAudio = selectedAudioId ? currentScene.audioTracks?.find(at => at.id === selectedAudioId) : null;

    if (!targetElement && !targetAudio) {
      targetElement = currentScene.elements.find(
        el => splitTime > el.startTime + 0.05 && splitTime < el.startTime + el.duration - 0.05
      ) || null;
      if (!targetElement) {
        targetAudio = currentScene.audioTracks?.find(
          at => splitTime > at.startTime + 0.05 && splitTime < at.startTime + at.duration - 0.05
        ) || null;
      }
    }

    if (targetElement) {
      const origStart = Math.round(targetElement.startTime * 1000) / 1000;
      const origDuration = Math.round(targetElement.duration * 1000) / 1000;
      const origEnd = origStart + origDuration;

      if (splitTime <= origStart + 0.05 || splitTime >= origEnd - 0.05) {
        return;
      }

      // Exact split point rounded to milliseconds
      const cleanSplitTime = Number(splitTime.toFixed(3));
      const firstDuration = Number((cleanSplitTime - origStart).toFixed(3));
      const secondStartTime = cleanSplitTime; // Part 1 ends and Part 2 starts at the EXACT same millisecond
      const secondDuration = Number((origEnd - cleanSplitTime).toFixed(3));

      if (firstDuration <= 0.05 || secondDuration <= 0.05) return;

      const secondPartId = `elem-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const secondPart: StageElement = {
        ...targetElement,
        id: secondPartId,
        name: `${targetElement.name.replace(/ \(Part \d+\)/, '')} (Part 2)`,
        startTime: secondStartTime,
        duration: secondDuration,
        trackIndex: targetElement.trackIndex ?? 0,
        zIndex: targetElement.zIndex,
      };

      const updatedScenes = scenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          elements: sc.elements.flatMap(el => {
            if (el.id === targetElement!.id) {
              return [{ ...el, startTime: origStart, duration: firstDuration }, secondPart];
            }
            return [el];
          }),
        };
      });

      setScenes(updatedScenes);
      pushHistorySnapshot(updatedScenes);
      handleSelectElement(secondPartId);
    } else if (targetAudio) {
      const origStart = Math.round(targetAudio.startTime * 1000) / 1000;
      const origDuration = Math.round(targetAudio.duration * 1000) / 1000;
      const origEnd = origStart + origDuration;

      if (splitTime <= origStart + 0.05 || splitTime >= origEnd - 0.05) {
        return;
      }

      const cleanSplitTime = Number(splitTime.toFixed(3));
      const firstDuration = Number((cleanSplitTime - origStart).toFixed(3));
      const secondStartTime = cleanSplitTime;
      const secondDuration = Number((origEnd - cleanSplitTime).toFixed(3));

      if (firstDuration <= 0.05 || secondDuration <= 0.05) return;

      const secondPartId = `audio-split-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const secondPart: AudioTrackItem = {
        ...targetAudio,
        id: secondPartId,
        name: `${targetAudio.name.replace(/ \(Part \d+\)/, '')} (Part 2)`,
        startTime: secondStartTime,
        duration: secondDuration,
        trackIndex: targetAudio.trackIndex ?? 0,
      };

      const updatedScenes = scenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          audioTracks: (sc.audioTracks || []).flatMap(at => {
            if (at.id === targetAudio!.id) {
              return [{ ...at, startTime: origStart, duration: firstDuration }, secondPart];
            }
            return [at];
          }),
        };
      });

      setScenes(updatedScenes);
      pushHistorySnapshot(updatedScenes);
      handleSelectAudio(secondPartId);
    }
  };

  // --- DRAG AND DROP ONTO STAGE ---
  const handleDropAssetOnStage = (
    itemType: string,
    itemData: CharacterModel | MediaAsset,
    dropX: number,
    dropY: number
  ) => {
    if (itemType === 'character') {
      const char = itemData as CharacterModel;
      const newElem: StageElement = {
        id: `elem-char-${Date.now()}`,
        name: char.name,
        type: 'character',
        characterData: char,
        x: dropX,
        y: dropY,
        width: 25,
        height: 50,
        zIndex: (activeScene.elements.length + 1) * 10,
        startTime: 0,
        duration: activeScene.duration,
        animation: 'idle',
        scaleX: 1,
      };
      handleAddElement(newElem);
    } else if (itemType === 'media') {
      const media = itemData as MediaAsset;
      if (media.type === 'audio') {
        // Add to audio tracks (at top of timeline)
        const newTrack: AudioTrackItem = {
          id: `audio-track-${Date.now()}`,
          name: media.name,
          url: media.url,
          startTime: currentTime,
          duration: media.duration || 5,
          volume: 0.8,
          isMuted: false,
        };
        handleAddAudioTrack(newTrack);
      } else {
        // If image or video prop
        const isProp = dropX > 15 && dropX < 85 && dropY > 15 && dropY < 85;
        if (isProp && media.type === 'image') {
          const newElem: StageElement = {
            id: `elem-media-${Date.now()}`,
            name: media.name,
            type: 'image',
            mediaUrl: media.url,
            x: dropX,
            y: dropY,
            width: 28,
            height: 28,
            zIndex: (activeScene.elements.length + 1) * 10,
            startTime: currentTime,
            duration: Math.min(activeScene.duration, 8),
          };
          handleAddElement(newElem);
        } else {
          // Add as background element on top layer
          const bgId = `elem-bg-${Date.now()}`;
          const newBgElem: StageElement = {
            id: bgId,
            name: `BG-${activeScene.elements.filter(e => e.isBackground).length + 1}`,
            type: 'image',
            mediaUrl: media.url,
            x: 50,
            y: 50,
            width: 100,
            height: 100,
            zIndex: (activeScene.elements.length + 1) * 10,
            startTime: 0,
            duration: activeScene.duration,
            isBackground: true,
            locked: false,
            visible: true,
          };
          handleAddElement(newBgElem);
        }
      }
    }
  };

  // Add dialogue or text from drawer
  const handleAddTextElement = (type: 'text' | 'speechBubble', customText?: string) => {
    const newElem: StageElement = {
      id: `elem-text-${Date.now()}`,
      name: type === 'speechBubble' ? 'Speech Bubble' : 'Title Text',
      type,
      text: customText || (type === 'speechBubble' ? 'Dialogue text here' : 'Cartoon Title'),
      x: 50,
      y: type === 'speechBubble' ? 30 : 20,
      width: type === 'speechBubble' ? 32 : 45,
      height: type === 'speechBubble' ? 18 : 12,
      bubbleColor: '#ffffff',
      textColor: '#0f172a',
      fontSize: type === 'speechBubble' ? 15 : 24,
      zIndex: (activeScene.elements.length + 1) * 10,
      startTime: currentTime,
      duration: Math.min(activeScene.duration - currentTime, 6),
    };
    handleAddElement(newElem);
  };

  // Drag Start helper for character cards
  const handleDragStartCharacter = (e: React.DragEvent, char: CharacterModel) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'character', data: char })
    );
  };

  // Drag Start helper for media cards
  const handleDragStartMedia = (e: React.DragEvent, media: MediaAsset) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ type: 'media', data: media })
    );
  };

  // Character Save from CharacterStudioModal
  const handleSaveCharacterFromStudio = (updatedChar: CharacterModel) => {
    setCharacters(prev => {
      const exists = prev.some(c => c.id === updatedChar.id);
      if (exists) {
        return prev.map(c => (c.id === updatedChar.id ? updatedChar : c));
      }
      return [updatedChar, ...prev];
    });

    // Also update any elements on stage that use this character
    setScenes(prevScenes =>
      prevScenes.map(sc => ({
        ...sc,
        elements: sc.elements.map(el => {
          if (el.type === 'character' && el.characterData?.id === updatedChar.id) {
            return { ...el, characterData: updatedChar };
          }
          return el;
        }),
      }))
    );
  };

  const selectedElement = activeScene.elements.find(el => el.id === selectedElementId) || null;
  const selectedAudio = activeScene.audioTracks.find(tr => tr.id === selectedAudioId) || null;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#F1F5F9] text-slate-800 font-sans select-none">
      
      {/* 1. TOP NAVBAR (Matches Screenshot 1) */}
      <Navbar
        project={project}
        onUpdateProject={updates => setProject(prev => ({ ...prev, ...updates }))}
        onSave={() => {}}
        onExportClick={() => setIsExportModalOpen(true)}
        onToggleMobileLeftRail={() => {
          setIsMobileLeftRailOpen(prev => {
            const next = !prev;
            if (!next) {
              setActiveLeftTab(null);
            }
            return next;
          });
          setIsMobileRightRailOpen(false);
        }}
        isMobileLeftRailOpen={isMobileLeftRailOpen}
        onToggleMobileRightRail={() => {
          setIsMobileRightRailOpen(prev => !prev);
          setIsMobileLeftRailOpen(false);
          setActiveLeftTab(null);
        }}
        isMobileRightRailOpen={isMobileRightRailOpen}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* DESKTOP LEFT VERTICAL RAIL (Screenshot 1: Character, Media, Templates, AI badges) - Hidden on mobile by default */}
        <div className="hidden md:flex shrink-0">
          <LeftSidebarRail
            activeTab={activeLeftTab}
            onSelectTab={tab => setActiveLeftTab(tab)}
            onOpenAnimIKStudio={() => {
              setCharacterBeingEdited(DEFAULT_CHARACTERS[0]);
              setIsCharacterStudioOpen(true);
            }}
          />
        </div>

        {/* WORKSPACE CENTER COLUMN: UPPER WORKSPACE (CANVAS + INSPECTOR) + BOTTOM TIMELINE */}
        {/* On mobile: takes 100% full screen width by default */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0 w-full">

          {/* UPPER ROW: Center Canvas Stage */}
          <div className="flex-1 flex overflow-hidden min-h-0 min-w-0 relative">
            
            {/* Canvas Stage - Stays 100% full-width and centered, never moves or shifts */}
            <CanvasStage
              scene={activeScene}
              project={project}
              currentTime={currentTime}
              isPlaying={isPlaying}
              onTogglePlay={() => setIsPlaying(!isPlaying)}
              onSeek={time => setCurrentTime(time)}
              selectedElementId={selectedElementId}
              onSelectElement={handleSelectElement}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onDropAssetOnStage={handleDropAssetOnStage}
              zoomScale={zoomScale}
              onChangeZoomScale={setZoomScale}
              canvasRef={canvasStageRef}
              onAddTextElement={() => handleAddTextElement('text')}
              onAddSpeechBubble={() => handleAddTextElement('speechBubble')}
              onUndo={handleUndo}
              onRedo={handleRedo}
              canUndo={historyIndex > 0}
              canRedo={historyIndex < history.length - 1}
              onInteractionStart={handleInteractionStart}
              onInteractionEnd={handleInteractionEnd}
              onSplitAtPlayhead={handleSplitAtPlayhead}
              onOpenProperties={() => setActiveRightTab(activeRightTab === 'inspector' ? null : 'inspector')}
              isPropertiesOpen={activeRightTab === 'inspector'}
            />

          </div>

          {/* Multi-Track Timeline - Anchored at the bottom, spans full width, never moves */}
          <Timeline
            scenes={scenes}
            activeSceneIndex={activeSceneIndex}
            onSelectScene={idx => {
              setActiveSceneIndex(idx);
              setCurrentTime(0);
            }}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            onUpdateScene={handleUpdateScene}
            currentTime={currentTime}
            onSeek={time => setCurrentTime(time)}
            selectedElementId={selectedElementId}
            onSelectElement={handleSelectElement}
            selectedAudioId={selectedAudioId}
            onSelectAudio={handleSelectAudio}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onAddElement={handleAddElement}
            onAddAudioTrack={handleAddAudioTrack}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            zoomScale={zoomScale}
            onChangeZoomScale={setZoomScale}
            onUpdateAudioTrack={handleUpdateAudioTrack}
            onDeleteAudioTrack={handleDeleteAudioTrack}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyIndex > 0}
            canRedo={historyIndex < history.length - 1}
            onInteractionStart={handleInteractionStart}
            onInteractionEnd={handleInteractionEnd}
            onSplitAtPlayhead={handleSplitAtPlayhead}
            onOpenProperties={() => setActiveRightTab(activeRightTab === 'inspector' ? null : 'inspector')}
            isPropertiesOpen={activeRightTab === 'inspector'}
          />

        </div>

        {/* DESKTOP RIGHT VERTICAL RAIL (Screenshot 1: Asset Library, Effects, Music, Sounds, Tutorials) - Hidden on mobile by default */}
        <div className="hidden md:flex shrink-0">
          <RightSidebarRail
            activeTab={activeRightTab}
            onSelectTab={tab => setActiveRightTab(tab)}
            hasSelectedElement={!!(selectedElement || selectedAudio)}
          />
        </div>

        {/* MOBILE FLOATING BACKDROP (Clicking outside closes mobile rails or active drawer) */}
        {(isMobileLeftRailOpen || isMobileRightRailOpen || activeLeftTab || activeRightTab) && (
          <div
            onClick={() => {
              setIsMobileLeftRailOpen(false);
              setIsMobileRightRailOpen(false);
              setActiveLeftTab(null);
              setActiveRightTab(null);
            }}
            className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity backdrop-blur-xs"
          />
        )}

        {/* MOBILE FLOATING LEFT RAIL (Toggled by clicking the website logo on mobile) */}
        {isMobileLeftRailOpen && (
          <div className="md:hidden absolute left-0 top-0 bottom-0 z-50 flex shadow-2xl animate-in slide-in-from-left duration-200">
            <LeftSidebarRail
              activeTab={activeLeftTab}
              onSelectTab={tab => setActiveLeftTab(tab)}
              onOpenAnimIKStudio={() => {
                setCharacterBeingEdited(DEFAULT_CHARACTERS[0]);
                setIsCharacterStudioOpen(true);
              }}
            />
          </div>
        )}

        {/* MOBILE FLOATING RIGHT RAIL (Toggled by clicking the Effect button on top header on mobile) */}
        {isMobileRightRailOpen && (
          <div className="md:hidden absolute right-0 top-0 bottom-0 z-50 flex shadow-2xl animate-in slide-in-from-right duration-200">
            <RightSidebarRail
              activeTab={activeRightTab}
              onSelectTab={tab => setActiveRightTab(tab)}
              hasSelectedElement={!!(selectedElement || selectedAudio)}
            />
          </div>
        )}

        {/* FULL-HEIGHT FLOATING POPUP OVERLAY (Opens on top of both Canvas & Timeline - Canvas & Timeline remain 100% stationary) */}
        {activeLeftTab && activeLeftTab !== 'animIK' && (
          <div
            className="fixed inset-y-0 left-0 z-50 md:absolute md:inset-auto md:left-[68px] md:top-0 md:bottom-0 md:z-30 flex flex-col shadow-2xl border-r border-slate-200 transition-all duration-200 ease-out w-full sm:w-84 md:w-88 max-w-full md:max-w-[calc(100vw-68px)]"
          >
            {/* Character Drawer */}
            {activeLeftTab === 'character' && (
              <CharacterDrawer
                isOpen={true}
                onClose={() => setActiveLeftTab(null)}
                characters={characters}
                onSelectCharacter={char => {
                  handleDropAssetOnStage('character', char, 50, 65);
                }}
                onCreateNewCharacter={() => {
                  setCharacterBeingEdited(null);
                  setIsCharacterStudioOpen(true);
                }}
                onEditCharacter={char => {
                  setCharacterBeingEdited(char);
                  setIsCharacterStudioOpen(true);
                }}
                onDragStartCharacter={handleDragStartCharacter}
              />
            )}

            {/* Media Drawer */}
            {activeLeftTab === 'media' && (
              <MediaDrawer
                isOpen={true}
                onClose={() => setActiveLeftTab(null)}
                userAssets={userAssets}
                onAddAsset={asset => setUserAssets(prev => [asset, ...prev])}
                onDeleteAsset={handleDeleteAsset}
                onApplyBackground={url => {
                  const nextScenes = scenes.map((sc, idx) =>
                    idx === activeSceneIndex ? { ...sc, background: { type: 'image' as const, value: url } } : sc
                  );
                  setScenes(nextScenes);
                  pushHistorySnapshot(nextScenes);
                }}
                onSelectAssetForStage={asset => {
                  handleDropAssetOnStage('media', asset, 50, 50);
                }}
                onDragStartMedia={handleDragStartMedia}
                onOpenAIVoiceModal={() => setIsVoiceoverModalOpen(true)}
              />
            )}

            {/* Extra Tools (Text, Templates, AI Generation) */}
            {activeLeftTab !== 'character' && activeLeftTab !== 'media' && (
              <ExtraToolsDrawer
                activeTab={activeLeftTab}
                onClose={() => setActiveLeftTab(null)}
                onAddTextElement={handleAddTextElement}
                onApplyBackground={url => {
                  setScenes(prevScenes =>
                    prevScenes.map((sc, idx) =>
                      idx === activeSceneIndex ? { ...sc, background: { type: 'image', value: url } } : sc
                    )
                  );
                }}
                onAddGeneratedAsset={asset => setUserAssets(prev => [asset, ...prev])}
              />
            )}
          </div>
        )}

        {/* FULL-HEIGHT FLOATING PROPERTIES DRAWER (Spans entire height, all-device responsive, never cut off by timeline) */}
        {activeRightTab === 'inspector' && (
          <div
            className="fixed inset-y-0 right-0 z-50 md:absolute md:inset-auto md:right-[68px] md:top-0 md:bottom-0 md:z-30 flex flex-col shadow-2xl border-l border-slate-200 transition-all duration-200 ease-out w-full sm:w-88 md:w-96 max-w-full md:max-w-[calc(100vw-68px)] bg-white"
          >
            <ElementInspector
              element={selectedElement}
              audioTrack={selectedAudio}
              scene={activeScene}
              project={project}
              onUpdateScene={updates => handleUpdateScene(activeSceneIndex, updates)}
              onSelectElement={handleSelectElement}
              onSelectAudioTrack={handleSelectAudio}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onOpenCharacterStudioForEdit={char => {
                setCharacterBeingEdited(char);
                setIsCharacterStudioOpen(true);
              }}
              onUpdateAudioTrack={handleUpdateAudioTrack}
              onDeleteAudioTrack={handleDeleteAudioTrack}
              onClose={handleCloseInspector}
            />
          </div>
        )}

      </div>

      {/* 3. CHARACTER STUDIO / IK RIGGING MODAL (Screenshot 4 & 5) */}
      {isCharacterStudioOpen && (
        <CharacterStudioModal
          isOpen={isCharacterStudioOpen}
          onClose={() => setIsCharacterStudioOpen(false)}
          initialCharacter={characterBeingEdited}
          onSaveCharacter={handleSaveCharacterFromStudio}
        />
      )}

      {/* 4. MP4 VIDEO EXPORT MODAL */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          scene={activeScene}
          scenes={scenes}
          activeSceneIndex={activeSceneIndex}
          project={project}
        />
      )}

      {/* 5. VOICEOVER / TTS MODAL */}
      {isVoiceoverModalOpen && (
        <VoiceoverModal
          isOpen={isVoiceoverModalOpen}
          onClose={() => setIsVoiceoverModalOpen(false)}
          onAddAudio={audio => {
            // Add to user assets and timeline
            setUserAssets(prev => [audio, ...prev]);
            const newTrack: AudioTrackItem = {
              id: `audio-voice-${Date.now()}`,
              name: audio.name,
              url: audio.url,
              startTime: currentTime,
              duration: audio.duration || 4,
              volume: 0.9,
              isMuted: false,
            };
            setScenes(prevScenes =>
              prevScenes.map((sc, idx) => {
                if (idx !== activeSceneIndex) return sc;
                return { ...sc, audioTracks: [...sc.audioTracks, newTrack] };
              })
            );
          }}
        />
      )}

    </div>
  );
}
