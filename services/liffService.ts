import liff from '@line/liff';

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string | undefined;

/** Whether we're running inside LIFF (LINE in-app browser) */
let _isInLiff = false;
let _initPromise: Promise<void> | null = null;
let _userName: string | null = null;

/**
 * Initialize LIFF SDK. Safe to call multiple times — only runs once.
 * If VITE_LIFF_ID is not set, LIFF features are silently disabled.
 */
export function initLiff(): Promise<void> {
  if (_initPromise) return _initPromise;

  if (!LIFF_ID) {
    console.info('[LIFF] No VITE_LIFF_ID set — LIFF features disabled');
    _initPromise = Promise.resolve();
    return _initPromise;
  }

  _initPromise = liff
    .init({ liffId: LIFF_ID })
    .then(async () => {
      _isInLiff = liff.isInClient();
      console.info(`[LIFF] Initialized. In LINE client: ${_isInLiff}`);
      // Auto-fetch user profile if logged in
      if (liff.isLoggedIn()) {
        try {
          const profile = await liff.getProfile();
          _userName = profile.displayName || null;
          console.info(`[LIFF] User: ${_userName}`);
        } catch { /* ignore */ }
      }
    })
    .catch((err) => {
      console.warn('[LIFF] Init failed — running in normal browser mode', err);
    });

  return _initPromise;
}

/** True if running inside LINE's in-app browser */
export function isInLiff(): boolean {
  return _isInLiff;
}

/** True if LIFF ID is configured (features available) */
export function isLiffEnabled(): boolean {
  return !!LIFF_ID;
}

/** Get LINE user profile (displayName, userId, pictureUrl) */
export async function getLiffProfile() {
  if (!LIFF_ID || !liff.isLoggedIn()) return null;
  try {
    return await liff.getProfile();
  } catch {
    return null;
  }
}

/** Get cached LINE display name (available after init) */
export function getLiffUserName(): string | null {
  return _userName;
}

/**
 * Share an image to a LINE chat via shareTargetPicker.
 * The image must be publicly accessible URL — data URLs won't work.
 * So we upload to a temporary blob URL workaround using Flex Message.
 *
 * Returns true if shared successfully, false otherwise.
 */
export async function shareToLine(imageDataUrl: string): Promise<boolean> {
  if (!LIFF_ID) return false;

  try {
    // Convert data URL to blob
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();

    // shareTargetPicker requires publicly accessible URLs for image messages.
    // As a workaround, we use a Flex Message with the image embedded.
    // However, LINE Flex messages also require public URLs...
    //
    // Best approach: use liff.shareTargetPicker with a "text + image" combo.
    // Since we can't host the image, we'll prompt the user to save & share manually
    // when not in LIFF, or use the file-based share when in LIFF.

    if (liff.isApiAvailable('shareTargetPicker')) {
      // Create a File from the blob for sharing
      const file = new File([blob], 'bebetter-record.jpg', { type: 'image/jpeg' });

      // Use Web Share API through LIFF — this works in LINE's browser
      if (navigator.share) {
        await navigator.share({ files: [file] });
        return true;
      }

      // Fallback: use shareTargetPicker with a text message + instruction
      const result = await liff.shareTargetPicker([
        {
          type: 'text',
          text: '📸 我剛用 BeBetter 記錄了一筆飲食紀錄！持續記錄，持續進步 💪\n\n👉 你也來試試：' + (window.location.origin || 'https://bebetter-diet-log.vercel.app'),
        },
      ]);

      if (result) {
        // Also trigger download so they can send the image separately
        downloadImage(imageDataUrl);
      }
      return !!result;
    }

    return false;
  } catch (err) {
    console.error('[LIFF] Share failed:', err);
    return false;
  }
}

/** Helper: trigger image download */
function downloadImage(dataUrl: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = 'bebetter-record.jpg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** Close the LIFF window (returns user to LINE chat) */
export function closeLiff(): void {
  if (_isInLiff) {
    liff.closeWindow();
  }
}
