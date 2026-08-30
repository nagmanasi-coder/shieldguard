// AI Guard - Smart sync for local storage
import { Platform } from 'react-native'
import CONFIG from '../config'
import { getCurrentScreenState, getSyncPlan, onScreenStateChange, startScreenStateMonitoring, type ScreenState } from './ScreenStateService'
import { captureAndSaveScreenshot } from './SyncService'
import { updateSessionScreenTime, updateSessionLockTime, getCurrentSession } from './LocalStorageService'

let syncTimer: ReturnType<typeof setInterval> | null = null
let previousScreenState: ScreenState = 'active'
let isSyncing = false
let lastActiveTime = Date.now()
let lastLockTime = Date.now()

export interface SyncStats {
  screenshots: number
  skippedSyncs: number
  writesSaved: number
  lastSyncReason: string
  lastSyncTime: string
  isMonitoring: boolean
}

let stats: SyncStats = { screenshots: 0, skippedSyncs: 0, writesSaved: 0, lastSyncReason: '', lastSyncTime: '', isMonitoring: false }

export async function initializeSmartSync() {
  stats.isMonitoring = true
  startScreenStateMonitoring()
  onScreenStateChange(async (newState) => {
    const now = Date.now()
    if (newState === 'active' && previousScreenState !== 'active') {
      // Screen just unlocked
      if (previousScreenState === 'locked' || previousScreenState === 'inactive') {
        const lockDuration = now - lastLockTime
        await updateSessionLockTime(lockDuration)
        await logScreenEvent('unlock')
      }
      lastActiveTime = now
      await executeSync('unlock')
    } else if (newState === 'locked' || newState === 'inactive') {
      // Screen just locked/inactive
      if (previousScreenState === 'active') {
        const activeDuration = now - lastActiveTime
        await updateSessionScreenTime(activeDuration)
        await logScreenEvent('lock')
        lastLockTime = now
      }
      // Stop screenshots when locked
      stats.lastSyncReason = 'Screen locked — screenshots paused'
      stats.lastSyncTime = new Date().toISOString()
    }
    previousScreenState = newState
  })
  // Screenshot timer - every 10 seconds
  syncTimer = setInterval(async () => { await executeSync('timer') }, CONFIG.SCREENSHOT_INTERVAL)
  await executeSync('boot')
}

async function executeSync(trigger: 'timer' | 'unlock' | 'boot' | 'manual') {
  if (isSyncing) return
  isSyncing = true
  try {
    const screenState = getCurrentScreenState()
    const plan = getSyncPlan(screenState, trigger)
    if (plan.shouldCaptureScreenshot) {
      const success = await captureAndSaveScreenshot()
      if (success) stats.screenshots++
      stats.lastSyncReason = `Screenshot captured (${trigger})`
    } else {
      stats.skippedSyncs++
      stats.writesSaved++
      stats.lastSyncReason = plan.reason
    }
    stats.lastSyncTime = new Date().toISOString()
  } catch (err) { console.error('[AI Guard Sync] Failed:', err) } finally { isSyncing = false }
}

async function logScreenEvent(event: 'lock' | 'unlock') {
  const { logScreenEvent: log } = await import('./LocalStorageService')
  await log(event)
}

export async function manualSync() { await executeSync('manual') }
export function getSyncStats(): SyncStats { return { ...stats } }
export function stopSmartSync() {
  if (syncTimer) { clearInterval(syncTimer); syncTimer = null }
  stats.isMonitoring = false
}
