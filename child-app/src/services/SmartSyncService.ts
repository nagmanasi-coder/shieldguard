import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import CONFIG from '../config'
import { getCurrentScreenState, getSyncPlan, onScreenStateChange, startScreenStateMonitoring, type ScreenState } from './ScreenStateService'
import { getDeviceId, syncAllData } from './SyncService'

const API_URL = CONFIG.API_URL
const SYNC_STATS_KEY = '@shieldguard_sync_stats'

let syncTimer: ReturnType<typeof setInterval> | null = null
let previousScreenState: ScreenState = 'active'
let isSyncing = false

export interface SyncStats {
  locationPings: number; fullSyncs: number; screenshots: number; skippedSyncs: number; writesSaved: number; lastSyncReason: string; lastSyncTime: string
}

let stats: SyncStats = { locationPings: 0, fullSyncs: 0, screenshots: 0, skippedSyncs: 0, writesSaved: 0, lastSyncReason: '', lastSyncTime: '' }

export async function initializeSmartSync() {
  await loadStats()
  startScreenStateMonitoring()
  onScreenStateChange(async (newState) => {
    if (newState === 'active' && previousScreenState !== 'active') await executeSync('unlock')
    previousScreenState = newState
  })
  syncTimer = setInterval(async () => { await executeSync('timer') }, CONFIG.LOCATION_SYNC_INTERVAL)
  await executeSync('boot')
}

async function executeSync(trigger: 'timer' | 'unlock' | 'boot' | 'manual') {
  if (isSyncing) return
  isSyncing = true
  try {
    const screenState = getCurrentScreenState()
    const plan = getSyncPlan(screenState, trigger)
    if (plan.shouldSyncLocation) { await syncLocationOnly(); stats.locationPings++ }
    if (plan.shouldSyncFullData) { await syncAllData(); stats.fullSyncs++ }
    if (plan.shouldCaptureScreenshot) { await captureScreenshotOnUnlock(); stats.screenshots++ }
    if (!plan.shouldSyncFullData) { stats.skippedSyncs++; stats.writesSaved += 6 }
    stats.lastSyncReason = plan.reason
    stats.lastSyncTime = new Date().toISOString()
    await saveStats()
  } catch (err) { console.error('[SmartSync] Failed:', err) } finally { isSyncing = false }
}

async function syncLocationOnly() {
  try {
    const { default: Location } = await import('expo-location')
    const loc = await Location.getLastKnownPositionAsync({ maxAge: 60000 })
    if (loc) {
      const id = await getDeviceId()
      if (!id) return
      await fetch(`${API_URL}/device/${id}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: new Date(loc.timestamp).toISOString() }) })
    }
  } catch {}
}

async function captureScreenshotOnUnlock() {
  const id = await getDeviceId()
  if (!id || Platform.OS !== 'android') return
  try {
    const { NativeModules } = require('react-native')
    const { ScreenshotModule } = NativeModules
    if (ScreenshotModule) {
      const screenshot = await ScreenshotModule.captureScreenshot({ quality: 70, format: 'jpeg' })
      if (screenshot) await fetch(`${API_URL}/device/${id}/screenshots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appName: 'System', packageName: 'unlock_screen', imageUrl: `data:image/jpeg;base64,${screenshot}`, thumbnailUrl: `data:image/jpeg;base64,${screenshot}` }) })
    }
  } catch {}
}

export async function manualSync() { await executeSync('manual') }
export function getSyncStats(): SyncStats { return { ...stats } }
async function loadStats() { try { const s = await AsyncStorage.getItem(SYNC_STATS_KEY); if (s) stats = JSON.parse(s) } catch {} }
async function saveStats() { await AsyncStorage.setItem(SYNC_STATS_KEY, JSON.stringify(stats)) }
export function stopSmartSync() { if (syncTimer) { clearInterval(syncTimer); syncTimer = null } }