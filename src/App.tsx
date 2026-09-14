import React, { useState, useEffect, useRef } from 'react';
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

  // Selection & Active Tool States
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [activeLeftTab, setActiveLeftTab] = useState<LeftNavTab>(null);
  const [activeRightTab, setActiveRightTab] = useState<RightNavTab>(null);

  const handleSelectElement = (id: string | null) => {
    setSelectedElementId(id);
    if (id) {
      setSelectedAudioId(null);
      setActiveRightTab('inspector');
    } else {
      if (activeRightTab === 'inspector') {
        setActiveRightTab(null);
      }
    }
  };

  const handleSelectAudio = (id: string | null) => {
    setSelectedAudioId(id);
    if (id) {
      setSelectedElementId(null);
      setActiveRightTab('inspector');
    } else {
      if (activeRightTab === 'inspector') {
        setActiveRightTab(null);
      }
    }
  };

  const handleCloseInspector = () => {
    setSelectedElementId(null);
    setSelectedAudioId(null);
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
        return {
          ...sc,
          elements: [...sc.elements, newElem],
        };
      })
    );
    handleSelectElement(newElem.id);
  };

  const handleAddAudioTrack = (newTrack: AudioTrackItem) => {
    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return {
          ...sc,
          audioTracks: [...sc.audioTracks, newTrack],
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
      duration: 10,
      background: {
        type: 'image',
        value: STOCK_BACKGROUNDS[newSceneIndex % STOCK_BACKGROUNDS.length].url,
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
        zIndex: activeScene.elements.length + 1,
        startTime: 0,
        duration: activeScene.duration,
        animation: 'idle',
        scaleX: 1,
      };

      setScenes(prevScenes =>
        prevScenes.map((sc, idx) => {
          if (idx !== activeSceneIndex) return sc;
          return { ...sc, elements: [...sc.elements, newElem] };
        })
      );
      handleSelectElement(newElem.id);
    } else if (itemType === 'media') {
      const media = itemData as MediaAsset;
      if (media.type === 'audio') {
        // Add to audio tracks
        const newTrack: AudioTrackItem = {
          id: `audio-track-${Date.now()}`,
          name: media.name,
          url: media.url,
          startTime: currentTime,
          duration: media.duration || 5,
          volume: 0.8,
          isMuted: false,
        };
        setScenes(prevScenes =>
          prevScenes.map((sc, idx) => {
            if (idx !== activeSceneIndex) return sc;
            return { ...sc, audioTracks: [...sc.audioTracks, newTrack] };
          })
        );
        handleSelectAudio(newTrack.id);
      } else {
        // If image or video, check if it's a full background or a prop element
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
            zIndex: activeScene.elements.length + 1,
            startTime: currentTime,
            duration: Math.min(activeScene.duration, 8),
          };
          setScenes(prevScenes =>
            prevScenes.map((sc, idx) => {
              if (idx !== activeSceneIndex) return sc;
              return { ...sc, elements: [...sc.elements, newElem] };
            })
          );
          handleSelectElement(newElem.id);
        } else {
          // Set as Scene Background and create/update background layer element
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
            zIndex: 1,
            startTime: 0,
            duration: activeScene.duration,
            isBackground: true,
            locked: false,
            visible: true,
          };

          setScenes(prevScenes =>
            prevScenes.map((sc, idx) => {
              if (idx !== activeSceneIndex) return sc;
              // Replace existing background elements or append
              const filteredElements = sc.elements.filter(e => !e.isBackground);
              return {
                ...sc,
                background: {
                  type: media.type === 'video' ? 'video' : 'image',
                  value: media.url,
                },
                elements: [newBgElem, ...filteredElements],
              };
            })
          );
          handleSelectElement(bgId);
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
      zIndex: activeScene.elements.length + 2,
      startTime: currentTime,
      duration: Math.min(activeScene.duration - currentTime, 6),
    };

    setScenes(prevScenes =>
      prevScenes.map((sc, idx) => {
        if (idx !== activeSceneIndex) return sc;
        return { ...sc, elements: [...sc.elements, newElem] };
      })
    );
    handleSelectElement(newElem.id);
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
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT VERTICAL RAIL (Screenshot 1: Character, Media, Templates, AI badges) */}
        <LeftSidebarRail
          activeTab={activeLeftTab}
          onSelectTab={tab => setActiveLeftTab(tab)}
          onOpenAnimIKStudio={() => {
            setCharacterBeingEdited(DEFAULT_CHARACTERS[0]);
            setIsCharacterStudioOpen(true);
          }}
        />

        {/* WORKSPACE CENTER COLUMN: UPPER WORKSPACE (CANVAS + INSPECTOR) + BOTTOM TIMELINE */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">

          {/* UPPER ROW: Center Canvas Stage + Right Inspector */}
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
              onSelectElement={id => setSelectedElementId(id)}
              onUpdateElement={handleUpdateElement}
              onDeleteElement={handleDeleteElement}
              onDuplicateElement={handleDuplicateElement}
              onDropAssetOnStage={handleDropAssetOnStage}
              zoomScale={zoomScale}
              onChangeZoomScale={setZoomScale}
              canvasRef={canvasStageRef}
              onAddTextElement={() => handleAddTextElement('text')}
              onAddSpeechBubble={() => handleAddTextElement('speechBubble')}
            />

            {/* RIGHT COLUMN: ELEMENT INSPECTOR */}
            {(selectedElement || selectedAudio) && activeRightTab === 'inspector' && (
              <ElementInspector
                element={selectedElement}
                audioTrack={selectedAudio}
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
            )}

          </div>

          {/* Multi-Track Timeline (Screenshot 1) - Anchored at the bottom, spans full width, never moves */}
          <Timeline
            scenes={scenes}
            activeSceneIndex={activeSceneIndex}
            onSelectScene={idx => {
              setActiveSceneIndex(idx);
              setCurrentTime(0);
            }}
            onAddScene={handleAddScene}
            onDeleteScene={handleDeleteScene}
            currentTime={currentTime}
            onSeek={time => setCurrentTime(time)}
            selectedElementId={selectedElementId}
            onSelectElement={id => setSelectedElementId(id)}
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
          />

        </div>

        {/* RIGHT VERTICAL RAIL (Screenshot 1: Asset Library, Effects, Music, Sounds, Tutorials) */}
        <RightSidebarRail
          activeTab={activeRightTab}
          onSelectTab={tab => setActiveRightTab(tab)}
          hasSelectedElement={!!selectedElement}
        />

        {/* FULL-HEIGHT FLOATING POPUP OVERLAY (Opens on top of both Canvas & Timeline - Canvas & Timeline remain 100% stationary and get maximum height for characters) */}
        {activeLeftTab && activeLeftTab !== 'animIK' && (
          <div className="absolute left-[68px] top-0 bottom-0 z-40 flex flex-col shadow-[14px_0_40px_rgba(0,0,0,0.22)] border-r border-slate-200 transition-all duration-200 ease-out">
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
                onDeleteAsset={id => setUserAssets(prev => prev.filter(a => a.id !== id))}
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
