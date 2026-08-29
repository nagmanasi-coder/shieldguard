import { Platform, NativeModules, NativeEventEmitter } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import CONFIG from '../config'

const API_URL = CONFIG.API_URL
const DEVICE_ID_KEY = '@shieldguard_device_id'
let deviceId: string | null = null

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
    const brand = Platform.OS === 'android' ? require('react-native').Platform.constants?.Brand || 'Android' : 'iPhone'
    const res = await fetch(`${API_URL}/device/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceName: `${brand} Device`, deviceModel: require('react-native').Platform.constants?.Model || 'Unknown', os: Platform.OS, childName: 'Child' }) })
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

import { requestLocationSetup } from './LocationMonitorService'

async function requestPermissions() {
  const { default: Notifications } = await import('expo-notifications')
  await Notifications.requestPermissionsAsync()
  await requestLocationSetup()
}

async function startBackgroundLocation() {
  const { default: Location } = await import('expo-location')
  const { default: TaskManager } = await import('expo-task-manager')
  const TASK = 'background-location-task'
  TaskManager.defineTask(TASK, async ({ data, error }: any) => {
    if (error || !data) return
    for (const loc of data.locations || []) await syncLocation({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, timestamp: new Date(loc.timestamp).toISOString() })
  })
  await Location.startLocationUpdatesAsync(TASK, { accuracy: Location.Accuracy.Balanced, timeInterval: CONFIG.LOCATION_SYNC_INTERVAL, distanceInterval: 100, showsBackgroundLocationIndicator: true, foregroundService: { notificationTitle: 'ShieldGuard', notificationBody: 'Protecting your device', notificationColor: '#06b6d4' } })
}

export async function syncAllData() {
  const id = await getDeviceId(); if (!id) return
  try {
    const { default: Location } = await import('expo-location')
    const location = await Location.getCurrentPositionAsync({})
    await syncLocation({ latitude: location.coords.latitude, longitude: location.coords.longitude, timestamp: new Date().toISOString() })
  } catch {}
}

async function syncLocation(data: { latitude: number; longitude: number; timestamp: string }) {
  const id = await getDeviceId(); if (!id) return
  try { await fetch(`${API_URL}/device/${id}/locations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }) } catch {}
}

export async function reportThreat(threat: { type: string; severity: string; title: string; description: string; source: string | null }) {
  const id = await getDeviceId(); if (!id) return
  try {
    await fetch(`${API_URL}/device/${id}/threats`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(threat) })
    const { default: Notifications } = await import('expo-notifications')
    await Notifications.scheduleNotificationAsync({ content: { title: '🛡️ Threat Detected', body: threat.title }, trigger: null })
  } catch {}
}