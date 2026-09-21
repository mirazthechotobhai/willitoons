import { MediaAsset } from '../types';

export const STOCK_ASSET_CATEGORIES = [
  'All',
  'Props & Items',
  'Nature & Decor',
  'Furniture',
  'Vehicles',
  'Effects',
] as const;

export type StockAssetCategory = typeof STOCK_ASSET_CATEGORIES[number];

export const STOCK_PROPS_AND_ASSETS: MediaAsset[] = [
  // 1. Nature & Decor
  {
    id: 'stock-asset-tree-1',
    name: 'Banyan Tree',
    type: 'image',
    category: 'Nature & Decor',
    isAssetLibrary: true,
    width: 200,
    height: 220,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220">
        <path d="M90 215 C90 150 75 120 70 95 C95 95 105 120 110 215 Z" fill="#8B5A2B"/>
        <path d="M72 110 C50 125 35 150 25 180" stroke="#8B5A2B" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M105 115 C125 130 145 155 155 185" stroke="#8B5A2B" stroke-width="8" stroke-linecap="round" fill="none"/>
        <circle cx="95" cy="75" r="48" fill="#2E7D32"/>
        <circle cx="60" cy="85" r="38" fill="#388E3C"/>
        <circle cx="130" cy="85" r="38" fill="#43A047"/>
        <circle cx="95" cy="45" r="36" fill="#4CAF50"/>
        <circle cx="75" cy="55" r="22" fill="#66BB6A" opacity="0.6"/>
        <circle cx="115" cy="55" r="22" fill="#81C784" opacity="0.6"/>
      </svg>
    `),
    thumbnail: '🌳',
  },
  {
    id: 'stock-asset-palm-1',
    name: 'Coconut Palm',
    type: 'image',
    category: 'Nature & Decor',
    isAssetLibrary: true,
    width: 180,
    height: 220,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 220">
        <path d="M90 215 Q75 140 100 80" stroke="#795548" stroke-width="14" stroke-linecap="round" fill="none"/>
        <circle cx="98" cy="82" r="7" fill="#4E342E"/>
        <circle cx="106" cy="86" r="6" fill="#4E342E"/>
        <circle cx="94" cy="90" r="6" fill="#4E342E"/>
        <path d="M100 80 Q140 60 165 85 Q130 80 100 80" fill="#2E7D32"/>
        <path d="M100 80 Q130 30 150 35 Q115 55 100 80" fill="#388E3C"/>
        <path d="M100 80 Q85 20 65 30 Q85 55 100 80" fill="#43A047"/>
        <path d="M100 80 Q45 50 30 75 Q70 75 100 80" fill="#2E7D32"/>
        <path d="M100 80 Q60 105 35 115 Q75 100 100 80" fill="#1B5E20"/>
        <path d="M100 80 Q135 105 160 115 Q125 100 100 80" fill="#1B5E20"/>
      </svg>
    `),
    thumbnail: '🌴',
  },
  {
    id: 'stock-asset-bush-1',
    name: 'Green Bush & Flowers',
    type: 'image',
    category: 'Nature & Decor',
    isAssetLibrary: true,
    width: 160,
    height: 100,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 100">
        <ellipse cx="80" cy="65" rx="70" ry="30" fill="#1B5E20"/>
        <circle cx="50" cy="55" r="32" fill="#2E7D32"/>
        <circle cx="110" cy="55" r="32" fill="#388E3C"/>
        <circle cx="80" cy="45" r="34" fill="#4CAF50"/>
        <circle cx="50" cy="50" r="5" fill="#E91E63"/>
        <circle cx="110" cy="45" r="5" fill="#FFEB3B"/>
        <circle cx="80" cy="35" r="5" fill="#FF5722"/>
      </svg>
    `),
    thumbnail: '🌿',
  },
  {
    id: 'stock-asset-cloud-1',
    name: 'Fluffy Cloud',
    type: 'image',
    category: 'Nature & Decor',
    isAssetLibrary: true,
    width: 180,
    height: 110,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 110">
        <path d="M40 85 H145 A25 25 0 0 0 150 40 A32 32 0 0 0 95 25 A30 30 0 0 0 40 45 A25 25 0 0 0 40 85 Z" fill="#E2E8F0" stroke="#CBD5E1" stroke-width="4"/>
        <path d="M45 80 H140 A20 20 0 0 0 145 45 A28 28 0 0 0 95 32 A26 26 0 0 0 45 50 A20 20 0 0 0 45 80 Z" fill="#FFFFFF"/>
      </svg>
    `),
    thumbnail: '☁️',
  },
  {
    id: 'stock-asset-sun-1',
    name: 'Cartoon Sun',
    type: 'image',
    category: 'Nature & Decor',
    isAssetLibrary: true,
    width: 140,
    height: 140,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
        <g stroke="#F59E0B" stroke-width="6" stroke-linecap="round">
          <line x1="70" y1="10" x2="70" y2="25"/>
          <line x1="70" y1="115" x2="70" y2="130"/>
          <line x1="10" y1="70" x2="25" y2="70"/>
          <line x1="115" y1="70" x2="130" y2="70"/>
          <line x1="28" y1="28" x2="39" y2="39"/>
          <line x1="101" y1="101" x2="112" y2="112"/>
          <line x1="28" y1="112" x2="39" y2="101"/>
          <line x1="101" y1="39" x2="112" y2="28"/>
        </g>
        <circle cx="70" cy="70" r="36" fill="#FBBF24" stroke="#F59E0B" stroke-width="4"/>
        <circle cx="58" cy="65" r="4" fill="#78350F"/>
        <circle cx="82" cy="65" r="4" fill="#78350F"/>
        <path d="M60 78 Q70 88 80 78" stroke="#78350F" stroke-width="3" fill="none" stroke-linecap="round"/>
        <ellipse cx="52" cy="72" rx="4" ry="2.5" fill="#F87171" opacity="0.6"/>
        <ellipse cx="88" cy="72" rx="4" ry="2.5" fill="#F87171" opacity="0.6"/>
      </svg>
    `),
    thumbnail: '☀️',
  },

  // 2. Furniture & House
  {
    id: 'stock-asset-chair-1',
    name: 'Wooden Chair',
    type: 'image',
    category: 'Furniture',
    isAssetLibrary: true,
    width: 120,
    height: 160,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160">
        <rect x="35" y="20" width="50" height="60" rx="6" fill="#B45309" stroke="#78350F" stroke-width="4"/>
        <rect x="42" y="30" width="36" height="40" rx="3" fill="#D97706"/>
        <rect x="25" y="75" width="70" height="15" rx="4" fill="#92400E" stroke="#78350F" stroke-width="4"/>
        <line x1="32" y1="90" x2="28" y2="150" stroke="#78350F" stroke-width="7" stroke-linecap="round"/>
        <line x1="88" y1="90" x2="92" y2="150" stroke="#78350F" stroke-width="7" stroke-linecap="round"/>
        <line x1="42" y1="90" x2="40" y2="140" stroke="#92400E" stroke-width="5" stroke-linecap="round"/>
        <line x1="78" y1="90" x2="80" y2="140" stroke="#92400E" stroke-width="5" stroke-linecap="round"/>
      </svg>
    `),
    thumbnail: '🪑',
  },
  {
    id: 'stock-asset-table-1',
    name: 'Wooden Study Table',
    type: 'image',
    category: 'Furniture',
    isAssetLibrary: true,
    width: 180,
    height: 130,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 130">
        <polygon points="15,40 165,40 150,20 30,20" fill="#B45309" stroke="#78350F" stroke-width="3"/>
        <rect x="15" y="40" width="150" height="15" fill="#92400E" stroke="#78350F" stroke-width="3"/>
        <rect x="25" y="55" width="12" height="70" fill="#78350F" rx="2"/>
        <rect x="143" y="55" width="12" height="70" fill="#78350F" rx="2"/>
        <rect x="40" y="55" width="8" height="60" fill="#92400E" rx="2"/>
        <rect x="132" y="55" width="8" height="60" fill="#92400E" rx="2"/>
        <rect x="75" y="43" width="30" height="8" rx="2" fill="#D97706"/>
      </svg>
    `),
    thumbnail: '🛋️',
  },
  {
    id: 'stock-asset-lamp-1',
    name: 'Vintage Desk Lamp',
    type: 'image',
    category: 'Furniture',
    isAssetLibrary: true,
    width: 100,
    height: 140,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
        <ellipse cx="50" cy="130" rx="25" ry="6" fill="#1E293B"/>
        <path d="M50 126 Q40 85 55 60" stroke="#334155" stroke-width="6" fill="none" stroke-linecap="round"/>
        <polygon points="30,55 70,55 82,25 18,25" fill="#F59E0B" stroke="#D97706" stroke-width="3"/>
        <circle cx="50" cy="55" r="8" fill="#FEF08A"/>
        <polygon points="20,60 80,60 95,120 5,120" fill="#FEF08A" opacity="0.25"/>
      </svg>
    `),
    thumbnail: '💡',
  },

  // 3. Vehicles
  {
    id: 'stock-asset-car-1',
    name: 'Red Cartoon Car',
    type: 'image',
    category: 'Vehicles',
    isAssetLibrary: true,
    width: 200,
    height: 120,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120">
        <path d="M25 80 L35 55 L75 40 L145 40 L165 58 L185 68 C192 72 195 78 190 85 L180 85 A20 20 0 0 1 140 85 L75 85 A20 20 0 0 1 35 85 L18 85 C14 85 15 80 25 80 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="4"/>
        <path d="M75 45 L110 45 L110 65 L45 65 Z" fill="#93C5FD" stroke="#1D4ED8" stroke-width="2"/>
        <path d="M115 45 L145 45 L160 65 L115 65 Z" fill="#93C5FD" stroke="#1D4ED8" stroke-width="2"/>
        <circle cx="185" cy="72" r="5" fill="#FDE047" stroke="#EAB308" stroke-width="2"/>
        <circle cx="55" cy="85" r="17" fill="#1E293B" stroke="#0F172A" stroke-width="3"/>
        <circle cx="55" cy="85" r="7" fill="#94A3B8"/>
        <circle cx="160" cy="85" r="17" fill="#1E293B" stroke="#0F172A" stroke-width="3"/>
        <circle cx="160" cy="85" r="7" fill="#94A3B8"/>
      </svg>
    `),
    thumbnail: '🚗',
  },
  {
    id: 'stock-asset-bicycle-1',
    name: 'Classic Bicycle',
    type: 'image',
    category: 'Vehicles',
    isAssetLibrary: true,
    width: 180,
    height: 130,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 130">
        <circle cx="45" cy="85" r="28" fill="none" stroke="#334155" stroke-width="5"/>
        <circle cx="135" cy="85" r="28" fill="none" stroke="#334155" stroke-width="5"/>
        <polygon points="45,85 85,85 115,50 75,50" fill="none" stroke="#2563EB" stroke-width="6" stroke-linejoin="round"/>
        <line x1="85" y1="85" x2="80" y2="40" stroke="#2563EB" stroke-width="6" stroke-linecap="round"/>
        <line x1="72" y1="38" x2="90" y2="38" stroke="#1E293B" stroke-width="7" stroke-linecap="round"/>
        <line x1="135" y1="85" x2="118" y2="32" stroke="#2563EB" stroke-width="6" stroke-linecap="round"/>
        <line x1="110" y1="30" x2="128" y2="30" stroke="#1E293B" stroke-width="6" stroke-linecap="round"/>
      </svg>
    `),
    thumbnail: '🚲',
  },
  {
    id: 'stock-asset-rocket-1',
    name: 'Cartoon Rocket',
    type: 'image',
    category: 'Vehicles',
    isAssetLibrary: true,
    width: 140,
    height: 180,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 180">
        <path d="M45 130 Q30 145 20 155 Q35 140 45 120" fill="#EF4444"/>
        <path d="M95 130 Q110 145 120 155 Q105 140 95 120" fill="#EF4444"/>
        <path d="M70 20 Q105 60 100 135 L40 135 Q35 60 70 20 Z" fill="#F1F5F9" stroke="#94A3B8" stroke-width="4"/>
        <path d="M70 20 Q85 45 92 60 L48 60 Q55 45 70 20 Z" fill="#EF4444"/>
        <circle cx="70" cy="85" r="16" fill="#38BDF8" stroke="#0284C7" stroke-width="4"/>
        <polygon points="55,135 85,135 70,175" fill="#F59E0B"/>
        <polygon points="60,135 80,135 70,165" fill="#FEF08A"/>
      </svg>
    `),
    thumbnail: '🚀',
  },

  // 4. Props & Items
  {
    id: 'stock-asset-apple-1',
    name: 'Fresh Red Apple',
    type: 'image',
    category: 'Props & Items',
    isAssetLibrary: true,
    width: 100,
    height: 110,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 110">
        <path d="M50 35 Q55 15 65 15" stroke="#78350F" stroke-width="5" stroke-linecap="round" fill="none"/>
        <path d="M54 28 Q75 18 78 30 Q65 35 54 28 Z" fill="#22C55E"/>
        <path d="M50 40 C35 30 15 45 18 70 C22 95 45 105 50 95 C55 105 78 95 82 70 C85 45 65 30 50 40 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="3"/>
        <ellipse cx="35" cy="55" rx="6" ry="12" fill="#FCA5A5" opacity="0.6" transform="rotate(-25 35 55)"/>
      </svg>
    `),
    thumbnail: '🍎',
  },
  {
    id: 'stock-asset-gift-1',
    name: 'Surprise Gift Box',
    type: 'image',
    category: 'Props & Items',
    isAssetLibrary: true,
    width: 120,
    height: 130,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 130">
        <rect x="20" y="55" width="80" height="65" rx="6" fill="#8B5CF6" stroke="#6D28D9" stroke-width="4"/>
        <rect x="14" y="42" width="92" height="18" rx="4" fill="#A78BFA" stroke="#6D28D9" stroke-width="4"/>
        <rect x="52" y="42" width="16" height="78" fill="#FBBF24"/>
        <path d="M60 42 C45 20 25 30 52 42 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2"/>
        <path d="M60 42 C75 20 95 30 68 42 Z" fill="#FBBF24" stroke="#D97706" stroke-width="2"/>
      </svg>
    `),
    thumbnail: '🎁',
  },
  {
    id: 'stock-asset-star-1',
    name: 'Golden Star',
    type: 'image',
    category: 'Props & Items',
    isAssetLibrary: true,
    width: 120,
    height: 120,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
        <polygon points="60,10 75,45 112,45 82,68 93,105 60,82 27,105 38,68 8,45 45,45" fill="#FBBF24" stroke="#D97706" stroke-width="4" stroke-linejoin="round"/>
        <polygon points="60,25 70,50 95,50 75,65 82,90 60,75 38,90 45,65 25,50 50,50" fill="#FEF08A"/>
      </svg>
    `),
    thumbnail: '⭐',
  },
  {
    id: 'stock-asset-burger-1',
    name: 'Cartoon Burger',
    type: 'image',
    category: 'Props & Items',
    isAssetLibrary: true,
    width: 130,
    height: 110,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 110">
        <path d="M20 50 C20 25 45 20 65 20 C85 20 110 25 110 50 Z" fill="#F59E0B" stroke="#D97706" stroke-width="3"/>
        <circle cx="45" cy="32" r="2" fill="#FEF08A"/>
        <circle cx="65" cy="28" r="2" fill="#FEF08A"/>
        <circle cx="85" cy="35" r="2" fill="#FEF08A"/>
        <path d="M15 52 Q35 48 65 52 Q95 48 115 52" stroke="#22C55E" stroke-width="7" stroke-linecap="round"/>
        <rect x="22" y="58" width="86" height="12" rx="4" fill="#B91C1C"/>
        <polygon points="35,66 65,75 95,66 90,62 40,62" fill="#FBBF24"/>
        <rect x="22" y="72" width="86" height="12" rx="4" fill="#78350F"/>
        <path d="M20 86 C20 95 45 98 65 98 C85 98 110 95 110 86 Z" fill="#F59E0B" stroke="#D97706" stroke-width="3"/>
      </svg>
    `),
    thumbnail: '🍔',
  },

  // 5. Effects
  {
    id: 'stock-asset-fire-1',
    name: 'Cartoon Fire Flame',
    type: 'image',
    category: 'Effects',
    isAssetLibrary: true,
    width: 110,
    height: 150,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 150">
        <path d="M55 15 C65 40 85 55 90 85 C95 115 75 140 55 140 C35 140 15 115 20 85 C25 60 40 45 45 35 C42 50 35 65 45 80 C50 65 52 35 55 15 Z" fill="#EF4444" stroke="#B91C1C" stroke-width="3"/>
        <path d="M55 55 C62 70 75 80 75 105 C75 125 65 135 55 135 C45 135 35 125 35 105 C35 85 45 75 55 55 Z" fill="#F59E0B"/>
        <path d="M55 85 C60 95 65 105 65 118 C65 130 60 133 55 133 C50 133 45 130 45 118 C45 105 50 95 55 85 Z" fill="#FEF08A"/>
      </svg>
    `),
    thumbnail: '🔥',
  },
  {
    id: 'stock-asset-boom-1',
    name: 'Comic Action Boom',
    type: 'image',
    category: 'Effects',
    isAssetLibrary: true,
    width: 150,
    height: 130,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 130">
        <polygon points="75,5 92,38 128,25 120,58 148,78 115,92 122,125 90,110 65,128 60,95 25,110 38,78 5,65 35,45 20,15 58,28" fill="#FBBF24" stroke="#EF4444" stroke-width="5" stroke-linejoin="round"/>
        <polygon points="75,20 88,45 115,35 108,60 130,75 105,85 110,110 85,98 65,112 60,88 35,98 45,75 20,65 42,50 30,28 60,38" fill="#FEF08A"/>
        <text x="75" y="75" fill="#DC2626" font-family="impact, sans-serif" font-weight="bold" font-size="28" text-anchor="middle">BOOM!</text>
      </svg>
    `),
    thumbnail: '💥',
  },
  {
    id: 'stock-asset-thunder-1',
    name: 'Thunder Bolt',
    type: 'image',
    category: 'Effects',
    isAssetLibrary: true,
    width: 90,
    height: 140,
    url: 'data:image/svg+xml;utf8,' + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 140">
        <polygon points="50,5 15,75 42,75 35,135 75,55 48,55" fill="#FBBF24" stroke="#D97706" stroke-width="4" stroke-linejoin="round"/>
        <polygon points="48,15 22,70 42,70 38,120 68,60 48,60" fill="#FEF08A"/>
      </svg>
    `),
    thumbnail: '⚡',
  },
];
