import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BOOT_TASK_NAME = 'shieldguard-boot-task'
const SETUP_COMPLETE_KEY = '@shieldguard_setup_complete'

export async function registerBootTask() {
  if (Platform.OS !== 'android') return
  const { default: TaskManager } = await import('expo-task-manager')
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BOOT_TASK_NAME)
  if (isRegistered) return
  TaskManager.defineTask(BOOT_TASK_NAME, async () => {
    try {
      const setupDone = await AsyncStorage.getItem(SETUP_COMPLETE_KEY)
      if (setupDone !== 'true') return
      const { initializeMonitoring } = await import('./SyncService')
      await initializeMonitoring()
    } catch (err) { console.error('Boot task failed:', err) }
  })
}

export async function isBootTaskRegistered(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try { const { default: TaskManager } = await import('expo-task-manager'); return await TaskManager.isTaskRegisteredAsync(BOOT_TASK_NAME) } catch { return false }
}

export async function markSetupComplete() { await AsyncStorage.setItem(SETUP_COMPLETE_KEY, 'true') }
export async function isSetupComplete(): Promise<boolean> { const val = await AsyncStorage.getItem(SETUP_COMPLETE_KEY); return val === 'true' }