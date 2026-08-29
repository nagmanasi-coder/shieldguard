import { NativeModules, NativeEventEmitter, Platform } from 'react-native'

const SOCIAL_APPS: Record<string, string> = {
  'com.whatsapp': 'whatsapp', 'com.instagram.android': 'instagram',
  'com.facebook.Messenger': 'facebook', 'org.telegram.messenger': 'telegram',
  'com.snapchat.android': 'snapchat', 'com.discord': 'discord',
}

export async function startListening(callback: (notification: { app: string; sender: string | null; content: string }) => void) {
  if (Platform.OS !== 'android') return
  try {
    const { NotificationListenerModule } = NativeModules
    if (!NotificationListenerModule) return
    const hasPermission = await NotificationListenerModule.requestPermission()
    if (!hasPermission) return
    const emitter = new NativeEventEmitter(NotificationListenerModule)
    emitter.addListener('onNotificationPosted', (notification: any) => {
      const appKey = SOCIAL_APPS[notification.packageName || '']
      if (appKey) callback({ app: appKey, sender: notification.title || null, content: notification.text || notification.bigText || '' })
    })
    await NotificationListenerModule.startListening()
  } catch (err) { console.log('Notification listener not available') }
}