import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Linking, Platform, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { requestLocationSetup } from '../services/LocationMonitorService'
import { registerBootTask, markSetupComplete } from '../services/BootService'
import { promptBatteryWhitelist, setBatteryWhitelisted } from '../services/BatteryOptimizationService'
import { promptEnableDeviceAdmin, setDeviceAdminStatus } from '../services/DeviceAdminService'

interface Props { onComplete: () => void }

const STEPS = [
  { id: 'location', icon: 'location' as const, color: '#10b981', title: 'Location Access', subtitle: 'Track location for family safety', description: 'Allow ShieldGuard to access your location in the background. This is used to keep your family informed of your whereabouts.' },
  { id: 'notifications', icon: 'notifications' as const, color: '#3b82f6', title: 'Notifications', subtitle: 'Enable monitoring notifications', description: 'ShieldGuard needs notification access to monitor social media alerts and show protection status.' },
  { id: 'battery', icon: 'battery-half' as const, color: '#f59e0b', title: 'Battery Settings', subtitle: 'Prevent app from being killed', description: 'Android may kill ShieldGuard to save battery. Setting it to Unrestricted ensures 24/7 protection.' },
  { id: 'admin', icon: 'shield-checkmark' as const, color: '#8b5cf6', title: 'Device Admin', subtitle: 'Prevent uninstallation', description: 'Enable Device Admin to prevent ShieldGuard from being removed. This ensures continuous protection.' },
]

export default function SetupScreen({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  async function handleStepAction() {
    const step = STEPS[currentStep]
    setLoading(true)
    try {
      switch (step.id) {
        case 'location': {
          const perms = await requestLocationSetup()
          if (perms.foreground) {
            setCompletedSteps(new Set([...completedSteps, step.id]))
            if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
            else await finishSetup()
          } else {
            Alert.alert('Location Required', 'ShieldGuard needs location access to protect you. Please grant the permission.', [{ text: 'OK' }])
          }
          break
        }
        case 'notifications': {
          const { default: Notifications } = await import('expo-notifications')
          await Notifications.requestPermissionsAsync()
          setCompletedSteps(new Set([...completedSteps, step.id]))
          if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
          else await finishSetup()
          break
        }
        case 'battery': {
          await promptBatteryWhitelist()
          await setBatteryWhitelisted(true)
          setCompletedSteps(new Set([...completedSteps, step.id]))
          if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
          else await finishSetup()
          break
        }
        case 'admin': {
          if (Platform.OS === 'android') {
            await promptEnableDeviceAdmin()
            await setDeviceAdminStatus(true)
          }
          setCompletedSteps(new Set([...completedSteps, step.id]))
          if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
          else await finishSetup()
          break
        }
      }
    } catch (err) { console.error('Setup step failed:', err) }
    finally { setLoading(false) }
  }

  async function finishSetup() {
    await registerBootTask()
    await markSetupComplete()
    onComplete()
  }

  function skipStep() {
    setCompletedSteps(new Set([...completedSteps, STEPS[currentStep].id]))
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1)
    else finishSetup()
  }

  const step = STEPS[currentStep]
  const progress = (currentStep + 1) / STEPS.length

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.shieldIcon}><Ionicons name="shield-checkmark" size={48} color="#10b981" /></View>
          <Text style={styles.title}>ShieldGuard Safe</Text>
          <Text style={styles.subtitle}>Setup Protection</Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${progress * 100}%` }]} /></View>
          <Text style={styles.progressText}>Step {currentStep + 1} of {STEPS.length}</Text>
        </View>

        <View style={styles.stepIndicators}>
          {STEPS.map((s, i) => (
            <View key={s.id} style={[styles.stepDot, i === currentStep && { backgroundColor: step.color, width: 24 }, completedSteps.has(s.id) && { backgroundColor: '#10b981' }]} />
          ))}
        </View>

        <View style={styles.stepCard}>
          <View style={[styles.stepIcon, { backgroundColor: `${step.color}20` }]}>
            <Ionicons name={step.icon} size={32} color={step.color} />
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>

          <TouchableOpacity style={[styles.actionButton, { backgroundColor: step.color }]} onPress={handleStepAction} disabled={loading}>
            <Text style={styles.actionButtonText}>{loading ? 'Setting up...' : `Enable ${step.title}`}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={skipStep}>
            <Text style={styles.skipButtonText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#64748b" />
          <Text style={styles.infoText}>These settings ensure ShieldGuard runs 24/7 in the background. You can change them later in your phone settings.</Text>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 40, marginBottom: 24 },
  shieldIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(16,185,129,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  progressContainer: { marginBottom: 16 },
  progressBar: { height: 4, backgroundColor: '#1e293b', borderRadius: 2, marginBottom: 8 },
  progressFill: { height: 4, backgroundColor: '#10b981', borderRadius: 2 },
  progressText: { fontSize: 12, color: '#64748b', textAlign: 'center' },
  stepIndicators: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  stepDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1e293b' },
  stepCard: { backgroundColor: 'rgba(30,41,59,0.8)', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#334155', marginBottom: 16 },
  stepIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 4 },
  stepSubtitle: { fontSize: 14, color: '#94a3b8', marginBottom: 12 },
  stepDescription: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  actionButton: { borderRadius: 12, padding: 14, alignItems: 'center', width: '100%', marginBottom: 12 },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipButton: { padding: 8 },
  skipButtonText: { color: '#64748b', fontSize: 13 },
  infoCard: { flexDirection: 'row', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 12, padding: 14, gap: 10, borderWidth: 1, borderColor: '#1e293b' },
  infoText: { flex: 1, fontSize: 12, color: '#64748b', lineHeight: 18 },
})