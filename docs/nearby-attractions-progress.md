# «Рядом»: прогресс

Ветка `dev_12_10_2026_1`, не закоммичено. План и демо — `docs/nearby-attractions-plan.html`.

## Сделано (этапы 1–2)
- Спайк: `@maplibre/maplibre-react-native` 11.5 работает на RN 0.81 + New Arch (debug-сборка, эмулятор Pixel_9_Pro_XL). WebView-запасной путь не нужен.
- `expo-location`: разрешение «при использовании», позиция = последняя известная (≤2 мин) → `getCurrentPositionAsync(High)` с таймаутом 15 с → старая последняя известная → ошибка с «Повторить».
- Данные: Wikidata SPARQL (значимые места в 5 км, центр по сетке 0,02°, кэш в AsyncStorage на 30 дней) + Wikipedia GeoSearch (ближайшие, пока Wikidata думает; добор, если значимых < 15).
- Вкладка «Рядом»: карта OpenFreeMap (liberty/dark, подписи на `name:ru`), круг 5 км, пины, точка пользователя; список с фото, расстоянием, «≈ N мин», сортировка «Ближе/Известнее», pull-to-refresh, выбор места (камера к месту, подпись на карте).

## Файлы
`src/shared/api/{public-client,wikidata-sights-api,wiki-geosearch-api,map-style-api}.ts`, `src/shared/lib/{geo,plural}.ts`, `src/entities/place`, `src/features/{user-location,nearby-places}`, `src/widgets/nearby-explorer`, `app/(tabs)/nearby.tsx`; правки: `app.config.ts`, `app/(tabs)/_layout.tsx`, `constants.ts`, `colors.ts` (`mapPin`).

## Дальше (этапы 3–4)
- Маршрут: `walking-route-api.ts` (OSRM `routing.openstreetmap.de/routed-foot`, резерв ORS), линия на карте, км/мин, ведение `watchPositionAsync`, «Открыть в навигаторе».
- Экскурсия: контекст места (адрес, координаты, extract из Википедии) в `generateTourApi`, переход в генерацию, `location`/`placeId` в `Tour`.

## Гочи
- Metro с `CI=1` не следит за файлами — правки не доходят до устройства. Запускать `npx expo start --dev-client` без CI.
- Картинки Wikimedia с User-Agent okhttp → 403: в `Image` передаём `headers: { 'User-Agent': APP_USER_AGENT }`.
- На эмуляторе `Accuracy.Balanced` не включает GPS (нет сети-провайдера) — нужен `High`; `adb emu geo fix` доходит, только пока GPS запрошен.
- `console.log` из JS не виден ни в Metro (RN 0.81), ни в logcat — отлаживать через DevTools или временный вывод на экран.
