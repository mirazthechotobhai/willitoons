/**
 * ImgBB Image Upload Service
 * Uses ImgBB API v1 for hosting background and media images permanently.
 */

export const DEFAULT_IMGBB_API_KEY = '9cf974acba9d5d5d715bf14db07d697a';
export const FALLBACK_IMGBB_API_KEYS = [
  '9cf974acba9d5d5d715bf14db07d697a',
  '4c9c148bb0170a455a0ae38d0feeb659',
  '2d7c58852e185c5b9f71c4c1a84f334d',
];
const IMGBB_STORAGE_KEY = 'willitoons_imgbb_api_key';

export function getImgBBApiKey(): string {
  try {
    const saved = localStorage.getItem(IMGBB_STORAGE_KEY);
    if (saved && saved.trim().length > 0) {
      return saved.trim();
    }
  } catch {
    // Ignore localStorage access issues
  }
  return DEFAULT_IMGBB_API_KEY;
}

export function setImgBBApiKey(key: string): void {
  try {
    if (!key || key.trim() === DEFAULT_IMGBB_API_KEY) {
      localStorage.removeItem(IMGBB_STORAGE_KEY);
    } else {
      localStorage.setItem(IMGBB_STORAGE_KEY, key.trim());
    }
  } catch {
    // Ignore localStorage write issues
  }
}

export interface ImgBBUploadResult {
  success: boolean;
  url: string;
  displayUrl: string;
  thumbnailUrl?: string;
  deleteUrl?: string;
  id?: string;
  title?: string;
  width?: number;
  height?: number;
  isFallback?: boolean;
  error?: string;
}

/**
 * Upload an image file to ImgBB.
 * If ImgBB fails (e.g. rate-limit, offline, or transient error),
 * gracefully falls back to a high-resolution base64 data URL so user never loses their asset.
 */
export async function uploadImageToImgBB(
  file: File | Blob,
  customName?: string
): Promise<ImgBBUploadResult> {
  const customKey = getImgBBApiKey();
  const keysToTry = Array.from(new Set([customKey, ...FALLBACK_IMGBB_API_KEYS]));
  const fileName = customName || (file instanceof File ? file.name : `bg-${Date.now()}`);

  for (let k = 0; k < keysToTry.length; k++) {
    const apiKey = keysToTry[k];
    const formData = new FormData();
    formData.append('image', file);
    if (fileName) {
      formData.append('name', fileName.replace(/\.[^/.]+$/, ''));
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && json.success && json.data) {
          const data = json.data;
          return {
            success: true,
            url: data.url || data.display_url,
            displayUrl: data.display_url || data.url,
            thumbnailUrl: data.thumb?.url || data.display_url || data.url,
            deleteUrl: data.delete_url,
            id: data.id,
            title: data.title || fileName,
            width: data.width,
            height: data.height,
            isFallback: false,
          };
        }
      }
    } catch {
      // Continue to next key if available
    }
  }

  // Gracefully fallback to high-resolution local base64 data URL
  console.warn('ImgBB keys exhausted or offline, using local data URL fallback.');
  const fallbackDataUrl = await readFileAsDataURL(file);
  return {
    success: true,
    url: fallbackDataUrl,
    displayUrl: fallbackDataUrl,
    thumbnailUrl: fallbackDataUrl,
    title: fileName,
    isFallback: true,
  };
}

/**
 * Upload a base64 Data URL to ImgBB to get a permanent, worldwide CDN URL.
 * If already a remote URL (http/https), returns it as-is.
 * If upload fails, falls back gracefully to the base64 URL.
 */
export async function uploadBase64ToImgBB(
  base64DataUrl: string,
  customName?: string
): Promise<ImgBBUploadResult> {
  const apiKey = getImgBBApiKey();
  const fileName = customName || `sprite-${Date.now()}`;

  // If already an HTTP/HTTPS URL, return it directly
  if (base64DataUrl.startsWith('http://') || base64DataUrl.startsWith('https://')) {
    return {
      success: true,
      url: base64DataUrl,
      displayUrl: base64DataUrl,
      thumbnailUrl: base64DataUrl,
      title: fileName,
      isFallback: false,
    };
  }

  try {
    const cleanBase64 = base64DataUrl.replace(/^data:image\/[a-zA-Z0-9.+_-]+;base64,/, '');
    const formData = new FormData();
    formData.append('image', cleanBase64);
    if (customName) {
      formData.append('name', customName);
    }

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: 'POST',
      body: formData,
    });

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data) {
        const data = json.data;
        return {
          success: true,
          url: data.url || data.display_url,
          displayUrl: data.display_url || data.url,
          thumbnailUrl: data.thumb?.url || data.display_url || data.url,
          deleteUrl: data.delete_url,
          id: data.id,
          title: data.title || fileName,
          width: data.width,
          height: data.height,
          isFallback: false,
        };
      }
    }
  } catch (err) {
    console.warn('ImgBB base64 upload failed, using fallback:', err);
  }

  return {
    success: true,
    url: base64DataUrl,
    displayUrl: base64DataUrl,
    thumbnailUrl: base64DataUrl,
    title: fileName,
    isFallback: true,
  };
}

/**
 * Convert file to base64 DataURL
 */
function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
