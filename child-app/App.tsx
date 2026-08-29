import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { isSetupComplete } from './services/BootService'
import { initializeMonitoring, getPairingCode } from './services/SyncService'
import { initializeSmartSync, manualSync, getSyncStats, type SyncStats } from './services/SmartSyncService'
import { getCurrentScreenState, onScreenStateChange, type ScreenState } from './services/ScreenStateService'
import SetupScreen from './src/components/SetupScreen'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(false)
  const [isProtected, setIsProtected] = useState(false)
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [screenState, setScreenState] = useState<ScreenState>('active')
  const [syncStats, setSyncStats] = useState<SyncStats>({
    locationPings: 0, fullSyncs: 0, screenshots: 0,
    skippedSyncs: 0, writesSaved: 0, lastSyncReason: '', lastSyncTime: '',
  })

  useEffect(() => { checkSetupStatus() }, [])

  async function checkSetupStatus() {
    try {
      const complete = await isSetupComplete()
      setSetupComplete(complete)
      if (complete) await startBackgroundMonitoring()
    } catch (err) { console.error('Setup check failed:', err) }
    finally { setLoading(false) }
  }

  async function startBackgroundMonitoring() {
    try {
      await initializeMonitoring()
      setIsProtected(true)
      setScreenState(getCurrentScreenState())
      onScreenStateChange((state) => setScreenState(state))
      const code = await getPairingCode()
      setPairingCode(code)
      setInterval(() => { setSyncStats(getSyncStats()) }, 30000)
      setSyncStats(getSyncStats())
    } catch (err) { console.error('Background monitoring failed:', err) }
  }

  function handleSetupComplete() { setSetupComplete(true); startBackgroundMonitoring() }

  if (loading) return (<View style={styles.container}><StatusBar barStyle="light-content" backgroundColor="#0f172a" /><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#10b981" /><Text style={styles.loadingText}>Checking protection status...</Text></View></View>)
  if (!setupComplete) return <SetupScreen onComplete={handleSetupComplete} />

  const screenStateColor = screenState === 'active' ? '#10b981' : screenState === 'inactive' ? '#f59e0b' : '#64748b'
  const screenStateLabel = screenState === 'active' ? '🟢 Screen Active' : screenState === 'inactive' ? '🟡 Screen Inactive' : screenState === 'locked' ? '🔒 Screen Locked' : '📱 Background'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.shieldIcon}><Ionicons name="shield-checkmark" size={48} color="#10b981" /></View>
          <Text style={styles.title}>ShieldGuard Safe</Text>
          <Text style={styles.subtitle}>{isProtected ? 'Smart Protection Active' : 'Starting protection...'}</Text>
        </View>
        <View style={[styles.statusCard, { backgroundColor: `${screenStateColor}15` }]}>
          <Ionicons name={screenState === 'locked' ? 'lock-closed' : 'phone-portrait'} size={24} color={screenStateColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusText, { color: screenStateColor }]}>{screenStateLabel}</Text>
            <Text style={styles.statusSubtext}>{screenState === 'active' || screenState === 'inactive' ? 'Full sync: location + data + screenshot on unlock' : 'Battery-saving: location ping only'}</Text>
          </View>
        </View>
        {pairingCode && (
          <View style={styles.pairingCard}>
            <Text style={styles.pairingLabel}>Pairing Code</Text>
            <Text style={styles.pairingCode}>{pairingCode}</Text>
            <Text style={styles.pairingHint}>Share this with your parent to link your device</Text>
          </View>
        )}
        <View style={styles.efficiencyCard}>
          <Text style={styles.efficiencyTitle}>⚡ Sync Efficiency</Text>
          <View style={styles.effRow}>
            <View style={styles.effItem}><Text style={styles.effNumber}>{syncStats.locationPings}</Text><Text style={styles.effLabel}>Location Pings</Text></View>
            <View style={styles.effItem}><Text style={styles.effNumber}>{syncStats.fullSyncs}</Text><Text style={styles.effLabel}>Full Syncs</Text></View>
            <View style={styles.effItem}><Text style={styles.effNumber}>{syncStats.screenshots}</Text><Text style={styles.effLabel}>Screenshots</Text></View>
            <View style={styles.effItem}><Text style={[styles.effNumber, { color: '#10b981' }]}>{syncStats.writesSaved}</Text><Text style={styles.effLabel}>Writes Saved</Text></View>
          </View>
          {syncStats.lastSyncReason && (<View style={styles.lastSyncRow}><Ionicons name="time-outline" size={14} color="#64748b" /><Text style={styles.lastSyncText}>Last: {syncStats.lastSyncReason}</Text></View>) }
        </View>
        <View style={styles.monitoringCard}>
          <Text style={styles.monitoringTitle}>Active Monitoring</Text>
          {[{ icon: 'location-outline', color: '#10b981', text: 'Location', interval: 'Always' }, { icon: 'camera-outline', color: '#3b82f6', text: 'Screenshot on Unlock', interval: 'On unlock' }, { icon: 'chatbubble-outline', color: '#8b5cf6', text: 'SMS Monitoring', interval: 'On unlock' }, { icon: 'call-outline', color: '#f59e0b', text: 'Call Log', interval: 'On unlock' }, { icon: 'shield-outline', color: '#06b6d4', text: 'Threat Detection', interval: 'On unlock' }, { icon: 'boot-outline', color: '#64748b', text: 'Auto-Start After Reboot', interval: 'Always' }].map((item, i) => (
            <View key={i} style={styles.monitoringItem}><Ionicons name={item.icon as any} size={20} color={item.color} /><Text style={styles.monitoringText}>{item.text}</Text><Text style={styles.monitoringInterval}>{item.interval}</Text><View style={[styles.badge, { backgroundColor: `${item.color}20` }]}><Text style={[styles.badgeText, { color: item.color }]}>Active</Text></View></View>
          ))}
        </View>
        <TouchableOpacity style={styles.syncButton} onPress={manualSync}><Ionicons name="refresh" size={20} color="#fff" /><Text style={styles.syncButtonText}>Sync Now</Text></TouchableOpacity>
        <Text style={styles.footer}>This app runs in the background. You can close it anytime.</Text>
      </ScrollView>
    </View>
  )
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 24 },
  shieldIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 12, marginBottom: 16, gap: 12 },
  statusText: { fontSize: 16, fontWeight: '600' },
  statusSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  pairingCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 2, borderColor: '#10b981' },
  pairingLabel: { fontSize: 14, color: '#94a3b8', marginBottom: 8 },
  pairingCode: { fontSize: 32, fontWeight: 'bold', color: '#10b981', letterSpacing: 6, marginBottom: 8 },
  pairingHint: { fontSize: 13, color: '#64748b', textAlign: 'center' },
  efficiencyCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  efficiencyTitle: { fontSize: 14, fontWeight: '600', color: '#f59e0b', marginBottom: 16 },
  effRow: { flexDirection: 'row', justifyContent: 'space-around' },
  effItem: { alignItems: 'center' },
  effNumber: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  effLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  lastSyncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1e293b' },
  lastSyncText: { fontSize: 12, color: '#64748b' },
  monitoringCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#334155' },
  monitoringTitle: { fontSize: 14, fontWeight: '600', color: '#10b981', marginBottom: 16 },
  monitoringItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  monitoringText: { flex: 1, fontSize: 14, color: '#e2e8f0' },
  monitoringInterval: { fontSize: 11, color: '#64748b', marginRight: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  syncButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10b981', padding: 14, borderRadius: 12, marginBottom: 16, gap: 8 },
  syncButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 12, lineHeight: 18 },
})