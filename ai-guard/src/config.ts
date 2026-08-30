// AI Guard - Local only, no server needed

const CONFIG = {
  API_URL: '', // Not needed - everything stored locally
  SCREENSHOT_INTERVAL: 10 * 1000, // 10 seconds
  LOCATION_INTERVAL: 60 * 1000, // 60 seconds
  THREAT_CHECK_INTERVAL: 60 * 1000, // 60 seconds
  APP_USAGE_INTERVAL: 60 * 1000, // 60 seconds
  HEARTBEAT_INTERVAL: 60 * 1000,
  MAX_SCREENSHOTS: 5000, // Max screenshots to keep
  SCREENSHOT_RETENTION_DAYS: 7, // Auto-delete after 7 days
  SCREENSHOT_QUALITY: 60, // Lower quality = smaller files
}

export default CONFIG

export function getDeviceId(): string {
  return 'aiguard-' + Math.random().toString(36).substring(2, 10)
}
