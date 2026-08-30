import Constants from 'expo-constants'

const API_URL = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'https://shieldguard.shogo.one/api'

const CONFIG = {
  API_URL,
  SYNC_INTERVAL: 60 * 1000,
  LOCATION_SYNC_INTERVAL: 60 * 1000,
  THREAT_CHECK_INTERVAL: 10 * 60 * 1000,
  FULL_SYNC_INTERVAL: 10 * 60 * 1000,
  HEARTBEAT_INTERVAL: 60 * 1000,
  SCREENSHOT_ON_UNLOCK: true,
}

export default CONFIG

export function getDeviceId(): string {
  return 'device-' + Math.random().toString(36).substring(2, 10)
}
