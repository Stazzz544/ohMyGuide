# Локальная сборка release APK (Windows / PowerShell)

Точная воспроизводимая инструкция — собрано таким способом и работает.

## Предварительные требования (ставится один раз)

- Android Studio установлена (даёт JDK + Android SDK).
- Node.js + npm установлены.
- Зависимости проекта установлены: `npm install`.
- Папка `android/` уже сгенерирована через `npx expo prebuild` (в репозитории есть).

## Шаг 1. Создать `android/local.properties`

Этот файл **не коммитится** и должен лежать в `android/local.properties`:

```
sdk.dir=C:\\Users\\basileus\\AppData\\Local\\Android\\Sdk
```

Двойные обратные слэши обязательны — это properties-формат.

## Шаг 2. (Опционально) Перегенерировать нативный проект

Только если менялся `app.config.ts` или добавлялись/обновлялись expo-плагины:

```powershell
npx expo prebuild --clean
```

Если в конфиге ничего не трогали — шаг пропустить.

## Шаг 3. Запустить Gradle assembleRelease

В PowerShell из корня проекта:

```powershell
cd E:\cooding\mobile\OhMyGuide\android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "C:\Users\basileus\AppData\Local\Android\Sdk"
./gradlew.bat assembleRelease
```

Сборка занимает ~10–15 минут (зависит от машины). Долгие этапы:

1. `:app:createBundleReleaseJsAndAssets` — JS-бандл (~1500 модулей).
2. Нативная C++ компиляция `react-native-reanimated`, `react-native-gesture-handler`, `expo-modules-core` под четыре ABI: `arm64-v8a`, `armeabi-v7a`, `x86`, `x86_64`.
3. `:app:packageRelease` → `:app:assembleRelease`.

## Шаг 4. Забрать APK

Готовый файл:

```
E:\cooding\mobile\OhMyGuide\android\app\build\outputs\apk\release\app-release.apk
```

Размер ~75 МБ (фактически собиралось 78 173 033 байт).

## Возможные проблемы

| Симптом                                                              | Что делать                                                                                                                             |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `SDK location not found`                                             | Проверить `android/local.properties` — путь к `sdk.dir`.                                                                               |
| `JAVA_HOME is not set` / неверный javac                              | Выставить `$env:JAVA_HOME` именно на `C:\Program Files\Android\Android Studio\jbr` (не на системный JDK другой версии).                |
| Сборка зависает `Waiting to acquire shared lock`                     | `taskkill /F /IM java.exe`, затем удалить `android/.gradle/journal-1/journal-1.lock`.                                                  |
| `Hard link ... failed. Doing a slower copy instead.`                 | Безопасно, не ошибка. Просто FS не поддерживает hard links — сборка идёт чуть медленнее.                                               |
| `has 177 characters. The maximum full path to an object file is 250` | Предупреждение CMake про длину путей. Не фатально — но если упадёт, переложить проект ближе к корню диска (например `C:\proj\OhMyGuide`). |

## Чистая пересборка (если что-то сломалось)

```powershell
cd E:\cooding\mobile\OhMyGuide\android
./gradlew.bat clean
cd ..
npx expo prebuild --clean
cd android
./gradlew.bat assembleRelease
```

## Альтернатива — облачная сборка через EAS

Когда лень настраивать локальное окружение:

```powershell
eas build --profile preview --platform android
```

Профиль `preview` определён в [eas.json](eas.json) и тоже собирает APK. Требует `npm i -g eas-cli` и `eas login` (owner — `stas544`).
