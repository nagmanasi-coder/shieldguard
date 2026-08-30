import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system'
import { getScreenshotFiles, getActivityLog, getCurrentSession, getStats, type SessionData, type DeviceStats } from '../services/LocalStorageService'

const { width } = Dimensions.get('window')
const THUMB_SIZE = (width - 60) / 3

interface Props { onBack: () => void }

function formatDuration(ms: number): string {
  const secs = Math.floor(ms / 1000)
  const mins = Math.floor(secs / 60)
  const hrs = Math.floor(mins / 60)
  if (hrs > 0) return `${hrs}h ${mins % 60}m`
  if (mins > 0) return `${mins}m ${secs % 60}s`
  return `${secs}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function ReportViewer({ onBack }: Props) {
  const [loading, setLoading] = useState(true)
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [session, setSession] = useState<SessionData | null>(null)
  const [stats, setStats] = useState<DeviceStats | null>(null)
  const [activityLog, setActivityLog] = useState<any[]>([])
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'screenshots' | 'activity' | 'stats'>('screenshots')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    try {
      const [ss, sess, st, log] = await Promise.all([
        getScreenshotFiles(),
        getCurrentSession(),
        getStats(),
        getActivityLog(),
      ])
      setScreenshots(ss)
      setSession(sess)
      setStats(st)
      setActivityLog(log.slice(-100).reverse())
    } catch (err) { console.error('Failed to load report:', err) }
    finally { setLoading(false) }
  }

  if (loading) return <View style={styles.container}><ActivityIndicator size="large" color="#7c3aed" /><Text style={styles.loadingText}>Loading report...</Text></View>

  if (selectedScreenshot) {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.backButton} onPress={() => setSelectedScreenshot(null)}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
          <Text style={styles.backText}>Back to report</Text>
        </TouchableOpacity>
        <Image source={{ uri: 'file://' + selectedScreenshot }} style={styles.fullImage} resizeMode="contain" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session Report</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color="#7c3aed" />
        </TouchableOpacity>
      </View>

      {/* Session Summary */}
      {session && (
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>📱 Session Summary</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Ionicons name="time" size={20} color="#7c3aed" />
              <Text style={styles.summaryValue}>{formatDuration(session.totalScreenTime)}</Text>
              <Text style={styles.summaryLabel}>Screen Time</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="lock-closed" size={20} color="#f59e0b" />
              <Text style={styles.summaryValue}>{formatDuration(session.totalLockTime)}</Text>
              <Text style={styles.summaryLabel}>Lock Time</Text>
            </View>
            <View style={styles.summaryItem}>
              <Ionicons name="camera" size={20} color="#10b981" />
              <Text style={styles.summaryValue}>{session.screenshotCount}</Text>
              <Text style={styles.summaryLabel}>Screenshots</Text>
            </View>
          </View>
          <Text style={styles.sessionTime}>Started: {formatTime(session.startTime)}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(['screenshots', 'activity', 'stats'] as const).map(tab => (
          <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]} onPress={() => setActiveTab(tab)}>
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab === 'screenshots' ? `📸 ${screenshots.length}` : tab === 'activity' ? `📋 ${activityLog.length}` : `📊 Stats`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === 'screenshots' && (
          <View style={styles.screenshotGrid}>
            {screenshots.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="camera-outline" size={48} color="#64748b" />
                <Text style={styles.emptyText}>No screenshots yet</Text>
                <Text style={styles.emptySubtext}>Start monitoring to capture screenshots</Text>
              </View>
            ) : (
              screenshots.slice().reverse().map((file, i) => (
                <TouchableOpacity key={i} style={styles.thumb} onPress={() => setSelectedScreenshot(file)}>
                  <Image source={{ uri: 'file://' + file }} style={styles.thumbImage} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {activeTab === 'activity' && (
          <View>
            {activityLog.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="list-outline" size={48} color="#64748b" />
                <Text style={styles.emptyText}>No activity yet</Text>
              </View>
            ) : (
              activityLog.map((entry, i) => (
                <View key={i} style={styles.logItem}>
                  <View style={[styles.logDot, { backgroundColor: entry.type === 'screenshot' ? '#7c3aed' : entry.type === 'location' ? '#10b981' : entry.type === 'unlock' ? '#3b82f6' : entry.type === 'lock' ? '#f59e0b' : entry.type === 'threat' ? '#ef4444' : '#64748b' }]} />
                  <View style={styles.logContent}>
                    <Text style={styles.logType}>{entry.type.toUpperCase()}</Text>
                    <Text style={styles.logTime}>{formatTime(entry.timestamp)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'stats' && stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>📊 All-Time Stats</Text>
            {[{ icon: 'camera', label: 'Total Screenshots', value: stats.totalScreenshots.toString(), color: '#7c3aed' }, { icon: 'location', label: 'Location Pings', value: stats.totalLocationPings.toString(), color: '#10b981' }, { icon: 'shield', label: 'Threats Detected', value: stats.totalThreats.toString(), color: '#ef4444' }, { icon: 'layers', label: 'Total Sessions', value: stats.totalSessions.toString(), color: '#3b82f6' }, { icon: 'time', label: 'Total Screen Time', value: formatDuration(stats.totalScreenTime), color: '#f59e0b' }].map((item, i) => (
              <View key={i} style={styles.statsItem}>
                <Ionicons name={item.icon as any} size={20} color={item.color} />
                <Text style={styles.statsLabel}>{item.label}</Text>
                <Text style={[styles.statsValue, { color: item.color }]}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 14, marginTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  backBtn: { padding: 8 },
  refreshBtn: { padding: 8 },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingTop: 48 },
  backText: { color: '#fff', fontSize: 16 },
  fullImage: { flex: 1, margin: 16, borderRadius: 12 },
  summaryCard: { backgroundColor: 'rgba(30,41,59,0.8)', margin: 16, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  summaryLabel: { fontSize: 11, color: '#94a3b8' },
  sessionTime: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 12 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: 'rgba(30,41,59,0.5)', alignItems: 'center' },
  tabActive: { backgroundColor: '#7c3aed' },
  tabText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  screenshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 8, overflow: 'hidden' },
  thumbImage: { width: '100%', height: '100%' },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 16, color: '#94a3b8', fontWeight: '600' },
  emptySubtext: { fontSize: 13, color: '#64748b' },
  logItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  logDot: { width: 8, height: 8, borderRadius: 4 },
  logContent: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logType: { fontSize: 13, color: '#e2e8f0', fontWeight: '600' },
  logTime: { fontSize: 12, color: '#64748b' },
  statsCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#334155' },
  statsTitle: { fontSize: 14, fontWeight: '600', color: '#e2e8f0', marginBottom: 16 },
  statsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  statsLabel: { flex: 1, fontSize: 14, color: '#e2e8f0' },
  statsValue: { fontSize: 14, fontWeight: 'bold' },
})