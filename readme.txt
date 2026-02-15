🔧 Давай проверим adb reverse:
1. Проверь что reverse правила активны:

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






npx expo start --clear


Вариант A: Локальная сборка


cd /e/cooding/mobile/test-android-app/OhMyGuide
npx expo run:android --variant release
Вариант B: EAS Build (рекомендуется для production)


cd /e/cooding/mobile/test-android-app/OhMyGuide
eas build --profile preview --platform android