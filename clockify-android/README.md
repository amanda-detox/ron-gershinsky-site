# Clockify sandbox for Android

Sideload build of the Clockify sandbox. Alarms are scheduled with Android exact alarms, so they can ring when the app is closed or the screen is off. The web sandbox at `clockify-sandbox/` is unchanged for browsers. Live `/clockify/` and `/my/clock/` are not part of this app.

## Install on a phone

1. Copy `app-release.apk` to the phone and open it.
2. Allow install from unknown sources when Android asks.
3. Open Clockify. On first launch, allow:
   - Notifications
   - Alarms & reminders (שעונים ותזכורות), if the phone asks
   - Full-screen alerts, on Android 14 and newer, so the alarm can cover the lock screen
   - Battery set to Unrestricted (ללא הגבלה)
4. Turn the alarm volume up. Silent mode still rings. Do Not Disturb can still block it unless the phone allows alarms.

## Build

Needs JDK 17+, Android SDK platform 35, and build-tools 35.

```sh
cd clockify-android
# local.properties: sdk.dir=/path/to/Android/sdk
./gradlew assembleRelease
```

The release APK is signed with the sideload key in `keystore/` (not a Play Store key). `tools/check-alarm-math.sh` checks the native schedule math against `clockify-sandbox/alarm-core.js`. `tools/render-sounds.js` rebuilds the bundled tones from `sounds.js`.
