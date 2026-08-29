# ShieldGuard Safe — Setup Guide

## First Time Setup (2 minutes)

When you first open ShieldGuard Safe, you'll see a 4-step setup wizard:

### Step 1: Location Access
- Tap **"Grant Location Permission"**
- Select **"Allow all the time"** (required for background tracking)
- This lets ShieldGuard track location even when the app is closed

### Step 2: Notifications
- Tap **"Enable Notifications"**
- This allows ShieldGuard to show monitoring status

### Step 3: Battery Optimization
- Tap **"Open Battery Settings"**
- Find ShieldGuard Safe in the list
- Select **"Unrestricted"** or **"Don't optimize"
- This prevents Android from killing the app to save battery

### Step 4: Device Admin (Optional but Recommended)
- Tap **"Open App Settings"**
- Find **"Device Admin"** or **"Admin apps"**
- Enable ShieldGuard Safe as a device admin
- This prevents the app from being uninstalled

After setup, you'll see:
- **Pairing Code** — share this with your parent
- **Protection Active** — all monitoring is running

## What Runs in the Background

ShieldGuard Safe runs silently in the background:
- **Location** — sent every 60 seconds
- **Screenshot** — captured when you unlock your phone
- **Threats** — checked every 10 minutes
- **Heartbeat** — sent every 1 minute

## Battery Usage

ShieldGuard uses about 5-8% battery per day due to the foreground service notification.

## Important Notes

- You cannot uninstall ShieldGuard Safe if Device Admin is enabled
- The persistent notification is required by Android for foreground services
- ShieldGuard Safe will restart automatically after phone restarts
