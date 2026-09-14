import { MediaAsset } from '../types';

// Vivid cartoon/anime stylized SVG backgrounds matching the screenshots
export const STOCK_BACKGROUNDS: MediaAsset[] = [
  {
    id: 'bg-village-path',
    name: 'Village Path with Trees',
    type: 'image',
    category: 'Village',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7dd3fc"/>
            <stop offset="60%" stop-color="#bae6fd"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>
          <linearGradient id="hills" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#65a30d"/>
            <stop offset="100%" stop-color="#365314"/>
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#a3e635"/>
            <stop offset="40%" stop-color="#84cc16"/>
            <stop offset="100%" stop-color="#4d7c0f"/>
          </linearGradient>
          <linearGradient id="path" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#d97706"/>
            <stop offset="100%" stop-color="#b45309"/>
          </linearGradient>
        </defs>
        <!-- Sky -->
        <rect width="1280" height="720" fill="url(#sky)"/>
        <circle cx="950" cy="180" r="70" fill="#fef08a" opacity="0.8"/>
        <!-- Fluffy clouds -->
        <path d="M150 140 Q180 90 230 110 Q280 80 340 120 Q390 100 420 140 Z" fill="#ffffff" opacity="0.9"/>
        <path d="M680 180 Q710 130 760 150 Q810 120 870 160 Q910 140 940 180 Z" fill="#ffffff" opacity="0.85"/>
        <!-- Distant Mountains -->
        <path d="M0 450 L180 320 L380 440 L600 290 L850 460 L1100 310 L1280 420 L1280 720 L0 720 Z" fill="#86efac" opacity="0.5"/>
        <!-- Rolling Hills -->
        <path d="M0 480 Q320 380 640 450 Q960 380 1280 460 L1280 720 L0 720 Z" fill="url(#hills)"/>
        <!-- Ground / Field -->
        <path d="M0 520 Q400 480 800 510 Q1050 500 1280 530 L1280 720 L0 720 Z" fill="url(#ground)"/>
        <!-- Village Dirt Path -->
        <path d="M480 720 Q620 620 720 540 Q750 510 740 480 L760 480 Q770 510 750 540 Q690 630 650 720 Z" fill="url(#path)"/>
        <!-- Village Cottage Silhouette in distance -->
        <rect x="760" y="440" width="90" height="55" fill="#ca8a04" rx="4"/>
        <polygon points="750,440 805,395 860,440" fill="#78350f"/>
        <!-- Lush Cartoon Trees -->
        <g id="tree1">
          <rect x="180" y="380" width="35" height="190" fill="#78350f" rx="6"/>
          <circle cx="195" cy="360" r="85" fill="#15803d"/>
          <circle cx="160" cy="330" r="65" fill="#16a34a"/>
          <circle cx="235" cy="340" r="70" fill="#22c55e"/>
          <circle cx="200" cy="280" r="60" fill="#4ade80"/>
        </g>
        <g id="tree2">
          <rect x="1050" y="360" width="45" height="230" fill="#58290c" rx="8"/>
          <circle cx="1070" cy="330" r="110" fill="#15803d"/>
          <circle cx="1020" cy="290" r="85" fill="#16a34a"/>
          <circle cx="1120" cy="300" r="90" fill="#22c55e"/>
          <circle cx="1070" cy="240" r="75" fill="#4ade80"/>
        </g>
        <!-- Wildflowers and Grass -->
        <circle cx="340" cy="620" r="8" fill="#f43f5e"/>
        <circle cx="380" cy="650" r="6" fill="#fbbf24"/>
        <circle cx="890" cy="630" r="7" fill="#ec4899"/>
        <circle cx="940" cy="670" r="9" fill="#f59e0b"/>
      </svg>
    `),
    thumbnail: '🏞️',
  },
  {
    id: 'bg-village-hut-courtyard',
    name: 'Village Hut & Courtyard',
    type: 'image',
    category: 'Village',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="warmSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fdba74"/>
            <stop offset="60%" stop-color="#fed7aa"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#warmSky)"/>
        <!-- Background vegetation -->
        <ellipse cx="640" cy="460" rx="700" ry="150" fill="#65a30d"/>
        <!-- Courtyard Ground -->
        <rect y="480" width="1280" height="240" fill="#d97706"/>
        <!-- Traditional Mud Hut with Thatched Roof -->
        <g transform="translate(420, 240)">
          <!-- Main Hut Wall -->
          <path d="M50 180 L380 180 L360 360 L70 360 Z" fill="#b45309"/>
          <!-- Wooden Doorway -->
          <rect x="180" y="240" width="70" height="120" fill="#451a03" rx="10"/>
          <!-- Small Window with wooden bars -->
          <rect x="90" y="230" width="50" height="50" fill="#451a03" rx="4"/>
          <line x1="115" y1="230" x2="115" y2="280" stroke="#d97706" stroke-width="4"/>
          <!-- Thatched Straw Roof -->
          <polygon points="10,190 215,60 420,190" fill="#ca8a04"/>
          <polygon points="25,190 215,75 405,190" fill="#eab308"/>
          <!-- Earthen water pots (Matka) -->
          <circle cx="130" cy="350" r="22" fill="#9a3412"/>
          <circle cx="160" cy="355" r="18" fill="#7c2d12"/>
        </g>
        <!-- Charpai / Cot -->
        <g transform="translate(180, 540)">
          <rect x="0" y="20" width="160" height="40" fill="#854d0e" rx="4"/>
          <line x1="10" y1="60" x2="10" y2="90" stroke="#78350f" stroke-width="8"/>
          <line x1="150" y1="60" x2="150" y2="90" stroke="#78350f" stroke-width="8"/>
        </g>
        <!-- Big Neem / Banyan Tree on Left -->
        <path d="M0 0 L150 0 Q180 260 90 560 L0 560 Z" fill="#15803d"/>
        <path d="M0 0 L110 0 Q140 220 50 480 L0 480 Z" fill="#16a34a"/>
      </svg>
    `),
    thumbnail: '🛖',
  },
  {
    id: 'bg-cozy-night-room',
    name: 'Cozy Room (Night / Moonlit)',
    type: 'image',
    category: 'Interior',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="nightWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#312e81"/>
          </linearGradient>
          <linearGradient id="lampGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#fef08a" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
          </linearGradient>
        </defs>
        <!-- Wall -->
        <rect width="1280" height="520" fill="url(#nightWall)"/>
        <!-- Floor -->
        <rect y="520" width="1280" height="200" fill="#1c1917"/>
        <!-- Window looking out at moonlit sky -->
        <g transform="translate(700, 100)">
          <rect width="240" height="280" fill="#0f172a" rx="12" stroke="#475569" stroke-width="12"/>
          <circle cx="170" cy="70" r="35" fill="#f8fafc"/>
          <circle cx="180" cy="65" r="30" fill="#0f172a"/>
          <!-- Window frame divider -->
          <line x1="120" y1="0" x2="120" y2="280" stroke="#475569" stroke-width="8"/>
          <line x1="0" y1="140" x2="240" y2="140" stroke="#475569" stroke-width="8"/>
        </g>
        <!-- Wooden bed with quilt -->
        <g transform="translate(140, 380)">
          <rect x="0" y="40" width="380" height="120" fill="#78350f" rx="8"/>
          <rect x="20" y="10" width="340" height="50" fill="#e2e8f0" rx="8"/>
          <!-- Blanket / quilt -->
          <rect x="80" y="30" width="280" height="100" fill="#dc2626" rx="8"/>
          <circle cx="70" cy="35" r="25" fill="#f1f5f9"/>
        </g>
        <!-- Nightstand and Oil Lamp (Diya) -->
        <g transform="translate(560, 430)">
          <rect width="90" height="140" fill="#451a03" rx="4"/>
          <ellipse cx="45" cy="0" rx="25" ry="10" fill="#b45309"/>
          <!-- Flame -->
          <ellipse cx="45" cy="-12" rx="8" ry="14" fill="#fbbf24"/>
          <circle cx="45" cy="-8" r="4" fill="#fef08a"/>
          <circle cx="45" cy="-8" r="80" fill="url(#lampGlow)"/>
        </g>
      </svg>
    `),
    thumbnail: '🌙',
  },
  {
    id: 'bg-riverbank-sunset',
    name: 'Peaceful Riverbank at Sunset',
    type: 'image',
    category: 'Nature',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="sunset" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#e11d48"/>
            <stop offset="40%" stop-color="#f97316"/>
            <stop offset="80%" stop-color="#facc15"/>
            <stop offset="100%" stop-color="#fef08a"/>
          </linearGradient>
          <linearGradient id="river" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ea580c"/>
            <stop offset="50%" stop-color="#0284c7"/>
            <stop offset="100%" stop-color="#0369a1"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#sunset)"/>
        <circle cx="640" cy="320" r="90" fill="#ffffff" opacity="0.9"/>
        <!-- River surface -->
        <rect y="380" width="1280" height="340" fill="url(#river)"/>
        <!-- Sun reflection waves -->
        <ellipse cx="640" cy="440" rx="140" ry="12" fill="#fef08a" opacity="0.7"/>
        <ellipse cx="640" cy="490" rx="190" ry="14" fill="#fef08a" opacity="0.6"/>
        <ellipse cx="640" cy="560" rx="240" ry="16" fill="#fef08a" opacity="0.5"/>
        <!-- Small wooden fishing boat -->
        <g transform="translate(780, 480)">
          <path d="M0 20 Q50 45 120 20 L110 5 Q50 15 0 5 Z" fill="#451a03"/>
          <line x1="60" y1="5" x2="60" y2="-30" stroke="#78350f" stroke-width="4"/>
          <polygon points="62,-25 95,-10 62,0" fill="#f8fafc"/>
        </g>
        <!-- Grassy Bank Foreground -->
        <path d="M0 580 Q300 520 600 590 Q900 640 1280 570 L1280 720 L0 720 Z" fill="#15803d"/>
      </svg>
    `),
    thumbnail: '🌅',
  },
  {
    id: 'bg-royal-palace',
    name: 'Royal Durbar / Palace Hall',
    type: 'image',
    category: 'Palace',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="palaceWall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#451a03"/>
            <stop offset="100%" stop-color="#78350f"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="520" fill="url(#palaceWall)"/>
        <!-- Royal Red Carpet Floor -->
        <rect y="520" width="1280" height="200" fill="#7f1d1d"/>
        <rect x="420" y="520" width="440" height="200" fill="#b91c1c"/>
        <line x1="420" y1="520" x2="420" y2="720" stroke="#facc15" stroke-width="8"/>
        <line x1="860" y1="520" x2="860" y2="720" stroke="#facc15" stroke-width="8"/>
        <!-- Grand Arches and Pillars -->
        <g id="pillars">
          <rect x="80" y="120" width="70" height="420" fill="#ca8a04" rx="6"/>
          <rect x="1130" y="120" width="70" height="420" fill="#ca8a04" rx="6"/>
          <path d="M80 140 Q640 -20 1200 140" stroke="#eab308" stroke-width="24" fill="none"/>
        </g>
        <!-- Golden Throne -->
        <g transform="translate(560, 310)">
          <!-- Throne Backrest -->
          <path d="M10 160 Q80 20 150 160 Z" fill="#eab308" stroke="#a16207" stroke-width="6"/>
          <circle cx="80" cy="90" r="25" fill="#dc2626"/>
          <!-- Seat Cushion -->
          <rect x="0" y="150" width="160" height="60" fill="#991b1b" rx="10"/>
          <rect x="10" y="190" width="20" height="50" fill="#ca8a04"/>
          <rect x="130" y="190" width="20" height="50" fill="#ca8a04"/>
        </g>
      </svg>
    `),
    thumbnail: '👑',
  },
  {
    id: 'bg-market-bazaar',
    name: 'Village Market / Bazaar',
    type: 'image',
    category: 'Village',
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <defs>
          <linearGradient id="skyBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#38bdf8"/>
            <stop offset="100%" stop-color="#bae6fd"/>
          </linearGradient>
        </defs>
        <rect width="1280" height="720" fill="url(#skyBlue)"/>
        <!-- Ground / Street -->
        <rect y="480" width="1280" height="240" fill="#a8a29e"/>
        <!-- Market Stalls with Striped Canopies -->
        <g transform="translate(100, 280)">
          <!-- Stall 1 -->
          <rect x="40" y="120" width="260" height="120" fill="#78350f" rx="4"/>
          <!-- Canopy -->
          <polygon points="10,120 40,40 300,40 330,120" fill="#ef4444"/>
          <polygon points="60,120 85,40 125,40 100,120" fill="#ffffff"/>
          <polygon points="170,120 195,40 235,40 210,120" fill="#ffffff"/>
          <!-- Baskets of fruits/vegetables -->
          <ellipse cx="90" cy="140" rx="30" ry="15" fill="#ca8a04"/>
          <ellipse cx="160" cy="140" rx="30" ry="15" fill="#15803d"/>
          <ellipse cx="230" cy="140" rx="30" ry="15" fill="#ea580c"/>
        </g>
        <g transform="translate(760, 280)">
          <!-- Stall 2 (Spices & Pottery) -->
          <rect x="40" y="120" width="280" height="120" fill="#78350f" rx="4"/>
          <polygon points="10,120 40,40 320,40 350,120" fill="#3b82f6"/>
          <polygon points="70,120 95,40 135,40 110,120" fill="#facc15"/>
          <polygon points="190,120 215,40 255,40 230,120" fill="#facc15"/>
          <circle cx="100" cy="140" r="18" fill="#c2410c"/>
          <circle cx="160" cy="140" r="18" fill="#eab308"/>
          <circle cx="220" cy="140" r="18" fill="#b91c1c"/>
        </g>
      </svg>
    `),
    thumbnail: '🎪',
  },
];

