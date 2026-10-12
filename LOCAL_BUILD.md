# Локальная сборка release APK (Windows / PowerShell)

Точная воспроизводимая инструкция — собрано таким способом и работает.

## Быстрый способ

```powershell
npm run build:apk
```

Скрипт [scripts/build-apk.js](scripts/build-apk.js) выполняет шаги 1 и 3 сам: берёт `JAVA_HOME` / `ANDROID_HOME` из окружения, а если они не заданы — JBR из Android Studio и `%LOCALAPPDATA%\Android\Sdk`; при отсутствии `android/` запускает `npx expo prebuild`, при отсутствии `android/local.properties` создаёт его. Шаг 2 (`prebuild --clean` после правок `app.config.ts`) — по-прежнему вручную. Готовый файл скрипт переименовывает в `android\app\build\outputs\apk\release\oh-my-guide.apk`. Ниже — то же самое руками.

## Предварительные требования (ставится один раз)

- Android Studio установлена (даёт JDK + Android SDK).
- Node.js + npm установлены.
- Зависимости проекта установлены: `npm install`.
- Папка `android/` сгенерирована через `npx expo prebuild`. Она в `.gitignore` — после свежего клона её нет, `npm run build:apk` создаст её сам.

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

При сборке через `npm run build:apk` тот же файл называется `oh-my-guide.apk`.

Размер ~120 МБ (12.10.2026 — 123 656 786 байт): внутри нативные библиотеки под четыре архитектуры.

## Отправка APK в Telegram-канал

`npm run build:apk` после сборки сам отправляет APK в канал, если настроен `.env.local`. Без настройки отправка пропускается, сборка не падает. Собрать без отправки — `npm run build:apk -- --no-upload`, отправить уже собранный APK — `npm run upload:apk`.

Bot API принимает файлы только до 50 МБ, поэтому отправка идёт через MTProto (пакет `telegram`, до 2 ГБ). Настройка один раз:

1. `npm install --save-dev telegram`.
2. В [@BotFather](https://t.me/BotFather) — `/newbot`, сохранить токен.
3. Добавить бота администратором канала с правом «Публикация сообщений».
4. На [my.telegram.org](https://my.telegram.org) → API development tools — создать приложение, взять `api_id` и `api_hash`.
5. Создать `.env.local` в корне проекта (он в `.gitignore`):
   ```
   TELEGRAM_API_ID=1234567
   TELEGRAM_API_HASH=0123456789abcdef0123456789abcdef
   TELEGRAM_BOT_TOKEN=123456789:AA...
   TELEGRAM_CHANNEL_ID=
   ```
6. Опубликовать в канале любое сообщение и выполнить `npm run upload:apk -- --find-channel` — скрипт напишет `TELEGRAM_CHANNEL_ID=-100…`, вписать его в `.env.local`.

Файл в канале называется `oh-my-guide-<версия>-<коммит>.apk`, в подписи — ветка, коммит, его заголовок и время сборки. После первого входа бота рядом появляется `.telegram-session` (в `.gitignore`): с ним следующие отправки не логинятся заново.

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
