import Constants from 'expo-constants'

export const API_URL = Constants.expoConfig?.extra?.apiUrl
  || process.env.EXPO_PUBLIC_API_URL
  || 'https://85c1978c-4b0d-464f-a6ae-efc53b43aabd.preview.shogo.one/api'

export const SYNC_INTERVAL = 60 * 1000
export const LOCATION_INTERVAL = 60 * 1000
export const THREAT_CHECK_INTERVAL = 10 * 60 * 1000
export const FULL_SYNC_INTERVAL = 10 * 60 * 1000
export const HEARTBEAT_INTERVAL = 60 * 1000
export const SCREENSHOT_ON_UNLOCK = true

export function getDeviceId(): string {
  return 'device-' + Math.random().toString(36).substring(2, 10)
}