// High quality synthetic web-audio tone generators for cartoon sound effects & music
export const STOCK_AUDIO: MediaAsset[] = [
  {
    id: 'audio-village-flute',
    name: 'Village Morning Flute Melody',
    type: 'audio',
    category: 'Music',
    url: 'audio:melody-flute',
    duration: 15,
    thumbnail: '🎵',
  },
  {
    id: 'audio-comedy-bounce',
    name: 'Cartoon Comedy Bounce Theme',
    type: 'audio',
    category: 'Music',
    url: 'audio:melody-comedy',
    duration: 12,
    thumbnail: '🎶',
  },
  {
    id: 'audio-adventure-beat',
    name: 'Indian Folk Dholak & Rhythm',
    type: 'audio',
    category: 'Music',
    url: 'audio:melody-folk',
    duration: 16,
    thumbnail: '🥁',
  },
  {
    id: 'audio-sfx-whoosh',
    name: 'Cartoon Whoosh / Fast Move',
    type: 'audio',
    category: 'SFX',
    url: 'audio:sfx-whoosh',
    duration: 1.2,
    thumbnail: '💨',
  },
  {
    id: 'audio-sfx-pop',
    name: 'Pop / Bubble Sound',
    type: 'audio',
    category: 'SFX',
    url: 'audio:sfx-pop',
    duration: 0.6,
    thumbnail: '🫧',
  },
  {
    id: 'audio-sfx-ding',
    name: 'Idea Ding / Bell',
    type: 'audio',
    category: 'SFX',
    url: 'audio:sfx-ding',
    duration: 1.5,
    thumbnail: '🔔',
  },
  {
    id: 'audio-sfx-footsteps',
    name: 'Cartoon Footsteps Tippy-Tap',
    type: 'audio',
    category: 'SFX',
    url: 'audio:sfx-footsteps',
    duration: 2.0,
    thumbnail: '🐾',
  },
  {
    id: 'audio-sfx-laugh',
    name: 'Cartoon Crowd Cheer & Claps',
    type: 'audio',
    category: 'SFX',
    url: 'audio:sfx-cheer',
    duration: 3.0,
    thumbnail: '👏',
  },
];

