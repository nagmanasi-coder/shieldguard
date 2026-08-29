import { Linking, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

const BATTERY_WHITELIST_KEY = '@shieldguard_battery_whitelisted'

export async function isBatteryOptimizationDisabled(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try { const stored = await AsyncStorage.getItem(BATTERY_WHITELIST_KEY); return stored === 'true' } catch { return false }
}

export async function setBatteryWhitelisted(whitelisted: boolean): Promise<void> {
  await AsyncStorage.setItem(BATTERY_WHITELIST_KEY, whitelisted ? 'true' : 'false')
}

export async function promptBatteryWhitelist(): Promise<boolean> {
  if (Platform.OS !== 'android') return true
  try { await Linking.openURL('package:com.shieldguard.child'); return true }
  catch (err) { console.error('Failed to open battery settings:', err); return false }
}

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return
  try { await Linking.openURL('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS') }
  catch { try { await Linking.openURL('android.settings.BATTERY_USAGE_SETTINGS') } catch (err) { console.error('Cannot open battery settings:', err) } }
}