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
  isAssetLibrary?: boolean; // When true, exclusively in Asset Library (props/elements), not Media Library (backgrounds/music)
  createdAt?: number; // timestamp for accurate serial ordering
  serialNumber?: number; // sequential upload order (#1, #2, #3...)
  isChunked?: boolean;
  chunkCount?: number;
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
  
  // Custom uploaded elements (head, eyes, hair, body, hands, feet)
  customEyesImage?: string; // User-uploaded custom eyes image / SVG
  customEyesScale?: number; // Custom eyes scale (default 1.0)
  customHeadImage?: string; // User-uploaded custom head / face image / SVG
  customHairImage?: string; // User-uploaded custom hair image / SVG
  customBodyImage?: string; // User-uploaded custom torso / clothing image / SVG
  customLeftHandImage?: string; // User-uploaded custom left hand image / SVG
  customRightHandImage?: string; // User-uploaded custom right hand image / SVG
  customLeftFootImage?: string; // User-uploaded custom left shoe / foot image / SVG
  customRightFootImage?: string; // User-uploaded custom right shoe / foot image / SVG

  // Element & Rigging Locks
  lockedParts?: Record<string, boolean>; // e.g. { skeleton: true, head: true, eyes: true, mouth: true, body: true, hands: true, feet: true }

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

export interface CharacterSpriteSheetData {
  imageUrl: string;
  frameCount: number;
  rowCount?: number;
  activeRow?: number;
  duration: number; // Duration of full loop in seconds
  naturalWidth?: number;
  naturalHeight?: number;
  frameWidth?: number;
  frameHeight?: number;
  aspectRatio?: number;
  fps?: number;
  serialNumber?: number;
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
  isSpriteSheet?: boolean;
  spriteSheet?: CharacterSpriteSheetData;
}

export type StageElementType = 'character' | 'image' | 'video' | 'text' | 'speechBubble' | 'shape' | 'effect' | 'camera';

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
  fitMode?: 'cover' | 'contain' | 'fill';
  
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

  // For camera
  cameraMotion?: 'smooth' | 'cut' | 'linear';
  hasCameraMotion?: boolean;
  cameraTargetX?: number;
  cameraTargetY?: number;
  cameraTargetWidth?: number;
  cameraTargetHeight?: number;
  cameraTargetScaleX?: number;
  
  // Animation track timing & track line position
  startTime: number; // in seconds
  duration: number; // in seconds
  trackIndex?: number; // Timeline row index (0 = topmost track, 1 = next track down, etc.)
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
  trackIndex?: number; // Timeline row index
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

export interface BackgroundAsset {
  id: string;
  name: string;
  url: string;
  thumbnail?: string;
  width?: number;
  height?: number;
  duration?: number; // In seconds (especially for animated GIFs)
  deleteUrl?: string;
  imgbbId?: string;
  createdAt: number;
  updatedAt?: number;
}

export type BackgroundMode = "checker-dark" | "checker-light" | "black" | "slate";

export interface SpriteSheetState {
  imageUrl: string;
  fileName: string;
  frameCount: number; // columns
  rowCount: number; // rows (lines): default 1
  activeRow: number; // 0 = Line 1, 1 = Line 2, etc., -1 = All Lines
  duration: number; // seconds, e.g. 1
  isPlaying: boolean;
  naturalWidth: number;
  naturalHeight: number;
  currentStep: number;
  background: BackgroundMode;
  scale: number; // multiplier e.g. 1, 1.5, 2
}

export interface FrameData {
  id: number;
  name: string;
  dataUrl: string;
  isDefault?: boolean;
}

export interface AnimationPreset {
  id: string;
  name: string;
  category?: string;
  fps: number;
  loop: boolean;
  frameCount: number;
  defaultFrameIndex?: number;
  createdAt?: unknown;
  updatedAt?: unknown;
  thumbnailUrl?: string;
  frames: FrameData[];
}

export interface SavedAnimation {
  id: string;
  serialNumber: number;
  imageUrl: string;
  thumbnailUrl?: string;
  fileName: string;
  frameCount: number;
  rowCount?: number;
  activeRow?: number;
  duration: number;
  naturalWidth: number;
  naturalHeight: number;
  frameWidth: number;
  frameHeight: number;
  aspectRatio: number;
  fps: number;
  createdAt: number;
}

export interface AtlasFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  duration: number;
}

export interface AnimationDef {
  frames: string[];
  fps: number;
  loop: boolean;
  _name?: string;
  _maxBboxW?: number;
  _maxBboxH?: number;
}

export interface GroupDef {
  key: string;
  spritesheetPath: string;
  atlas: {
    frames: Record<string, AtlasFrame>;
    animations: Record<string, AnimationDef>;
    meta: {
      app: string;
      version: string;
      image: string;
      format: string;
      size: { w: number; h: number };
      scale: string;
      frameTags: Array<{ name: string; from: number; to: number; direction: string; color: string }>;
    };
  };
}

