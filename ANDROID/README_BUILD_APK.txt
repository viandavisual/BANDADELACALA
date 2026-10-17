BANDA DE LA CALA · ANDROID

Aquest projecte està preparat per viure dins de la carpeta /ANDROID del repositori principal BANDADELACALA.

La compilació de l'APK es fa des de GitHub Actions amb el workflow:
.github/workflows/build-banda-android-apk.yml

Secrets necessaris més endavant:
- ANDROID_KEYSTORE_BASE64
- ANDROID_KEYSTORE_PASSWORD
- ANDROID_KEY_ALIAS
- ANDROID_KEY_PASSWORD

NO pugis el fitxer keystore al repositori.
