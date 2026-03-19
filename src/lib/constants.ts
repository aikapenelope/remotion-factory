/**
 * Video configuration constants.
 * Vertical format (9:16) for Instagram Reels / TikTok.
 */
export const VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  fps: 30,
  /** Default duration used for Composition registration (overridden at render time). */
  defaultDurationFrames: 30 * 45, // 45 seconds
} as const;
