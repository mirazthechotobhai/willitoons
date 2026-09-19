import React, { useState, useRef, useEffect } from 'react';
import { Scene, ProjectSettings, StageElement, CharacterModel } from '../types';
import confetti from 'canvas-confetti';
import {
  X,
  Film,
  Download,
  CheckCircle2,
  Loader2,
  Sparkles,
  Play,
  RotateCcw,
  Volume2,
  Layers,
  MonitorPlay,
} from 'lucide-react';
import { getAudioDestinationStream, playSyntheticAudio, playUploadedAudio } from '../utils/audioEngine';
import { renderCharacterSvgString } from '../utils/characterSvgRenderer';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  scene: Scene;
  scenes?: Scene[];
  activeSceneIndex?: number;
  project: ProjectSettings;
}

// Helper to wrap text inside speech bubbles
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  if (!text) return;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = currentLine ? currentLine + ' ' + words[n] : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine !== '') {
      lines.push(currentLine);
      currentLine = words[n];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });
}

// Preload standard images (backgrounds, props, stickers)
function preloadImage(url: string): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Retry without crossOrigin in case CORS header is missing
      const img2 = new Image();
      img2.onload = () => resolve(img2);
      img2.onerror = () => resolve(null);
      img2.src = url;
    };
    img.src = url;
  });
}

/**
 * Calculates the exact duration occupied by layers (visual elements and audio tracks)
 * on the timeline so export matches the user's added layers.
 */
