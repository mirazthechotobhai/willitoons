export type MediaType = 'image' | 'video' | 'audio';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  thumbnail?: string;
  duration?: number; // in seconds for video/audio
  width?: number;
  height?: number;
  category?: string;
}

export type JointId = 
  | 'head'
  | 'neck'
  | 'shoulderL'
  | 'elbowL'
  | 'wristL'
  | 'shoulderR'
  | 'elbowR'
  | 'wristR'
  | 'chest'
  | 'pelvis'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'toeL'
  | 'hipR'
  | 'kneeR'
  | 'ankleR'
  | 'toeR';

export interface JointPoint {
  id: JointId;
  x: number; // relative to character center (0 to 100)
  y: number; // relative to character center (0 to 100)
  name: string;
}

export interface BoneConnection {
  from: JointId;
  to: JointId;
}

export type CharacterAngle = 'front' | 'threeQuarterFront' | 'threeQuarterBack';

export type CharacterAnimationType = 
  | 'idle'
  | 'walk'
  | 'run'
  | 'talk'
  | 'wave'
  | 'dance'
  | 'angry'
  | 'bow'
  | 'celebrate'
  | 'jump';

export type LipsFormat = 'format1' | 'format2';

export interface CharacterAppearance {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeType: string;
  mouthType: string; // 'idle' | 'talkA' | 'talkO' | 'smile' | 'angry' | 'mouthX' | 'mouthA' | 'mouthB' | 'mouthC' | 'mouthD' | 'mouthE' | 'mouthF'
  lipsFormat?: LipsFormat; // 'format1' (Default Classic Line) | 'format2' (Realistic Shaded Lips - User Pack)
  lipColor?: string; // Custom lip color (default: '#8D5538' matching the uploaded lips)
  mouthScale?: number; // Custom scale multiplier (e.g. 0.5 to 2.5, default 1.0) - user can resize bigger/smaller
  mouthLocked?: boolean; // When true (default), lip position is strictly locked to face anchor preventing misalignment
  customMouthImages?: Record<string, string>; // Optional custom user-uploaded replacement images per viseme ('X', 'A', 'B', 'C', 'D', 'E', 'F')
  bodyType: string; // 'vest' | 'kurta' | 'saree' | 'tshirt' | 'royal'
  clothingColor: string;
  clothingSecondaryColor: string;
  legsType: string; // 'lungi' | 'dhoti' | 'pants' | 'skirt'
  legsColor: string;
  additionalHeadwear?: string; // 'turban' | 'cap' | 'flower' | 'none'
  additionalFacialHair?: string; // 'mustache' | 'beard' | 'none'
  additionalAccessories?: string; // 'tilak' | 'glasses' | 'none'
  headwearColor?: string;
}

export interface CharacterModel {
  id: string;
  name: string;
  category: 'Desi' | 'Western' | 'Indonesian' | 'Village' | 'Birds' | 'Animals' | 'Vehicles' | 'Religious' | 'Horror' | 'Latest';
  thumbnail: string;
  angle: CharacterAngle;
  joints: Record<JointId, { x: number; y: number }>;
  appearance: CharacterAppearance;
  isCustom?: boolean;
}

export type StageElementType = 'character' | 'image' | 'video' | 'text' | 'speechBubble' | 'shape' | 'effect';

export interface StageElement {
  id: string;
  type: StageElementType;
  name: string;
  x: number; // percentage of stage (0 - 100)
  y: number; // percentage of stage (0 - 100)
  width: number; // percentage of stage (0 - 100)
  height: number; // percentage of stage (0 - 100)
  rotation?: number; // degrees
  scaleX?: number; // 1 or -1 for flip
  opacity?: number;
  zIndex: number;
  locked?: boolean;
  visible?: boolean;
  isBackground?: boolean;
  effectType?: 'sunlight' | 'vignette' | 'glow' | 'rain' | 'dust' | 'fog' | 'cinema';
  
  // For character
  characterData?: CharacterModel;
  animation?: CharacterAnimationType;
  isLipSyncing?: boolean;
  
  // For media (image / video)
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  
  // For text & speech bubble
  text?: string;
  fontSize?: number;
  textColor?: string;
  bubbleStyle?: 'speech' | 'thought' | 'shout' | 'caption';
  bubbleColor?: string;
  
  // Animation track timing
  startTime: number; // in seconds
  duration: number; // in seconds
}

export interface AudioTrackItem {
  id: string;
  name: string;
  url: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isMuted?: boolean;
  locked?: boolean;
  visible?: boolean;
  type?: 'voice' | 'music' | 'sfx';
}

export interface Scene {
  id: string;
  name: string;
  duration: number; // duration in seconds (e.g. 5, 10, 15)
  background: {
    type: 'color' | 'image' | 'video';
    value: string; // hex color or URL
  };
  elements: StageElement[];
  audioTracks: AudioTrackItem[];
}

export interface ProjectSettings {
  id: string;
  title: string;
  width?: number;
  height?: number;
  fps?: number;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  duration?: number;
  createdAt?: number;
  updatedAt?: number;
}

export interface ExportSettings {
  format: 'mp4' | 'webm' | 'gif';
  resolution: '1080p' | '720p' | '480p';
  fps: 24 | 30 | 60;
  quality: 'high' | 'medium' | 'low';
}
