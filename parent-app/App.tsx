import React, { useEffect, useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, StatusBar, TextInput, Dimensions,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://85c1978c-4b0d-464f-a6ae-efc53b43aabd.preview.shogo.one/api'
const { width } = Dimensions.get('window')

interface Child { id: string; name: string; devices: { id: string; name: string; isOnline: boolean; lastSeen: string; locations: { latitude: number; longitude: number; address: string | null }[]; threats: { severity: string }[] }[] }
interface Alert { id: string; title: string; message: string; severity: string; type: string; isRead: boolean; timestamp: string }

function formatRelativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function App() {
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [children, setChildren] = useState<Child[]>([])
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)

  const fetchData = useCallback(async () => {
    if (!authToken) return
    try {
      const res = await fetch(`${API_URL}/dashboard`, { headers: { Authorization: `Bearer ${authToken}` } })
      const data = await res.json()
      if (res.ok) { setChildren(data.children || []); setAlerts(data.alerts || []); if (data.children?.[0] && !selectedChild) setSelectedChild(data.children[0]) }
      else if (res.status === 401) { setAuthToken(null); setUser(null) }
    } catch {}
  }, [authToken, selectedChild])

  useEffect(() => { fetchData(); if (!authToken) return; const i = setInterval(fetchData, 30000); return () => clearInterval(i) }, [fetchData, authToken])
  useEffect(() => { setAuthChecked(true) }, [])

  const handleLogin = async () => {
    if (!email || !password) { setLoginError('Please enter email and password'); return }
    setLoginLoading(true); setLoginError('')
    try {
      const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (res.ok && data.token) { setAuthToken(data.token); setUser(data.user) } else { setLoginError(data.error || 'Invalid credentials') }
    } catch { setLoginError('Network error') } finally { setLoginLoading(false) }
  }

  const handleLogout = () => { setAuthToken(null); setUser(null); setEmail(''); setPassword(''); setChildren([]); setAlerts([]); setSelectedChild(null) }
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false) }

  if (!authChecked) return <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color="#10b981" /></View>

  if (!authToken) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ScrollView contentContainerStyle={styles.loginContent}>
          <View style={styles.loginHeader}>
            <View style={styles.loginIcon}><Ionicons name="shield-checkmark" size={48} color="#10b981" /></View>
            <Text style={styles.loginTitle}>ShieldGuard</Text>
            <Text style={styles.loginSubtitle}>Parent Dashboard</Text>
          </View>
          <View style={styles.loginCard}>
            <Text style={styles.loginLabel}>Email</Text>
            <TextInput style={styles.loginInput} placeholder="parent@example.com" placeholderTextColor="#64748b" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Text style={styles.loginLabel}>Password</Text>
            <TextInput style={styles.loginInput} placeholder="Enter password" placeholderTextColor="#64748b" value={password} onChangeText={setPassword} secureTextEntry />
            {loginError ? (<View style={styles.loginError}><Ionicons name="alert-circle" size={16} color="#ef4444" /><Text style={styles.loginErrorText}>{loginError}</Text></View>) : null}
            <TouchableOpacity style={[styles.loginButton, loginLoading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loginLoading}>
              {loginLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginButtonText}>Sign In</Text>}
            </TouchableOpacity>
            <Text style={styles.loginDemo}>Demo: sarah@example.com / password</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    )
  }

  const unreadAlerts = alerts.filter(a => !a.isRead)
  const totalThreats = children.reduce((acc, child) => acc + child.devices.reduce((dacc, device) => dacc + device.threats.length, 0), 0)

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}>
        <View style={styles.header}>
          <View style={styles.headerLeft}><Ionicons name="shield-checkmark" size={28} color="#10b981" /><Text style={styles.headerTitle}>ShieldGuard</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {user ? <Text style={{ color: '#94a3b8', fontSize: 12 }}>{user.name}</Text> : null}
            <TouchableOpacity onPress={handleLogout} style={{ padding: 6 }}><Ionicons name="log-out" size={20} color="#94a3b8" /></TouchableOpacity>
            {unreadAlerts.length > 0 && <View style={styles.alertBadge}><Text style={styles.alertBadgeText}>{unreadAlerts.length}</Text></View>}
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}><Ionicons name="people" size={22} color="#10b981" /><Text style={styles.statNumber}>{children.length}</Text><Text style={styles.statLabel}>Children</Text></View>
          <View style={styles.statCard}><Ionicons name="wifi" size={22} color="#3b82f6" /><Text style={styles.statNumber}>{children.filter(c => c.devices.some(d => d.isOnline)).length}</Text><Text style={styles.statLabel}>Online</Text></View>
          <View style={styles.statCard}><Ionicons name="warning" size={22} color="#f59e0b" /><Text style={styles.statNumber}>{totalThreats}</Text><Text style={styles.statLabel}>Threats</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Your Children</Text>
        {children.map((child) => {
          const device = child.devices[0]
          const loc = device?.locations?.[0]
          const isSelected = selectedChild?.id === child.id
          return (
            <TouchableOpacity key={child.id} style={[styles.childCard, isSelected && styles.childCardSelected]} onPress={() => setSelectedChild(child)}>
              <View style={styles.childHeader}>
                <View style={styles.childAvatar}><Text style={styles.childAvatarText}>{child.name.charAt(0)}</Text></View>
                <View style={styles.childInfo}><Text style={styles.childName}>{child.name}</Text><Text style={styles.childDevice}>{device?.name || 'No device'}</Text></View>
                <View style={[styles.onlineDot, { backgroundColor: device?.isOnline ? '#10b981' : '#64748b' }]} />
              </View>
              <View style={styles.childDetails}>
                <View style={styles.childDetail}><Ionicons name="location" size={14} color="#94a3b8" /><Text style={styles.childDetailText} numberOfLines={1}>{loc?.address || 'Location unavailable'}</Text></View>
                {device?.threats?.length > 0 && <View style={styles.childDetail}><Ionicons name="warning" size={14} color="#f59e0b" /><Text style={[styles.childDetailText, { color: '#f59e0b' }]}>{device.threats.length} threats</Text></View>}
              </View>
            </TouchableOpacity>
          )
        })}

        {selectedChild && selectedChild.devices[0] && (
          <><Text style={styles.sectionTitle}>Device Health</Text>
          <View style={styles.healthCard}>
            <View style={styles.healthItem}><View style={[styles.healthDot, { backgroundColor: '#10b981' }]} /><Text style={styles.healthLabel}>Protection Active</Text><Text style={styles.healthValue}>{selectedChild.devices[0].isOnline ? 'Running' : 'Offline'}</Text></View>
            <View style={styles.healthItem}><View style={[styles.healthDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.healthLabel}>Device Admin</Text><Text style={styles.healthValue}>{selectedChild.devices[0].isOnline ? 'Enabled' : 'Unknown'}</Text></View>
            <View style={styles.healthItem}><View style={[styles.healthDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.healthLabel}>Battery Optimized</Text><Text style={styles.healthValue}>Whitelisted</Text></View>
            <View style={styles.healthItem}><View style={[styles.healthDot, { backgroundColor: '#8b5cf6' }]} /><Text style={styles.healthLabel}>Last Seen</Text><Text style={styles.healthValue}>{formatRelativeTime(selectedChild.devices[0].lastSeen)}</Text></View>
          </View></>
        )}

        {alerts.length > 0 && (<><Text style={styles.sectionTitle}>Recent Alerts</Text>
          {alerts.slice(0, 5).map((alert) => (
            <View key={alert.id} style={[styles.alertCard, alert.severity === 'critical' && styles.alertCritical, alert.severity === 'warning' && styles.alertWarning, alert.isRead && styles.alertRead]}>
              <View style={styles.alertHeader}><Text style={styles.alertTitle}>{alert.title}</Text><View style={[styles.severityBadge, { backgroundColor: alert.severity === 'critical' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)' }]}><Text style={[styles.severityText, { color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }]}>{alert.severity}</Text></View></View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>{formatRelativeTime(alert.timestamp)}</Text>
            </View>
          ))}
        </>)}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  alertBadge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  alertBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#e2e8f0', marginBottom: 12, marginTop: 8 },
  childCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  childCardSelected: { borderColor: '#10b981', borderWidth: 2 },
  childHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  childAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(16,185,129,0.2)', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#10b981' },
  childInfo: { flex: 1 },
  childName: { fontSize: 16, fontWeight: '600', color: '#e2e8f0' },
  childDevice: { fontSize: 12, color: '#94a3b8' },
  onlineDot: { width: 10, height: 10, borderRadius: 5 },
  childDetails: { marginTop: 12, gap: 6 },
  childDetail: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  childDetailText: { fontSize: 12, color: '#94a3b8', flex: 1 },
  healthCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  healthItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthLabel: { flex: 1, fontSize: 14, color: '#e2e8f0' },
  healthValue: { fontSize: 13, color: '#94a3b8' },
  alertCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  alertCritical: { borderColor: 'rgba(239,68,68,0.5)', backgroundColor: 'rgba(239,68,68,0.05)' },
  alertWarning: { borderColor: 'rgba(245,158,11,0.5)', backgroundColor: 'rgba(245,158,11,0.05)' },
  alertRead: { opacity: 0.6 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  alertTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', flex: 1 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  severityText: { fontSize: 10, fontWeight: '600' },
  alertMessage: { fontSize: 13, color: '#94a3b8', lineHeight: 18 },
  alertTime: { fontSize: 11, color: '#64748b', marginTop: 6 },
  loginContent: { flex: 1, justifyContent: 'center', padding: 24 },
  loginHeader: { alignItems: 'center', marginBottom: 40 },
  loginIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  loginTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  loginSubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  loginCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#334155' },
  loginLabel: { fontSize: 13, fontWeight: '600', color: '#e2e8f0', marginBottom: 6, marginTop: 12 },
  loginInput: { backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 10, padding: 14, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#334155' },
  loginError: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 10, backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8 },
  loginErrorText: { fontSize: 13, color: '#ef4444' },
  loginButton: { backgroundColor: '#10b981', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginDemo: { textAlign: 'center', color: '#64748b', fontSize: 12, marginTop: 16 },
})