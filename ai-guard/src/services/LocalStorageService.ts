import AsyncStorage from '@react-native-async-storage/async-storage'
import * as FileSystem from 'expo-file-system'
import CONFIG from '../config'

const SCREENSHOTS_DIR = FileSystem.documentDirectory + 'aiguard_screenshots/'
const ACTIVITY_LOG_KEY = '@aiguard_activity_log'
const SESSION_KEY = '@aiguard_session'
const LOCATION_LOG_KEY = '@aiguard_location_log'
const APP_USAGE_KEY = '@aiguard_app_usage'
const THREATS_KEY = '@aiguard_threats'
const STATS_KEY = '@aiguard_stats'

export interface SessionData {
  id: string
  startTime: string
  endTime: string | null
  totalScreenTime: number
  totalLockTime: number
  screenshotCount: number
  isActive: boolean
}

export interface ActivityEntry {
  timestamp: string
  type: 'screenshot' | 'location' | 'app_usage' | 'threat' | 'lock' | 'unlock'
  data: any
}

export interface DeviceStats {
  totalSessions: number
  totalScreenTime: number
  totalScreenshots: number
  totalLocationPings: number
  totalThreats: number
  lastSessionDate: string | null
}

// Screenshot storage
export async function saveScreenshot(base64: string): Promise<string | null> {
  try {
    await ensureDir(SCREENSHOTS_DIR)
    const filename = `ss_${Date.now()}.jpg`
    const filepath = SCREENSHOTS_DIR + filename
    await FileSystem.writeAsStringAsync(filepath, base64, { encoding: FileSystem.EncodingType.Base64 })
    await logActivity({ timestamp: new Date().toISOString(), type: 'screenshot', data: { filename, size: base64.length } })
    await updateStats({ screenshotIncrement: 1 })
    return filepath
  } catch (err) { console.error('Save screenshot failed:', err); return null }
}

export async function getScreenshotFiles(): Promise<string[]> {
  try {
    await ensureDir(SCREENSHOTS_DIR)
    const files = await FileSystem.readDirectoryAsync(SCREENSHOTS_DIR)
    return files.filter(f => f.startsWith('ss_')).sort()
  } catch { return [] }
}

export async function getScreenshotCount(): Promise<number> {
  const files = await getScreenshotFiles()
  return files.length
}

export async function deleteOldScreenshots() {
  try {
    const files = await getScreenshotFiles()
    const cutoff = Date.now() - (CONFIG.SCREENSHOT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    let deleted = 0
    for (const file of files) {
      const timestamp = parseInt(file.replace('ss_', '').replace('.jpg', ''))
      if (timestamp < cutoff) {
        await FileSystem.deleteAsync(SCREENSHOTS_DIR + file, { idempotent: true })
        deleted++
      }
    }
    if (deleted > 0) console.log(`[AI Guard] Deleted ${deleted} old screenshots`)
  } catch {}
}

export async function cleanup excessScreenshots() {
  try {
    const files = await getScreenshotFiles()
    if (files.length > CONFIG.MAX_SCREENSHOTS) {
      const excess = files.slice(0, files.length - CONFIG.MAX_SCREENSHOTS)
      for (const file of excess) {
        await FileSystem.deleteAsync(SCREENSHOTS_DIR + file, { idempotent: true })
      }
      console.log(`[AI Guard] Cleaned ${excess.length} excess screenshots`)
    }
  } catch {}
}

// Activity log
async function logActivity(entry: ActivityEntry) {
  try {
    const logs = await getActivityLog()
    logs.push(entry)
    // Keep last 1000 entries
    if (logs.length > 1000) logs.splice(0, logs.length - 1000)
    await AsyncStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs))
  } catch {}
}

export async function getActivityLog(): Promise<ActivityEntry[]> {
  try {
    const data = await AsyncStorage.getItem(ACTIVITY_LOG_KEY)
    return data ? JSON.parse(data) : []
  } catch { return [] }
}

export async function logLocation(latitude: number, longitude: number) {
  await logActivity({ timestamp: new Date().toISOString(), type: 'location', data: { latitude, longitude } })
  await updateStats({ locationIncrement: 1 })
}

export async function logAppUsage(appName: string, duration: number) {
  await logActivity({ timestamp: new Date().toISOString(), type: 'app_usage', data: { appName, duration } })
}

export async function logThreat(threat: { type: string; title: string; description: string }) {
  await logActivity({ timestamp: new Date().toISOString(), type: 'threat', data: threat })
  await updateStats({ threatIncrement: 1 })
}

export async function logScreenEvent(event: 'lock' | 'unlock', screenTime?: number) {
  await logActivity({ timestamp: new Date().toISOString(), type: event, data: { screenTime } })
}

// Session management
export async function startSession(): Promise<SessionData> {
  const session: SessionData = {
    id: 'session_' + Date.now(),
    startTime: new Date().toISOString(),
    endTime: null,
    totalScreenTime: 0,
    totalLockTime: 0,
    screenshotCount: 0,
    isActive: true,
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return session
}

export async function endSession(): Promise<SessionData | null> {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY)
    if (!data) return null
    const session: SessionData = JSON.parse(data)
    session.endTime = new Date().toISOString()
    session.isActive = false
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    await updateStats({ sessionIncrement: 1, screenTimeAdd: session.totalScreenTime })
    return session
  } catch { return null }
}

export async function getCurrentSession(): Promise<SessionData | null> {
  try {
    const data = await AsyncStorage.getItem(SESSION_KEY)
    return data ? JSON.parse(data) : null
  } catch { return null }
}

export async function updateSessionScreenTime(additionalTime: number) {
  try {
    const session = await getCurrentSession()
    if (session && session.isActive) {
      session.totalScreenTime += additionalTime
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {}
}

export async function updateSessionLockTime(additionalTime: number) {
  try {
    const session = await getCurrentSession()
    if (session && session.isActive) {
      session.totalLockTime += additionalTime
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {}
}

export async function incrementSessionScreenshots() {
  try {
    const session = await getCurrentSession()
    if (session && session.isActive) {
      session.screenshotCount++
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    }
  } catch {}
}

// Stats
async function updateStats(update: { screenshotIncrement?: number; locationIncrement?: number; threatIncrement?: number; sessionIncrement?: number; screenTimeAdd?: number }) {
  try {
    const stats = await getStats()
    if (update.screenshotIncrement) stats.totalScreenshots += update.screenshotIncrement
    if (update.locationIncrement) stats.totalLocationPings += update.locationIncrement
    if (update.threatIncrement) stats.totalThreats += update.threatIncrement
    if (update.sessionIncrement) stats.totalSessions += update.sessionIncrement
    if (update.screenTimeAdd) stats.totalScreenTime += update.screenTimeAdd
    stats.lastSessionDate = new Date().toISOString()
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch {}
}

export async function getStats(): Promise<DeviceStats> {
  try {
    const data = await AsyncStorage.getItem(STATS_KEY)
    return data ? JSON.parse(data) : { totalSessions: 0, totalScreenTime: 0, totalScreenshots: 0, totalLocationPings: 0, totalThreats: 0, lastSessionDate: null }
  } catch {
    return { totalSessions: 0, totalScreenTime: 0, totalScreenshots: 0, totalLocationPings: 0, totalThreats: 0, lastSessionDate: null }
  }
}

// Helper
async function ensureDir(dir: string) {
  try {
    const info = await FileSystem.getInfoAsync(dir)
    if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true })
  } catch {}
}
