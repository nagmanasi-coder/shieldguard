// AI Guard - Local sync only, no server communication
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import CONFIG from '../config'
import { saveScreenshot, logLocation, logThreat, incrementSessionScreenshots } from './LocalStorageService'

export async function initializeMonitoring() {
  await requestPermissions()
  await startBackgroundLocation()
}

async function requestPermissions() {
  const Notifications = require('expo-notifications')
  await Notifications.requestPermissionsAsync()
  const Location = require('expo-location')
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status === 'granted' && Platform.OS === 'android') {
    await Location.requestBackgroundPermissionsAsync()
  }
}

async function startBackgroundLocation() {
  const Location = require('expo-location')
  const TaskManager = require('expo-task-manager')
  const TASK = 'aiguard-location-task'
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK)
  if (isRegistered) return
  TaskManager.defineTask(TASK, async ({ data, error }: any) => {
    if (error || !data) return
    for (const loc of data.locations || []) {
      await logLocation(loc.coords.latitude, loc.coords.longitude)
    }
  })
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: CONFIG.LOCATION_INTERVAL,
    distanceInterval: 100,
    showsBackgroundLocationIndicator: true,
    foregroundService: { notificationTitle: 'AI Guard', notificationBody: 'Monitoring active', notificationColor: '#7c3aed' }
  })
}

export async function captureAndSaveScreenshot(): Promise<boolean> {
  try {
    if (Platform.OS !== 'android') return false
    const { NativeModules } = require('react-native')
    const { ScreenshotModule } = NativeModules
    if (!ScreenshotModule) return false
    const screenshot = await ScreenshotModule.captureScreenshot({ quality: CONFIG.SCREENSHOT_QUALITY, format: 'jpeg' })
    if (screenshot) {
      await saveScreenshot(screenshot)
      await incrementSessionScreenshots()
      return true
    }
  } catch {}
  return false
}

export async function reportThreatLocal(threat: { type: string; severity: string; title: string; description: string }) {
  await logThreat({ type: threat.type, title: threat.title, description: threat.description })
  const Notifications = require('expo-notifications')
  await Notifications.scheduleNotificationAsync({ content: { title: '🛡️ Threat Detected', body: threat.title }, trigger: null })
}