export const getEffectiveSceneDuration = (sc: Scene): number => {
  const layerEndTimes: number[] = [
    ...sc.elements.map(e => (e.startTime || 0) + (e.duration || 0)),
    ...(sc.audioTracks || []).map(a => (a.startTime || 0) + (a.duration || 0)),
  ];

  if (layerEndTimes.length > 0) {
    const maxEnd = Math.max(...layerEndTimes);
    if (maxEnd > 0) {
      return Math.max(0.5, Math.round(maxEnd * 100) / 100);
    }
  }

  return sc.duration || 5;
};

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  scene,
  scenes = [scene],
  activeSceneIndex = 0,
  project,
}) => {
  const [exportScope, setExportScope] = useState<'current' | 'all'>('current');
  const [format, setFormat] = useState<'mp4' | 'webm'>('mp4');
  const [resolution, setResolution] = useState<'1080p' | '720p' | '480p'>('1080p');
  const [fps, setFps] = useState<24 | 30 | 60>(30);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState('');

  // Dual Canvas: hidden high-res master recording canvas + visible live preview canvas
  const recordingCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const livePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  if (!isOpen) return null;

  // Compute total duration depending on scope based on actual layer duration on timeline
  const targetScenes = exportScope === 'all' && scenes && scenes.length > 0 ? scenes : [scene];
  const totalDuration = targetScenes.reduce((acc, sc) => acc + getEffectiveSceneDuration(sc), 0);

  const handleCancelExport = () => {
    isCancelledRef.current = true;
    setIsExporting(false);
    setStatusMessage('Export cancelled');
  };

  const startExport = async () => {
    setIsExporting(true);
    isCancelledRef.current = false;
    setProgress(0);
    setDownloadUrl(null);
    setStatusMessage('Initializing vector renderer and assets...');

    const resMap = {
      '1080p': { width: 1920, height: 1080 },
      '720p': { width: 1280, height: 720 },
      '480p': { width: 854, height: 480 },
    };
    const { width: targetWidth, height: targetHeight } = resMap[resolution];

    // Master render canvas
    const canvas = recordingCanvasRef.current || document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      alert('Could not initialize canvas graphics context');
      setIsExporting(false);
      return;
    }

    // Live preview canvas
    const previewCanvas = livePreviewCanvasRef.current;
    const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;

    try {
      // 1. Preload all background images and media element images across target scenes
      setStatusMessage('Preloading scene media & images...');
      const imageAssets = new Map<string, HTMLImageElement>();

      for (const sc of targetScenes) {
        if (sc.background.type === 'image' && sc.background.value) {
          if (!imageAssets.has(sc.background.value)) {
            const img = await preloadImage(sc.background.value);
            if (img) imageAssets.set(sc.background.value, img);
          }
        }
        for (const el of sc.elements) {
          if (el.mediaUrl && !imageAssets.has(el.mediaUrl)) {
            const img = await preloadImage(el.mediaUrl);
            if (img) imageAssets.set(el.mediaUrl, img);
          }
        }
      }

      // 2. Pre-generate Character SVG frames (so rendering during playback is smooth & 100% vector-accurate)
      setStatusMessage('Synthesizing character SVG vector rigs...');
      const characterSvgCache = new Map<string, HTMLImageElement>();

      for (const sc of targetScenes) {
        for (const el of sc.elements) {
          if (el.type === 'character' && el.characterData) {
            const model = el.characterData;
            const anim = el.animation || 'idle';
            const lipSync = !!el.isLipSyncing || anim === 'talk';

            // Pre-generate 30 key animation frames for this character
            for (let f = 0; f < 60; f += 2) {
              const key = `${model.id}_${anim}_${f}_${lipSync ? 1 : 0}`;
              if (!characterSvgCache.has(key)) {
                const svgStr = renderCharacterSvgString(model, anim, f, lipSync, false);
                await new Promise<void>(resolve => {
                  const img = new Image();
                  img.onload = () => {
                    characterSvgCache.set(key, img);
                    resolve();
                  };
                  img.onerror = () => resolve();
                  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
                });
              }
            }
          }
        }
      }

      // 3. MediaRecorder Setup with Web Audio Destination
      setStatusMessage('Configuring video container & audio mixer...');
      const stream = canvas.captureStream(fps);
      const audioStream = getAudioDestinationStream();
      if (audioStream) {
        audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
      }

      let mimeType = 'video/webm;codecs=vp9,opus';
      if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
        mimeType = 'video/mp4;codecs=avc1';
      } else if (format === 'mp4' && MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
        mimeType = 'video/webm;codecs=vp9';
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        mimeType = 'video/webm';
      }

      const recordedChunks: Blob[] = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: resolution === '1080p' ? 8000000 : 4000000,
      });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };

      mediaRecorder.start(100);

      // Track active audio stops so they can be cleaned up
      const activeAudioStops: Array<{ stop: () => void }> = [];
      const triggeredAudioIds = new Set<string>();

      // 4. Sequential Frame Rendering Loop
      const totalFrames = Math.max(1, Math.round(totalDuration * fps));
      const frameIntervalMs = 1000 / fps;
      let currentTotalFrame = 0;

      // Map accumulated scene start times based on timeline layers
      const sceneTimeline: Array<{ scene: Scene; startTime: number; endTime: number; duration: number }> = [];
      let accumulatedTime = 0;
      for (const sc of targetScenes) {
        const scDur = getEffectiveSceneDuration(sc);
        sceneTimeline.push({
          scene: sc,
          startTime: accumulatedTime,
          endTime: accumulatedTime + scDur,
          duration: scDur,
        });
        accumulatedTime += scDur;
      }

      const renderIntervalId = setInterval(() => {
        if (isCancelledRef.current) {
          clearInterval(renderIntervalId);
          mediaRecorder.stop();
          activeAudioStops.forEach(a => a.stop());
          return;
        }

        currentTotalFrame++;
        const globalTime = currentTotalFrame / fps;
        const progressPct = Math.min(99, Math.round((currentTotalFrame / totalFrames) * 100));
        setProgress(progressPct);

        // Find active scene
        const currentSceneEntry =
          sceneTimeline.find(entry => globalTime >= entry.startTime && globalTime < entry.endTime) ||
          sceneTimeline[sceneTimeline.length - 1];

        const activeSc = currentSceneEntry.scene;
        const sceneLocalTime = Math.max(0, globalTime - currentSceneEntry.startTime);

        setStatusMessage(
          `Recording ${activeSc.name || 'Scene'} (${progressPct}%) — ${sceneLocalTime.toFixed(1)}s / ${currentSceneEntry.duration.toFixed(1)}s`
        );

        // --- A. AUDIO TRIGGER CHECK ---
        activeSc.audioTracks.forEach(track => {
          if (track.isMuted) return;
          const trackUniqueKey = `${activeSc.id}_${track.id}`;
          const isTriggerPoint =
            sceneLocalTime >= track.startTime &&
            sceneLocalTime < track.startTime + 0.12 &&
            !triggeredAudioIds.has(trackUniqueKey);

          if (isTriggerPoint) {
            triggeredAudioIds.add(trackUniqueKey);
            if (track.url.startsWith('audio:')) {
              const audioHandle = playSyntheticAudio(track.url, track.volume ?? 0.8, false);
              activeAudioStops.push(audioHandle);
            } else {
              const audioHandle = playUploadedAudio(track.url, track.volume ?? 0.8, false);
              activeAudioStops.push(audioHandle);
            }
          }
        });

        // --- B. DRAW CANVAS BACKGROUND & CAMERA LAYER TRANSFORM ---
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const activeCamera = activeSc.elements.find(
          el =>
            el.type === 'camera' &&
            el.visible !== false &&
            sceneLocalTime >= el.startTime &&
            sceneLocalTime <= el.startTime + el.duration
        );

        ctx.save();
        if (activeCamera) {
          let cx = (activeCamera.x / 100) * targetWidth;
          let cy = (activeCamera.y / 100) * targetHeight;
          let cw = activeCamera.width;
          let camFlipX = activeCamera.scaleX === -1 ? -1 : 1;

          if (activeCamera.hasCameraMotion) {
            const rawProgress = Math.max(
              0,
              Math.min(1, (sceneLocalTime - activeCamera.startTime) / Math.max(0.1, activeCamera.duration))
            );
            const t = activeCamera.cameraMotion === 'cut' ? (rawProgress < 0.5 ? 0 : 1) : rawProgress;

            const startX = activeCamera.x;
            const startY = activeCamera.y;
            const startW = activeCamera.width;
            const startFlip = activeCamera.scaleX === -1;

            const endX = activeCamera.cameraTargetX ?? Math.min(95, startX + 7);
            const endY = activeCamera.cameraTargetY ?? Math.min(95, startY + 7);
            const endW = activeCamera.cameraTargetWidth ?? startW;
            const endFlip = (activeCamera.cameraTargetScaleX ?? (activeCamera.scaleX || 1)) === -1;

            const curX = startX + (endX - startX) * t;
            const curY = startY + (endY - startY) * t;
            cw = startW + (endW - startW) * t;
            camFlipX = (rawProgress >= 0.5 ? endFlip : startFlip) ? -1 : 1;
            cx = (curX / 100) * targetWidth;
            cy = (curY / 100) * targetHeight;
          }

          const camScale = 100 / Math.max(1, cw);
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.scale(camFlipX * camScale, camScale);
          ctx.translate(-cx, -cy);
        }

        if (activeSc.background.type === 'color') {
          ctx.fillStyle = activeSc.background.value || '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        } else if (activeSc.background.type === 'image' && activeSc.background.value) {
          const bgImg = imageAssets.get(activeSc.background.value);
          if (bgImg) {
            ctx.drawImage(bgImg, 0, 0, targetWidth, targetHeight);
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
          }
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetWidth, targetHeight);
        }

        // --- C. DRAW ACTIVE BACKGROUND ELEMENTS (isBackground = true) ---
        activeSc.elements
          .filter(el => el.isBackground && el.visible !== false)
          .forEach(bgEl => {
            if (bgEl.mediaUrl) {
              const img = imageAssets.get(bgEl.mediaUrl);
              if (img) {
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
              }
            }
          });

        // --- D. DRAW ACTIVE TIMELINE ELEMENTS (Sorted by zIndex) ---
        const activeElements = activeSc.elements
          .filter(
            el =>
              !el.isBackground &&
              el.visible !== false &&
              el.type !== 'camera' &&
              sceneLocalTime >= el.startTime &&
              sceneLocalTime <= el.startTime + el.duration
          )
          .sort((a, b) => a.zIndex - b.zIndex);

        const animFrameIndex = (currentTotalFrame * 2) % 60;
        const normalizedFrame = Math.floor(animFrameIndex / 2) * 2;

        activeElements.forEach(el => {
          const posX = (el.x / 100) * targetWidth;
          const posY = (el.y / 100) * targetHeight;
          const w = (el.width / 100) * targetWidth;
          const h = (el.height / 100) * targetHeight;

          ctx.save();
          ctx.translate(posX, posY);
          ctx.rotate(((el.rotation || 0) * Math.PI) / 180);

          if (el.scaleX === -1) {
            ctx.scale(-1, 1);
          }

          ctx.globalAlpha = el.opacity ?? 1;

          // 1. CHARACTER VECTOR PUPPET
          if (el.type === 'character' && el.characterData) {
            const anim = el.animation || 'idle';
            const lipSync = !!el.isLipSyncing || anim === 'talk';
            const cacheKey = `${el.characterData.id}_${anim}_${normalizedFrame}_${lipSync ? 1 : 0}`;
            let charImg = characterSvgCache.get(cacheKey);

            if (!charImg) {
              // Fallback to first available cached frame for this character
              for (const [k, v] of characterSvgCache.entries()) {
                if (k.startsWith(el.characterData.id)) {
                  charImg = v;
                  break;
                }
              }
            }

            if (charImg) {
              ctx.drawImage(charImg, -w / 2, -h / 2, w, h);
            }
          }

          // 2. IMAGE ASSETS & PROPS & STICKERS
          else if (el.type === 'image' && el.mediaUrl) {
            const img = imageAssets.get(el.mediaUrl);
            if (img) {
              const naturalW = img.naturalWidth || img.width || 1;
              const naturalH = img.naturalHeight || img.height || 1;
              const imgRatio = naturalW / naturalH;
              const boxRatio = w / h;

              if (el.fitMode === 'cover' || (el.isBackground && el.fitMode !== 'contain')) {
                let sx = 0, sy = 0, sw = naturalW, sh = naturalH;
                if (imgRatio > boxRatio) {
                  sw = naturalH * boxRatio;
                  sx = (naturalW - sw) / 2;
                } else {
                  sh = naturalW / boxRatio;
                  sy = (naturalH - sh) / 2;
                }
                ctx.drawImage(img, sx, sy, sw, sh, -w / 2, -h / 2, w, h);
              } else if (el.fitMode === 'contain' || !el.isBackground) {
                let dw = w, dh = h;
                if (imgRatio > boxRatio) {
                  dh = w / imgRatio;
                } else {
                  dw = h * imgRatio;
                }
                ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
              } else {
                ctx.drawImage(img, -w / 2, -h / 2, w, h);
              }
            }
          }

          // 3. VIDEO ASSETS
          else if (el.type === 'video' && el.mediaUrl) {
            const img = imageAssets.get(el.mediaUrl);
            if (img) {
              ctx.drawImage(img, -w / 2, -h / 2, w, h);
            } else {
              ctx.fillStyle = '#0f172a';
              ctx.fillRect(-w / 2, -h / 2, w, h);
            }
          }

          // 4. SPEECH BUBBLE WITH COMIC TAIL & WRAPPED TEXT
          else if (el.type === 'speechBubble') {
            const bubbleW = w;
            const bubbleH = h * 0.82;
            const radius = Math.min(24, bubbleH * 0.25);

            // Bubble body
            ctx.fillStyle = el.bubbleColor || '#ffffff';
            ctx.strokeStyle = '#0f172a';
            ctx.lineWidth = Math.max(2, Math.round(targetHeight * 0.003));
            ctx.beginPath();
            ctx.roundRect(-bubbleW / 2, -bubbleH / 2 - h * 0.06, bubbleW, bubbleH, radius);
            ctx.fill();
            ctx.stroke();

            // Comic pointer tail pointing downwards
            ctx.beginPath();
            ctx.moveTo(-bubbleW * 0.06, bubbleH / 2 - h * 0.06);
            ctx.lineTo(0, h / 2);
            ctx.lineTo(bubbleW * 0.06, bubbleH / 2 - h * 0.06);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Text inside bubble
            ctx.fillStyle = el.textColor || '#0f172a';
            const scaledFontSize = Math.max(13, Math.round((el.fontSize || 16) * (targetHeight / 540)));
            ctx.font = `bold ${scaledFontSize}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            wrapText(
              ctx,
              el.text || '',
              0,
              -h * 0.06,
              bubbleW * 0.88,
              scaledFontSize * 1.3
            );
          }

          // 5. TEXT ELEMENT WITH SHADOW & FORMATTING
          else if (el.type === 'text') {
            ctx.fillStyle = el.textColor || '#ffffff';
            const scaledFontSize = Math.max(16, Math.round((el.fontSize || 24) * (targetHeight / 540)));
            ctx.font = `800 ${scaledFontSize}px "Plus Jakarta Sans", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.shadowBlur = Math.round(targetHeight * 0.008);
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = Math.round(targetHeight * 0.003);
            ctx.fillText(el.text || 'Add Text', 0, 0);
            ctx.shadowColor = 'transparent';
          }

          // 6. VISUAL EFFECT (Vignette, Cinema Bars, Sunlight)
          else if (el.type === 'effect') {
            if (el.effectType === 'vignette') {
              const radGrad = ctx.createRadialGradient(
                0,
                0,
                targetWidth * 0.25,
                0,
                0,
                targetWidth * 0.55
              );
              radGrad.addColorStop(0, 'rgba(0,0,0,0)');
              radGrad.addColorStop(1, 'rgba(0,0,0,0.75)');
              ctx.fillStyle = radGrad;
              ctx.fillRect(-w / 2, -h / 2, w, h);
            } else if (el.effectType === 'cinema') {
              ctx.fillStyle = '#000000';
              const barH = targetHeight * 0.12;
              ctx.fillRect(-w / 2, -h / 2, w, barH);
              ctx.fillRect(-w / 2, h / 2 - barH, w, barH);
            } else {
              // Sunlight glow overlay
              const sunGrad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
              sunGrad.addColorStop(0, 'rgba(251, 191, 36, 0.25)');
              sunGrad.addColorStop(0.5, 'rgba(249, 115, 22, 0.1)');
              sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = sunGrad;
              ctx.fillRect(-w / 2, -h / 2, w, h);
            }
          }

          ctx.restore();
        });

        // Restore camera frame transform
        ctx.restore();

        // --- E. UPDATE LIVE PREVIEW CANVAS IN MODAL ---
        if (previewCanvas && previewCtx) {
          previewCtx.drawImage(canvas, 0, 0, previewCanvas.width, previewCanvas.height);
        }

        // --- F. CHECK COMPLETION ---
        if (currentTotalFrame >= totalFrames) {
          clearInterval(renderIntervalId);
          setStatusMessage('Finalizing MP4 media encoding...');
          setProgress(100);

          setTimeout(() => {
            mediaRecorder.stop();
            mediaRecorder.onstop = () => {
              activeAudioStops.forEach(a => a.stop());
              const videoBlob = new Blob(recordedChunks, {
                type: format === 'mp4' ? 'video/mp4' : 'video/webm',
              });
              const url = URL.createObjectURL(videoBlob);
              const sanitizedTitle = (project.title || 'cartoon')
                .toLowerCase()
                .replace(/[^a-z0-9]/g, '_');
              const safeFilename = `${sanitizedTitle}_${exportScope === 'all' ? 'full_project' : 'scene'}_${resolution}.${format}`;

              setDownloadUrl(url);
              setDownloadFilename(safeFilename);
              setIsExporting(false);
              setStatusMessage('Export completed successfully!');

              // Launch celebratory confetti
              try {
                confetti({
                  particleCount: 90,
                  spread: 75,
                  origin: { y: 0.6 },
                });
              } catch {
                /* ignore */
              }
            };
          }, 350);
        }
      }, frameIntervalMs);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setStatusMessage('Export error: ' + String(err));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 select-none animate-in fade-in duration-200">
      {/* Hidden Master Canvas used for high-resolution video rendering */}
      <canvas ref={recordingCanvasRef} className="hidden" />

      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export Cartoon Video</h3>
              <p className="text-xs text-slate-500">
                Exports exactly what is placed on your timeline & canvas
              </p>
            </div>
          </div>

          <button
            onClick={isExporting ? handleCancelExport : onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* LIVE RECORDING MONITOR (Visible during export and preview) */}
          <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden shadow-inner border border-slate-800 flex items-center justify-center">
            <canvas
              ref={livePreviewCanvasRef}
              width={480}
              height={270}
              className="w-full h-full object-contain"
            />

            {!isExporting && !downloadUrl && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-[2px] text-white p-4 text-center">
                <MonitorPlay className="w-10 h-10 text-blue-400 mb-2 opacity-90" />
                <p className="text-sm font-semibold">Canvas & Timeline Live Capture Ready</p>
                <p className="text-xs text-slate-300 mt-1 max-w-sm">
                  All characters with their animations, dialogues, images, props, and synchronized audio tracks will be recorded.
                </p>
              </div>
            )}

            {isExporting && (
              <div className="absolute top-3 left-3 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-md flex items-center space-x-1.5 shadow-md">
                <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                <span>RECORDING LIVE</span>
              </div>
            )}
          </div>

          {/* Scope Selection: Current Scene vs All Scenes */}
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
              Export Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isExporting}
                onClick={() => setExportScope('current')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'current'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs flex items-center space-x-1.5">
                  <Film className="w-3.5 h-3.5" />
                  <span>Current Scene ({scene.name || `Scene ${activeSceneIndex + 1}`})</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Duration: {getEffectiveSceneDuration(scene).toFixed(1).replace(/\.0$/, '')}s · {scene.elements.length} elements
                </div>
              </button>

              <button
                type="button"
                disabled={isExporting}
                onClick={() => setExportScope('all')}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  exportScope === 'all'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500/20 shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="font-bold text-xs flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Full Project (All {scenes.length} Scenes)</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Total Duration: {totalDuration.toFixed(1).replace(/\.0$/, '')}s
                </div>
              </button>
            </div>
          </div>

          {/* Format & Resolution Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Format Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                Container Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'mp4', label: 'MP4 Video', desc: 'Universal' },
                  { id: 'webm', label: 'WebM Video', desc: 'High Quality' },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFormat(item.id as 'mp4' | 'webm')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      format === item.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs">{item.label}</div>
                    <div className="text-[10px] text-slate-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">
                Resolution
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: '1080p', label: '1080p' },
                  { id: '720p', label: '720p' },
                  { id: '480p', label: '480p' },
                ].map(r => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setResolution(r.id as '1080p' | '720p' | '480p')}
                    className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer ${
                      resolution === r.id
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="text-xs font-semibold">{r.label}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Progress / Status Display */}
          {isExporting && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center space-x-2 text-blue-600">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="truncate">{statusMessage}</span>
                </span>
                <span className="font-mono text-slate-700 font-bold ml-2">{progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-150"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Completed Video Player & Download Button */}
          {downloadUrl && !isExporting && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-center space-x-2 text-emerald-800 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Video Ready: {downloadFilename}</span>
              </div>

              {/* Preview Video player */}
              <div className="w-full h-44 bg-black rounded-lg overflow-hidden border border-emerald-300">
                <video src={downloadUrl} controls autoPlay className="w-full h-full object-contain" />
              </div>

              <a
                href={downloadUrl}
                download={downloadFilename}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {format.toUpperCase()} Video</span>
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50">
          <div className="text-[11px] text-slate-500">
            Export Time: <span className="text-slate-800 font-bold">{totalDuration.toFixed(1).replace(/\.0$/, '')}s</span> · {resolution} ·{' '}
            {fps} FPS
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={isExporting ? handleCancelExport : onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              {isExporting ? 'Cancel' : 'Close'}
            </button>

            {!downloadUrl && (
              <button
                onClick={startExport}
                disabled={isExporting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Export Video</span>
                  </>
                )}
              </button>
            )}

            {downloadUrl && !isExporting && (
              <button
                onClick={() => {
                  setDownloadUrl(null);
                  startExport();
                }}
                className="flex items-center space-x-1.5 px-3 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Export</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
