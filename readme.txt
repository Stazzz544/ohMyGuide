проверим adb reverse:
в powershell

adb reverse --list
Должны быть строки:

tcp:8081 tcp:8081
tcp:8082 tcp:8082
...
Если пусто или мало портов - настрой снова:


adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8082 tcp:8082
adb reverse tcp:19000 tcp:19000
adb reverse tcp:19001 tcp:19001
adb reverse tcp:19006 tcp:19006



----------------------------------

Запуск dev mode
npx expo start --clear

----------------------------------

Сборка
eas build --profile preview --platform android


Сборка APK локально (Windows)
Предварительные требования
Android Studio установлена (нужна для Java и Android SDK)
Node.js и npm установлены
Проект уже прошёл npx expo prebuild (папка android/ существует)
Шаг 1: Убедиться, что local.properties существует
Файл android/local.properties должен содержать путь к Android SDK:


sdk.dir=C:\\Users\\basileus\\AppData\\Local\\Android\\Sdk
Этот файл уже создан, повторно создавать не нужно.

Шаг 2: Пересобрать нативный проект (если менялся app.config.ts или добавлялись плагины)

npx expo prebuild --clean
Если ничего не менялось в конфигурации — этот шаг можно пропустить.

Шаг 3: Собрать APK

cd e:/cooding/mobile/test-android-app/OhMyGuide/android

export JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"
export ANDROID_HOME="C:/Users/basileus/AppData/Local/Android/Sdk"

./gradlew.bat assembleRelease
Шаг 4: Забрать готовый APK
Файл будет здесь:


android/app/build/outputs/apk/release/app-release.apk
Размер ~78 МБ. Можно отправлять друзьям для установки.

Возможные проблемы
Gradle lock — если сборка зависает на "Waiting to acquire shared lock", убить все процессы Java (taskkill /F /IM java.exe) и удалить файл android/.gradle/journal-1/journal-1.lock
JAVA_HOME not set — убедиться, что переменная JAVA_HOME указывает на C:/Program Files/Android/Android Studio/jbr
SDK not found — проверить файл android/local.properties


