// Web Audio Synthesizer and Mixer for Cartoon Studio

let audioCtx: AudioContext | null = null;
let destinationNode: MediaStreamAudioDestinationNode | null = null;

export function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
    destinationNode = audioCtx.createMediaStreamDestination();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAudioDestinationStream(): MediaStream | null {
  getAudioContext();
  return destinationNode ? destinationNode.stream : null;
}

// Sound effects generator using Web Audio oscillators
export function playSyntheticAudio(url: string, volume: number = 0.8, loop: boolean = false): { stop: () => void } {
  try {
    const ctx = getAudioContext();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.connect(ctx.destination);
    if (destinationNode) {
      gainNode.connect(destinationNode);
    }

    const now = ctx.currentTime;
    const activeOscillators: OscillatorNode[] = [];

    if (url === 'audio:sfx-whoosh') {
      // Wind whoosh noise
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
      filter.frequency.exponentialRampToValueAtTime(150, now + 0.6);

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.linearRampToValueAtTime(320, now + 0.3);
      osc.frequency.linearRampToValueAtTime(60, now + 0.6);

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(volume, now + 0.25);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(filter);
      filter.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.7);
      activeOscillators.push(osc);
    } else if (url === 'audio:sfx-pop') {
      // Cartoon bubble pop
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(950, now + 0.12);

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.15);
      activeOscillators.push(osc);
    } else if (url === 'audio:sfx-ding') {
      // High bell / idea ding
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(1200, now);
      osc2.frequency.setValueAtTime(2400, now);

      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.2);
      osc2.stop(now + 1.2);
      activeOscillators.push(osc1, osc2);
    } else if (url === 'audio:sfx-footsteps') {
      // Tippy-tap cartoon steps
      for (let i = 0; i < 4; i++) {
        const stepTime = now + i * 0.25;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180 + (i % 2) * 50, stepTime);
        osc.frequency.exponentialRampToValueAtTime(60, stepTime + 0.1);

        const stepGain = ctx.createGain();
        stepGain.gain.setValueAtTime(volume * 0.7, stepTime);
        stepGain.gain.exponentialRampToValueAtTime(0.001, stepTime + 0.12);

        osc.connect(stepGain);
        stepGain.connect(gainNode);
        osc.start(stepTime);
        osc.stop(stepTime + 0.13);
        activeOscillators.push(osc);
      }
    } else if (url === 'audio:sfx-cheer') {
      // Cheerful cartoon applause
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.4); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.6); // C6

      gainNode.gain.setValueAtTime(volume * 0.6, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 1.8);
      activeOscillators.push(osc);
    } else if (url.startsWith('audio:melody-')) {
      // Pleasant melodic musical loop
      const notes = url === 'audio:melody-flute'
        ? [440, 493.88, 554.37, 659.25, 739.99, 880, 739.99, 659.25] // pastoral flute
        : url === 'audio:melody-comedy'
        ? [392, 440, 493.88, 523.25, 587.33, 659.25, 523.25, 392] // bouncy comedy
        : [220, 277.18, 329.63, 440, 329.63, 277.18, 220, 164.81]; // folk rhythm

      const noteDuration = 0.4;
      const totalLen = notes.length * noteDuration;
      const repetitions = loop ? 10 : 2;

      for (let r = 0; r < repetitions; r++) {
        const repOffset = now + r * totalLen;
        notes.forEach((freq, idx) => {
          const startTime = repOffset + idx * noteDuration;
          const osc = ctx.createOscillator();
          osc.type = url === 'audio:melody-flute' ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          const noteGain = ctx.createGain();
          noteGain.gain.setValueAtTime(0.001, startTime);
          noteGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.05);
          noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDuration - 0.02);

          osc.connect(noteGain);
          noteGain.connect(gainNode);
          osc.start(startTime);
          osc.stop(startTime + noteDuration);
          activeOscillators.push(osc);
        });
      }
    }

    return {
      stop: () => {
        try {
          gainNode.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.05);
          activeOscillators.forEach(osc => {
            try { osc.stop(); } catch { /* ignore */ }
          });
        } catch { /* ignore */ }
      },
    };
  } catch (err) {
    console.warn('Audio play error:', err);
    return { stop: () => {} };
  }
}

// Play real media audio element (for uploaded MP3, WAV, or remote URLs)
export function playUploadedAudio(url: string, volume: number = 1.0, loop: boolean = false): {
  stop: () => void;
  audioElement: HTMLAudioElement;
} {
  const audio = new Audio(url);
  audio.volume = Math.max(0, Math.min(1, volume));
  audio.loop = loop;
  
  // Also connect to destination node for export mixing if possible
  try {
    const ctx = getAudioContext();
    const source = ctx.createMediaElementSource(audio);
    source.connect(ctx.destination);
    if (destinationNode) {
      source.connect(destinationNode);
    }
  } catch {
    // If already connected or cross-origin restrictions, fallback to direct audio play
  }

  audio.play().catch(e => console.warn('Audio play prevented:', e));

  return {
    stop: () => {
      audio.pause();
      audio.currentTime = 0;
    },
    audioElement: audio,
  };
}

// Text-to-Speech using browser Web Speech API for cartoon voices
export function speakCartoonText(
  text: string,
  voiceType: 'child' | 'villager' | 'grandma' | 'hero' | 'funny' = 'villager',
  onBoundary?: () => void,
  onEnd?: () => void
): { cancel: () => void } {
  if (!('speechSynthesis' in window)) {
    console.warn('Speech synthesis not supported');
    return { cancel: () => {} };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);

  // Configure pitch & rate for cartoon character stereotypes
  switch (voiceType) {
    case 'child':
      utterance.pitch = 1.8;
      utterance.rate = 1.2;
      break;
    case 'grandma':
      utterance.pitch = 0.8;
      utterance.rate = 0.85;
      break;
    case 'hero':
      utterance.pitch = 1.0;
      utterance.rate = 1.0;
      break;
    case 'funny':
      utterance.pitch = 1.9;
      utterance.rate = 1.35;
      break;
    case 'villager':
    default:
      utterance.pitch = 1.1;
      utterance.rate = 1.0;
      break;
  }

  utterance.onboundary = () => {
    if (onBoundary) onBoundary();
  };

  utterance.onend = () => {
    if (onEnd) onEnd();
  };

  utterance.onerror = () => {
    if (onEnd) onEnd();
  };

  window.speechSynthesis.speak(utterance);

  return {
    cancel: () => {
      window.speechSynthesis.cancel();
    },
  };
}
