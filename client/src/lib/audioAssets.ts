/** NOTIFICATION-AUDIO-1 — shared notification sound assets. */

export const AUDIO_ASSETS = {
  OWNER_ALERT: "/audio/mixkit-airport-announcement-ding-1569.wav",
  CUSTOMER_READY: "/audio/mixkit-clock-countdown-bleeps-916.wav",
  KITCHEN_ARRIVAL: "/audio/mixkit-street-public-alarm-997.wav",
} as const;

export type AudioAssetKey = keyof typeof AUDIO_ASSETS;