export const TEMPLATE_SCENES = [
  {
    id: 'tpl-village-dialogue',
    name: 'Village Conversation Scene',
    description: 'Two characters meeting on a countryside path talking.',
    thumbnail: '👨🏽‍🌾 ↔️ 👵🏽',
    background: STOCK_BACKGROUNDS[0].url,
    elements: [
      {
        id: 'tpl-el-kaka',
        type: 'character' as const,
        name: 'Village Uncle',
        x: 25,
        y: 35,
        width: 32,
        height: 55,
        rotation: 0,
        scaleX: 1,
        opacity: 1,
        zIndex: 2,
        characterData: undefined, // will be bound to preset
        animation: 'talk' as const,
        isLipSyncing: true,
        startTime: 0,
        duration: 8,
      },
      {
        id: 'tpl-el-dadi',
        type: 'character' as const,
        name: 'Village Dadi',
        x: 65,
        y: 35,
        width: 30,
        height: 54,
        rotation: 0,
        scaleX: -1,
        opacity: 1,
        zIndex: 2,
        characterData: undefined,
        animation: 'idle' as const,
        startTime: 0,
        duration: 8,
      },
      {
        id: 'tpl-el-bubble',
        type: 'speechBubble' as const,
        name: 'Uncle Speech',
        x: 22,
        y: 12,
        width: 28,
        height: 18,
        rotation: 0,
        scaleX: 1,
        opacity: 1,
        zIndex: 10,
        text: 'Dadi ji! Kemcho? How is the harvest today?',
        fontSize: 16,
        textColor: '#0f172a',
        bubbleStyle: 'speech' as const,
        bubbleColor: '#ffffff',
        startTime: 0.5,
        duration: 4.5,
      },
    ],
  },
  {
    id: 'tpl-royal-court',
    name: 'Maharaja Royal Durbar',
    description: 'The King addressing the kingdom with grand throne.',
    thumbnail: '👑 🏰',
    background: STOCK_BACKGROUNDS[4].url,
    elements: [
      {
        id: 'tpl-el-raja',
        type: 'character' as const,
        name: 'Maharaja Vikram',
        x: 48,
        y: 30,
        width: 34,
        height: 60,
        rotation: 0,
        scaleX: 1,
        opacity: 1,
        zIndex: 2,
        animation: 'talk' as const,
        isLipSyncing: true,
        startTime: 0,
        duration: 10,
      },
      {
        id: 'tpl-el-decree',
        type: 'speechBubble' as const,
        name: 'Royal Decree',
        x: 48,
        y: 8,
        width: 36,
        height: 20,
        rotation: 0,
        scaleX: 1,
        opacity: 1,
        zIndex: 10,
        text: 'Listen, noble citizens of the kingdom!',
        fontSize: 17,
        textColor: '#000000',
        bubbleStyle: 'shout' as const,
        bubbleColor: '#fef08a',
        startTime: 1,
        duration: 6,
      },
    ],
  },
];
