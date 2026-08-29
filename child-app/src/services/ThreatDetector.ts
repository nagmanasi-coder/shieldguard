import { reportThreat } from './SyncService'

const PHISHING_KEYWORDS = ['click here', 'verify your account', 'won a prize', 'free iphone', 'urgent action required', 'account suspended', 'confirm your identity', 'bit.ly', 'tinyurl', 't.co', '.xyz', '.tk', '.ml']
const MALICIOUS_EXTENSIONS = ['.apk', '.exe', '.bat', '.cmd', '.scr']

export async function scanUrl(url: string) {
  const lower = url.toLowerCase()
  if (PHISHING_KEYWORDS.some((kw) => lower.includes(kw))) {
    await reportThreat({ type: 'phishing', severity: 'high', title: 'Suspicious Link Detected', description: `Potential phishing URL: ${url}`, source: 'URL Scanner' })
    return true
  }
  return false
}

export async function scanSmsContent(content: string) {
  const lower = content.toLowerCase()
  if (PHISHING_KEYWORDS.some((kw) => lower.includes(kw))) {
    await reportThreat({ type: 'phishing', severity: 'high', title: 'Phishing SMS Detected', description: `Suspicious SMS: ${content.substring(0, 100)}`, source: 'SMS Scanner' })
    return true
  }
  return false
}

export async function scanInstalledApp(packageName: string, permissions: string[]) {
  const dangerous = ['android.permission.READ_SMS', 'android.permission.READ_CALL_LOG', 'android.permission.CAMERA', 'android.permission.RECORD_AUDIO', 'android.permission.ACCESS_FINE_LOCATION']
  const count = permissions.filter((p) => dangerous.includes(p)).length
  if (count >= 4) {
    await reportThreat({ type: 'suspicious_app', severity: 'medium', title: 'App with Excessive Permissions', description: `App ${packageName} requires ${count} dangerous permissions`, source: 'App Monitor' })
    return true
  }
  return false
}