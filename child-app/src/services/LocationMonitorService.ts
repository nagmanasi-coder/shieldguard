import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

const LOCATION_PERMISSION_KEY = '@shieldguard_location_permission'

export async function requestLocationSetup(): Promise<{ foreground: boolean; background: boolean }> {
  const result = { foreground: false, background: false }

  try {
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync()
    result.foreground = foregroundStatus === 'granted'

    if (foregroundStatus === 'granted' && Platform.OS === 'android') {
      const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync()
      result.background = backgroundStatus === 'granted'
    }

    await AsyncStorage.setItem(LOCATION_PERMISSION_KEY, JSON.stringify(result))
  } catch (err) {
    console.error('Location permission request failed:', err)
  }

  return result
}

export async function getLastKnownLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== 'granted') return null

    const location = await Location.getLastKnownPositionAsync({ maxAge: 120000 })
    if (location) {
      return { latitude: location.coords.latitude, longitude: location.coords.longitude }
    }
  } catch (err) {
    console.error('Failed to get last known location:', err)
  }
  return null
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number; timestamp: string } | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()
    if (status !== 'granted') return null

    const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      timestamp: new Date(location.timestamp).toISOString(),
    }
  } catch (err) {
    console.error('Failed to get current location:', err)
  }
  return null
}

export async function hasLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync()
    return status === 'granted'
  } catch {
    return false
  }
}
