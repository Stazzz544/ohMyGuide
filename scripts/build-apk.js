const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(PROJECT_ROOT, 'android');
const RELEASE_DIR = path.join(ANDROID_DIR, 'app', 'build', 'outputs', 'apk', 'release');
const GRADLE_APK_PATH = path.join(RELEASE_DIR, 'app-release.apk');
const APK_PATH = path.join(RELEASE_DIR, 'oh-my-guide.apk');
const DEFAULT_JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr';
const DEFAULT_ANDROID_HOME = path.join(process.env.LOCALAPPDATA ?? '', 'Android', 'Sdk');

const fail = (message) => {
  console.error(`\n[build-apk] ${message}`);
  process.exit(1);
};

const run = (command, cwd, env) => {
  const result = spawnSync(command, { cwd, env, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    fail(`Команда «${command}» завершилась с кодом ${result.status}`);
  }
};

const javaHome = process.env.JAVA_HOME || DEFAULT_JAVA_HOME;
if (!fs.existsSync(path.join(javaHome, 'bin', 'java.exe'))) {
  fail(`JDK не найден в ${javaHome}. Установите Android Studio или задайте JAVA_HOME`);
}

const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || DEFAULT_ANDROID_HOME;
if (!fs.existsSync(androidHome)) {
  fail(`Android SDK не найден в ${androidHome}. Установите SDK через Android Studio или задайте ANDROID_HOME`);
}

const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: androidHome };

if (!fs.existsSync(ANDROID_DIR)) {
  run('npx expo prebuild --platform android', PROJECT_ROOT, env);
}

const localProperties = path.join(ANDROID_DIR, 'local.properties');
if (!fs.existsSync(localProperties)) {
  fs.writeFileSync(localProperties, `sdk.dir=${androidHome.replace(/\\/g, '\\\\')}\n`);
}

run('.\\gradlew.bat assembleRelease', ANDROID_DIR, env);

fs.renameSync(GRADLE_APK_PATH, APK_PATH);

const sizeMb = (fs.statSync(APK_PATH).size / 1024 / 1024).toFixed(1);
console.log(`\n[build-apk] Готово: ${APK_PATH} (${sizeMb} МБ)`);
