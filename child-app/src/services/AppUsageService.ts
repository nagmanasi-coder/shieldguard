import { Platform } from 'react-native'

const API_URL = 'https://your-app-url.shogo.one/api'
const DEVICE_ID = 'YOUR_DEVICE_ID'

interface AppUsageData {
  packageName: string
  appName: string
  totalTime: number
  foregroundTime: number
  openCount: number
}

interface InstalledAppData {
  packageName: string
  name: string
  category: string
  isSystem: boolean
}

export async function getInstalledApps(): Promise<InstalledAppData[]> {
  if (Platform.OS === 'android') {
    try {
      const { NativeModules } = require('react-native')
      const { AppUsageModule } = NativeModules
      if (AppUsageModule) return await AppUsageModule.getInstalledApps()
    } catch (err) { console.error('Failed to get installed apps:', err) }
  }
  return []
}

export async function getAppUsageStats(): Promise<AppUsageData[]> {
  if (Platform.OS === 'android') {
    try {
      const { NativeModules } = require('react-native')
      const { AppUsageModule } = NativeModules
      if (AppUsageModule) {
        const stats = await AppUsageModule.getUsageStats()
        return stats.map((s: any) => ({
          packageName: s.packageName, appName: s.appName,
          totalTime: s.totalTimeInSeconds, foregroundTime: s.foregroundTimeInSeconds, openCount: s.openCount,
        }))
      }
    } catch (err) { console.error('Failed to get app usage stats:', err) }
  }
  return []
}

export async function syncAppData() {
  try {
    const [apps, usage] = await Promise.all([getInstalledApps(), getAppUsageStats()])
    if (apps.length > 0) await fetch(`${API_URL}/device/${DEVICE_ID}/apps`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apps }) })
    if (usage.length > 0) await fetch(`${API_URL}/device/${DEVICE_ID}/app-usage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usage }) })
  } catch (err) { console.error('Failed to sync app data:', err) }
}