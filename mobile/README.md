# AquaFind Android app (Capacitor wrapper) — optional

The PWA is the primary way to install AquaFind. Use this only if you also want an APK / Play Store build.
This wrapper packages the same `frontend/` folder; it was NOT built or tested in the environment that produced this project
(that needs the Android SDK), so treat the first build as a setup step.

## Requirements
Node 22+, JDK 17, Android Studio (or the Android SDK command-line tools).

## Steps
1. Deploy the backend first (see ../DEPLOY.md) so you have an HTTPS URL, e.g. https://aquafind.example.com
2. Edit `../frontend/config.js`:  `window.AQF_API_BASE = 'https://aquafind.example.com';`
3. On the server set `ALLOWED_ORIGINS=https://localhost`  (the Android app's web origin) and redeploy.
4. Build:
       cd mobile
       npm install
       npx cap add android        # first time only
       npx cap sync android
       npx cap open android       # Android Studio: Build > Build APK(s)
   or from the command line:  `npm run build:apk`  -> android/app/build/outputs/apk/debug/app-debug.apk
5. For Play Store release builds, create a signing key in Android Studio (Build > Generate Signed Bundle / APK).

Remember to set `window.AQF_API_BASE` back to `''` if you later deploy the frontend from the same server again.
Location needs the ACCESS_FINE_LOCATION permission in android/app/src/main/AndroidManifest.xml (Capacitor's template includes location permissions only when the Geolocation plugin is added: `npm i @capacitor/geolocation && npx cap sync`).
