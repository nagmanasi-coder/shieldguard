// Screenshot capture via native Android MediaProjection API
// Requires: expo-modules-core custom module or react-native-screenshot-detector

import { Platform } from 'react-native'

const SCREENSHOT_DIR = 'screenshots'
let captureCallback: ((imageBase64: string) => void) | null = null

export function onScreenshotTaken(callback: (imageBase64: string) => void) {
  captureCallback = callback
}

export async function requestScreenCapturePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false
  try {
    const { NativeModules } = require('react-native')
    const { ScreenshotModule } = NativeModules
    if (ScreenshotModule) return await ScreenshotModule.requestPermission()
  } catch {}
  return false
n}

export async function captureScreenshot(): Promise<string | null> {
  if (Platform.OS !== 'android') return null
  try {
    const { NativeModules } = require('react-native')
    const { ScreenshotModule } = NativeModules
    if (ScreenshotModule) {
      const screenshot = await ScreenshotModule.captureScreenshot({ quality: 70, format: 'jpeg' })
      if (screenshot && captureCallback) captureCallback(screenshot)
      return screenshot
    }
  } catch (err) { console.error('Screenshot capture failed:', err) }
  return null
}

export async function uploadScreenshot(deviceId: string, apiUrl: string, imageBase64: string, appName: string) {
  try {
    await fetch(`${apiUrl}/device/${deviceId}/screenshots`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appName, packageName: 'unlock_screen',
        imageUrl: `data:image/jpeg;base64,${imageBase64}`,
        thumbnailUrl: `data:image/jpeg;base64,${imageBase64}`,
      }),
    })
  } catch (err) { console.error('Screenshot upload failed:', err) }
}