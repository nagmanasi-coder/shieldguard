import { Linking, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const ADMIN_ENABLED_KEY = '@shieldguard_device_admin'

export async function isDeviceAdminEnabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try { const stored = await AsyncStorage.getItem(ADMIN_ENABLED_KEY); return stored === 'true' } catch { return false }
}

export function setDeviceAdminStatus(enabled: boolean): Promise<void> {
  return AsyncStorage.setItem(ADMIN_ENABLED_KEY, enabled ? 'true' : 'false')
}

export async function promptEnableDeviceAdmin(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try { await Linking.openURL('package:com.shieldguard.child'); return true }
  catch (err) { console.error('Failed to open device admin settings:', err); return false }
}

export async function openNotificationSettings(): Promise<void> {
  if (Platform.OS !== 'android') return
  try { await Linking.openURL('package:com.shieldguard.child') } catch (err) { console.error('Failed:', err) }
}

export async function canUninstall(): Promise<boolean> { const adminEnabled = await isDeviceAdminEnabled(); return !adminEnabled }