import React, { useState, useRef, useEffect } from 'react';
import { MediaAsset } from '../types';
import {
  Mic,
  Square,
  Play,
  Volume2,
  Sparkles,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

interface VoiceoverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAudio: (audio: MediaAsset) => void;
}

export const VoiceoverModal: React.FC<VoiceoverModalProps> = ({
  isOpen,
  onClose,
  onAddAudio,
}) => {
  const [mode, setMode] = useState<'record' | 'tts'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [ttsText, setTtsText] = useState('Hello friends! Welcome to my cartoon animation studio!');
  const [selectedVoice, setSelectedVoice] = useState('cartoon-kid');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  if (!isOpen) return null;

  // START MIC RECORDING
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start(100);
      setIsRecording(true);
      setRecordDuration(0);

      timerRef.current = window.setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Microphone access denied or not available: ' + String(err));
    }
  };

  // STOP MIC RECORDING
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  // PREVIEW TTS
  const previewTTS = () => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(ttsText);
    if (selectedVoice === 'cartoon-kid') {
      utterance.pitch = 1.6;
      utterance.rate = 1.1;
    } else if (selectedVoice === 'cartoon-deep') {
      utterance.pitch = 0.6;
      utterance.rate = 0.9;
    } else if (selectedVoice === 'robot') {
      utterance.pitch = 1.0;
      utterance.rate = 0.8;
    }
    window.speechSynthesis.speak(utterance);
  };

  // SAVE ASSET TO PROJECT
  const handleSaveToProject = () => {
    if (mode === 'record' && recordedAudioUrl) {
      const newAudio: MediaAsset = {
        id: `voice-rec-${Date.now()}`,
        name: `Voiceover Recording (${recordDuration}s)`,
        type: 'audio',
        url: recordedAudioUrl,
        duration: recordDuration || 3,
        category: 'Voice',
        thumbnail: '🎙️',
      };
      onAddAudio(newAudio);
      onClose();
    } else if (mode === 'tts' && ttsText.trim()) {
      // Create synthesized synthetic speech asset
      const newAudio: MediaAsset = {
        id: `voice-tts-${Date.now()}`,
        name: `Voice: "${ttsText.substring(0, 20)}..."`,
        type: 'audio',
        url: 'audio:pop', // Can trigger speech synthesis during playback
        duration: Math.max(2, Math.round(ttsText.split(' ').length * 0.4)),
        category: 'Voice',
        thumbnail: '🗣️',
      };
      onAddAudio(newAudio);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 select-none">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col text-slate-800">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Voice & Dialogue Studio</h3>
              <p className="text-xs text-slate-500">Record your microphone or generate cartoon speech</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            onClick={() => setMode('record')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              mode === 'record'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Mic className="w-4 h-4" />
            <span>Record Voice</span>
          </button>

          <button
            onClick={() => setMode('tts')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center space-x-2 transition-colors cursor-pointer ${
              mode === 'tts'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Cartoon Voice</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          {mode === 'record' ? (
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              
              {/* Record Button with Animated Rings */}
              <div className="relative">
                {isRecording && (
                  <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer z-10 relative ${
                    isRecording
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8 fill-current" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </button>
              </div>

              {/* Status / Timer */}
              <div className="text-center">
                <div className="text-sm font-bold text-slate-800">
                  {isRecording ? 'Recording in progress...' : recordedAudioUrl ? 'Recording complete!' : 'Click to start speaking'}
                </div>
                <div className="text-xs font-mono text-slate-500 mt-1">
                  {String(Math.floor(recordDuration / 60)).padStart(2, '0')}:
                  {String(recordDuration % 60).padStart(2, '0')}
                </div>
              </div>

              {/* Audio Preview playback */}
              {recordedAudioUrl && !isRecording && (
                <div className="w-full mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center space-x-3">
                  <audio src={recordedAudioUrl} controls className="w-full h-8" />
                  <button
                    onClick={() => {
                      setRecordedAudioUrl(null);
                      setRecordDuration(0);
                    }}
                    className="p-2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    title="Record again"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          ) : (
            /* TTS Mode */
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Dialogue / Script
                </label>
                <textarea
                  rows={3}
                  value={ttsText}
                  onChange={e => setTtsText(e.target.value)}
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 resize-none shadow-xs"
                  placeholder="Type words for your cartoon character to say..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1.5">
                  Cartoon Pitch & Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'cartoon-kid', label: 'High Pitch Kid' },
                    { id: 'cartoon-deep', label: 'Deep Hero' },
                    { id: 'robot', label: 'Robotic' },
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedVoice(style.id)}
                      className={`p-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
                        selectedVoice === style.id
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={previewTTS}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center justify-center space-x-1.5 border border-slate-200 transition-colors cursor-pointer shadow-xs"
              >
                <Volume2 className="w-4 h-4 text-blue-600" />
                <span>Test Voice Preview</span>
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveToProject}
            disabled={mode === 'record' ? !recordedAudioUrl : !ttsText.trim()}
            className="flex items-center space-x-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-40 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Add to Timeline</span>
          </button>
        </div>

      </div>
    </div>
  );
};
