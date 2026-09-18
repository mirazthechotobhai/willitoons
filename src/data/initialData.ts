import { CharacterModel, Scene, ProjectSettings, MediaAsset } from '../types';
import { DEFAULT_CHARACTERS } from '../utils/characterPresets';
import { STOCK_BACKGROUNDS, STOCK_AUDIO } from '../utils/mediaStock';

export const INITIAL_PROJECT: ProjectSettings = {
  id: '18472269',
  title: 'New Project',
  aspectRatio: '16:9',
  fps: 30,
  duration: 120, // 2 minutes (120 seconds) automatic
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const INITIAL_SCENES: Scene[] = [
  {
    id: 'scene-1',
    name: 'Scene 1',
    duration: 120, // 2 minutes (120 seconds) automatic
    background: {
      type: 'color',
      value: '#0f172a',
    },
    elements: [],
    audioTracks: [],
  },
];
