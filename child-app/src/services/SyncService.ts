import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import CONFIG from '../config'

const API_URL = CONFIG.API_URL
const DEVICE_ID_KEY = '@shieldguard_device_id'
const LOCATION_PERMISSION_KEY = '@shieldguard_location_permission'
let deviceId: string | null = null

async function requestLocationSetup(): Promise<void> {
  try {
    const Location = require('expo-location')
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status === 'granted' && Platform.OS === 'android') {
      await Location.requestBackgroundPermissionsAsync()
    }
  } catch (err) { console.error('Location permission failed:', err) }
}

export async function initializeMonitoring() {
  await autoRegister()
  await requestPermissions()
  await startBackgroundLocation()
  const { initializeSmartSync } = await import('./SmartSyncService')
  await initializeSmartSync()
}

async function autoRegister() {
  try {
    const stored = await AsyncStorage.getItem(DEVICE_ID_KEY)
    if (stored) { deviceId = stored; return }
    const brand = Platform.OS === 'android' ? Platform.constants?.Brand || 'Android' : 'iPhone'
    const res = await fetch(`${API_URL}/device/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceName: `${brand} Device`, deviceModel: Platform.constants?.Model || 'Unknown', os: Platform.OS, childName: 'Child' })
    })
    const data = await res.json()
    if (res.ok && data.device) { deviceId = data.device.id; await AsyncStorage.setItem(DEVICE_ID_KEY, data.device.id) }
  } catch (err) { console.error('Auto-registration failed:', err) }
}

export async function getDeviceId(): Promise<string | null> {
  if (!deviceId) deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY)
  return deviceId
}

export async function getPairingCode(): Promise<string | null> {
  const id = await getDeviceId(); if (!id) return null
  try { const res = await fetch(`${API_URL}/device/${id}/code`); const data = await res.json(); return data.code || null } catch { return null }
}

async function requestPermissions() {
  const Notifications = require('expo-notifications')
  await Notifications.requestPermissionsAsync()
  await requestLocationSetup()
}

async function startBackgroundLocation() {
  const Location = require('expo-location')
  const TaskManager = require('expo-task-manager')
  const TASK = 'background-location-task'
  TaskManager.defineTask(TASK, async ({ data, error }: any) => {
    if (error || !data) return
    for (const loc of data.locations || []) {
      await syncLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: new Date(loc.timestamp).toISOString() })
    }
  })
  const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK)
  if (!isRegistered) {
    await Location.startLocationUpdatesAsync(TASK, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 60000,
      distanceInterval: 100,
      showsBackgroundLocationIndicator: true,
      foregroundService: { notificationTitle: 'ShieldGuard', notificationBody: 'Protecting your device', notificationColor: '#06b6d4' }
    })
  }
}

export async function syncAllData() {
  const id = await getDeviceId(); if (!id) return
  try {
    const Location = require('expo-location')
    const location = await Location.getCurrentPositionAsync({})
    await syncLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude, timestamp: new Date().toISOString() })
  } catch {}
}

async function syncLocation(data: { latitude: number; longitude: number; timestamp: string }) {
  const id = await getDeviceId(); if (!id) return
  try {
    await fetch(`${API_URL}/device/${id}/locations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
  } catch {}
}

export async function reportThreat(threat: { type: string; severity: string; title: string; description: string; source: string | null }) {
  const id = await getDeviceId(); if (!id) return
  try {
    await fetch(`${API_URL}/device/${id}/threats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(threat)
    })
    const Notifications = require('expo-notifications')
    await Notifications.scheduleNotificationAsync({ content: { title: '🛡️ Threat Detected', body: threat.title }, trigger: null })
  } catch {}
}
