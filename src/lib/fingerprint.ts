/**
 * Browser fingerprinting utility for voting system
 * Generates and retrieves a unique ID for each browser/device
 */

const STORAGE_KEY = 'voting_fingerprint';

/**
 * Get or generate a unique browser fingerprint
 * This fingerprint persists in localStorage to identify the browser across sessions
 * @returns A unique UUID string for this browser
 */
export function getBrowserFingerprint(): string {
  // Check if we're in a browser environment
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    throw new Error('getBrowserFingerprint can only be called in browser environment');
  }

  // Try to get existing fingerprint
  let fingerprint = localStorage.getItem(STORAGE_KEY);

  // Generate new fingerprint if not found
  if (!fingerprint) {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      fingerprint = crypto.randomUUID();
    } else {
      // Fallback for non-secure contexts where crypto.randomUUID is not available
      fingerprint = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    localStorage.setItem(STORAGE_KEY, fingerprint);
  }

  return fingerprint;
}

/**
 * Clear the browser fingerprint (useful for testing)
 * After clearing, the next call to getBrowserFingerprint will generate a new one
 */
export function clearBrowserFingerprint(): void {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}
