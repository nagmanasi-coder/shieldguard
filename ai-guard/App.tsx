import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { isSetupComplete } from './src/services/BootService'
import { initializeMonitoring } from './src/services/SyncService'
import { initializeSmartSync, manualSync, getSyncStats, stopSmartSync, type SyncStats } from './src/services/SmartSyncService'
import { getCurrentScreenState, onScreenStateChange, type ScreenState } from './src/services/ScreenStateService'
import { startSession, endSession, getCurrentSession, getStats, deleteOldScreenshots, type SessionData, type DeviceStats } from './src/services/LocalStorageService'
import SetupScreen from './src/components/SetupScreen'
import ReportViewer from './src/components/ReportViewer'

export default function App() {
  const [loading, setLoading] = useState(true)
  const [setupComplete, setSetupComplete] = useState(false)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [screenState, setScreenState] = useState<ScreenState>('active')
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null)
  const [stats, setStats] = useState<DeviceStats | null>(null)
  const [syncStats, setSyncStats] = useState<SyncStats>({
    screenshots: 0, skippedSyncs: 0, writesSaved: 0,
    lastSyncReason: '', lastSyncTime: '', isMonitoring: false,
  })
  const [showReport, setShowReport] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  useEffect(() => { checkSetupStatus(); return () => { if (isMonitoring) stopSmartSync() } }, [])
  useEffect(() => {
    const interval = setInterval(async () => {
      setSyncStats(getSyncStats())
      const sess = await getCurrentSession()
      if (sess) setCurrentSession(sess)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function checkSetupStatus() {
    try {
      const complete = await isSetupComplete()
      setSetupComplete(complete)
      if (complete) {
        onScreenStateChange((state) => setScreenState(state))
        const st = await getStats()
        setStats(st)
        await deleteOldScreenshots()
      }
    } catch (err) { console.error('Setup check failed:', err) }
    finally { setLoading(false) }
  }

  async function handleStartMonitoring() {
    try {
      await initializeMonitoring()
      await initializeSmartSync()
      const session = await startSession()
      setCurrentSession(session)
      setIsMonitoring(true)
      setSyncStats(getSyncStats())
    } catch (err) {
      console.error('Start monitoring failed:', err)
      Alert.alert('Error', 'Failed to start monitoring. Please check permissions.')
    }
  }

  async function handleStopMonitoring() {
    Alert.alert('Stop Monitoring', 'Are you sure you want to stop monitoring?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop', style: 'destructive', onPress: async () => {
        stopSmartSync()
        const session = await endSession()
        setCurrentSession(session)
        setIsMonitoring(false)
        const st = await getStats()
        setStats(st)
      }}
    ])
  }

  async function handleSetupComplete() {
    setSetupComplete(true)
    setShowSetup(false)
    onScreenStateChange((state) => setScreenState(state))
    const st = await getStats()
    setStats(st)
  }

  if (loading) return <View style={styles.container}><StatusBar barStyle="light-content" backgroundColor="#0a0a1a" /><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#7c3aed" /><Text style={styles.loadingText}>Loading AI Guard...</Text></View></View>
  if (showSetup) return <SetupScreen onComplete={handleSetupComplete} />
  if (showReport) return <ReportViewer onBack={() => setShowReport(false)} />

  const screenStateColor = screenState === 'active' ? '#10b981' : screenState === 'inactive' ? '#f59e0b' : '#64748b'
  const screenStateLabel = screenState === 'active' ? '🟢 Screen Active' : screenState === 'inactive' ? '🟡 Screen Inactive' : screenState === 'locked' ? '🔒 Screen Locked' : '📱 Background'

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a1a" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="eye" size={28} color="#7c3aed" />
            <Text style={styles.title}>AI Guard</Text>
          </View>
          <TouchableOpacity onPress={() => setShowSetup(true)} style={styles.settingsBtn}>
            <Ionicons name="settings-outline" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>Silent guardian — tracks everything when lending your phone</Text>

        {/* Main Control */}
        <View style={[styles.controlCard, { borderColor: isMonitoring ? '#10b981' : '#7c3aed' }]}>
          <View style={[styles.controlIcon, { backgroundColor: isMonitoring ? 'rgba(16,185,129,0.15)' : 'rgba(124,58,237,0.15)' }]}>
            <Ionicons name={isMonitoring ? 'eye' : 'eye-off'} size={40} color={isMonitoring ? '#10b981' : '#7c3aed'} />
          </View>
          <Text style={styles.controlTitle}>{isMonitoring ? 'Monitoring Active' : 'Monitoring Paused'}</Text>
          <Text style={styles.controlSubtitle}>{isMonitoring ? 'Screenshots captured every 10 seconds' : 'Tap to start monitoring when lending your phone'}</Text>

          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: isMonitoring ? '#ef4444' : '#7c3aed' }]}
            onPress={isMonitoring ? handleStopMonitoring : handleStartMonitoring}
          >
            <Ionicons name={isMonitoring ? 'stop' : 'play'} size={20} color="#fff" />
            <Text style={styles.controlButtonText}>{isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}</Text>
          </TouchableOpacity>
        </View>

        {/* Screen State */}
        <View style={[styles.stateCard, { backgroundColor: `${screenStateColor}15` }]}>
          <Ionicons name={screenState === 'locked' ? 'lock-closed' : 'phone-portrait'} size={20} color={screenStateColor} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.stateText, { color: screenStateColor }]}>{screenStateLabel}</Text>
            <Text style={styles.stateSubtext}>{isMonitoring ? (screenState === 'active' ? 'Capturing screenshots' : 'Screenshots paused — saving battery') : 'Start monitoring to begin tracking'}</Text>
          </View>
        </View>

        {/* Current Session */}
        {currentSession && currentSession.isActive && (
          <View style={styles.sessionCard}>
            <Text style={styles.sessionTitle}>📊 Current Session</Text>
            <View style={styles.sessionRow}>
              <View style={styles.sessionItem}><Text style={styles.sessionValue}>{currentSession.screenshotCount}</Text><Text style={styles.sessionLabel}>Screenshots</Text></View>
              <View style={styles.sessionItem}><Text style={styles.sessionValue}>{Math.floor(currentSession.totalScreenTime / 60000)}m</Text><Text style={styles.sessionLabel}>Screen Time</Text></View>
              <View style={styles.sessionItem}><Text style={styles.sessionValue}>{Math.floor(currentSession.totalLockTime / 60000)}m</Text><Text style={styles.sessionLabel}>Lock Time</Text></View>
            </View>
          </View>
        )}

        {/* Sync Stats */}
        {isMonitoring && (
          <View style={styles.syncCard}>
            <Text style={styles.syncTitle}>⚡ Live Stats</Text>
            <View style={styles.syncRow}>
              <View style={styles.syncItem}><Text style={styles.syncValue}>{syncStats.screenshots}</Text><Text style={styles.syncLabel}>Captured</Text></View>
              <View style={styles.syncItem}><Text style={styles.syncValue}>{syncStats.skippedSyncs}</Text><Text style={styles.syncLabel}>Skipped</Text></View>
              <View style={styles.syncItem}><Text style={[styles.syncValue, { color: '#10b981' }]}>{syncStats.writesSaved}</Text><Text style={styles.syncLabel}>Saved</Text></View>
            </View>
            {syncStats.lastSyncReason ? <Text style={styles.syncReason}>Last: {syncStats.lastSyncReason}</Text> : null}
          </View>
        )}

        {/* View Report Button */}
        <TouchableOpacity style={styles.reportButton} onPress={() => setShowReport(true)}>
          <Ionicons name="images" size={20} color="#fff" />
          <Text style={styles.reportButtonText}>View Session Report</Text>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* All-Time Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📈 All-Time Stats</Text>
            <View style={styles.statsRow}>
              <View style={styles.statsItem}><Text style={styles.statsValue}>{stats.totalSessions}</Text><Text style={styles.statsLabel}>Sessions</Text></View>
              <View style={styles.statsItem}><Text style={styles.statsValue}>{stats.totalScreenshots}</Text><Text style={styles.statsLabel}>Screenshots</Text></View>
              <View style={styles.statsItem}><Text style={styles.statsValue}>{Math.floor(stats.totalScreenTime / 60000)}m</Text><Text style={styles.statsLabel}>Screen Time</Text></View>
              <View style={styles.statsItem}><Text style={styles.statsValue}>{stats.totalThreats}</Text><Text style={styles.statsLabel}>Threats</Text></View>
            </View>
          </View>
        )}

        <Text style={styles.footer}>AI Guard runs silently in the background.\nData is stored locally on your device only.</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20 },
  settingsBtn: { padding: 8 },
  controlCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 2, marginBottom: 16 },
  controlIcon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  controlTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  controlSubtitle: { fontSize: 13, color: '#94a3b8', textAlign: 'center', marginBottom: 20 },
  controlButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, gap: 8, width: '100%' },
  controlButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  stateCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 16, gap: 10 },
  stateText: { fontSize: 14, fontWeight: '600' },
  stateSubtext: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  sessionCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  sessionTitle: { fontSize: 14, fontWeight: '600', color: '#7c3aed', marginBottom: 12 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-around' },
  sessionItem: { alignItems: 'center' },
  sessionValue: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  sessionLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  syncCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  syncTitle: { fontSize: 14, fontWeight: '600', color: '#f59e0b', marginBottom: 12 },
  syncRow: { flexDirection: 'row', justifyContent: 'space-around' },
  syncItem: { alignItems: 'center' },
  syncValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  syncLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  syncReason: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  reportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155', gap: 12 },
  reportButtonText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#e2e8f0' },
  statsCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  statsTitle: { fontSize: 14, fontWeight: '600', color: '#10b981', marginBottom: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statsItem: { alignItems: 'center' },
  statsValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  statsLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  footer: { textAlign: 'center', color: '#64748b', fontSize: 12, lineHeight: 18, marginTop: 8 },
})