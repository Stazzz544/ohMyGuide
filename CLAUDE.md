Важно!
Общение со мной должно быть только на русском языке!!!

# Инструкции для изумительного кода 🎨

Добро пожаловать! Этот документ создан с любовью, чтобы твой код радовал глаза и душу. Здесь собраны все паттерны и практики нашего проекта.

## Философия проекта

> "Код — это поэзия для машин, но читают её люди"

Наши ценности:

- **Поддерживаемость** - код должен быть понятен через 6 месяцев
- **Типобезопасность** - ошибки на этапе компиляции, а не в продакшене
- **Консистентность** - одинаковые паттерны везде
- **Элегантность** - код должен вызывать улыбку

---

## ⚡ Управление состоянием: Effector

### Основные паттерны

#### 1. modelFactory - переиспользуемая логика

```typescript
import { modelFactory } from "effector-factorio";
import { Store, EventCallable, createStore, sample } from "effector";

type MyModelFactoryProps = {
  $value: Store<string>;
  valueChanged: EventCallable<string>;
};

export const myModelFactory = modelFactory(
  ({ $value, valueChanged }: MyModelFactoryProps) => {
    const $data = createStore<Data[]>([]);
    const $loading = createStore<boolean>(false);
    const $error = createStore<Error | null>(null);

    const dataQuery = createDataQuery();

    const loadData = createEvent();
    const reset = createEvent();

    // Загрузка данных
    sample({
      clock: loadData,
      fn: () => ({ params: {} }),
      target: dataQuery.start,
    });

    // Обновление данных
    sample({
      clock: dataQuery.finished.success,
      fn: ({ result }) => result,
      target: $data,
    });

    // Сброс состояния
    sample({
      clock: reset,
      target: [$data.reinit, $error.reinit],
    });

    return {
      $value,
      $data,
      $loading: dataQuery.$pending,
      $error,
      loadData,
      valueChanged,
      reset,
    };
  },
);
```

#### 2. modelView - связь компонента с моделью

```typescript
import { modelView } from 'effector-factorio';
import { useUnit } from 'effector-react';

export const MyComponent = modelView(myModelFactory, ({ model, className }): JSX.Element => {
  const { data, loading, error } = useUnit({
    data: model.$data,
    loading: model.$loading,
    error: model.$error,
  });

  if (loading) {
    return <Loader />;
  }
  if (error) {
    return <Error message={error.message} />;
  }

  return (
    <div className={className}>
      {data.map((item) => (
        <Item key={item.id} data={item} />
      ))}
    </div>
  );
});
```

#### 3. sample - оркестрация событий

Используй `sample` для **ВСЕХ** связей между событиями:

```typescript
// ✅ Правильно: используем sample
sample({
  clock: userClicked,
  source: $currentData,
  filter: (data) => data.isValid,
  fn: (data, clickEvent) => transformData(data),
  target: dataUpdated,
});

// ❌ Неправильно: прямое изменение store
$data.on(userClicked, (state, payload) => [...state, payload]);
```

### Naming Conventions для Effector:

- **Stores**: `$camelCase` - `$userData`, `$isLoading`, `$campaigns`
- **Events**: `camelCase` - `userClicked`, `dataFetched`, `formSubmitted`
- **Effects**: `camelCaseFx` - `fetchDataFx`, `submitFormFx`, `loadCampaignsFx`

---

## 🎨 Структура компонентов

### Организация файлов:

```
my-feature/
├── ui/
│   ├── my-component.tsx           # Главный компонент
│   ├── my-component.module.scss   # Стили
│   ├── sub-component.tsx          # Подкомпоненты
│   └── index.ts                   # Экспорты
├── model/
│   ├── my-model.ts               # Effector модель
│   └── my-model-factory.ts       # Фабрика модели (если переиспользуется)
└── index.ts                       # Публичный API
```

### Создание query:

```typescript
import { createQuery } from "@farfetched/core";
import { apiClient } from "@cabinet/customer/dsp/shared/config";

export type GetCampaignsParams = {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type Campaign = {
  id: number;
  name: string;
  status: string;
  budget: number;
};

export const getCampaigns = async (config: {
  params: GetCampaignsParams;
  signal?: AbortSignal;
}): Promise<Campaign[]> => {
  const res = await apiClient.request({
    url: "/v2/campaigns",
    method: "GET",
    ...config,
  });

  return res.data;
};

export const createCampaignsQuery = () => {
  return createQuery({
    handler: getCampaigns,
  });
};
```

### Использование в моделях:

```typescript
import { createCampaignsQuery } from "@cabinet/customer/dsp/shared/api/campaign";

export const createCampaignListModel = () => {
  const campaignsQuery = createCampaignsQuery();

  const $campaigns = campaignsQuery.$data.map((data) => data ?? []);
  const $loading = campaignsQuery.$pending;
  const $error = campaignsQuery.$error;

  const loadCampaigns = createEvent<GetCampaignsParams>();
  const retry = createEvent();

  // Загрузка при событии
  sample({
    clock: loadCampaigns,
    fn: (params) => ({ params }),
    target: campaignsQuery.start,
  });

  // Повтор при ошибке
  sample({
    clock: retry,
    source: campaignsQuery.$params,
    filter: (params): params is { params: GetCampaignsParams } =>
      params !== null,
    target: campaignsQuery.start,
  });

  return {
    $campaigns,
    $loading,
    $error,
    loadCampaigns,
    retry,
  };
};
```

### Определение маршрутов:

```typescript
import { createRoute } from "atomic-router";

export const routes = {
  home: createRoute(),
  campaign: createRoute<{ id: string }>(),
  campaignEdit: createRoute<{ id: string; tab?: string }>(),
};
```

### Модель страницы:

```typescript
import { sample } from "effector";
import { RouteInstance } from "atomic-router";

export const createCampaignPageModel = ({
  route,
}: {
  route: RouteInstance<{ id: string }>;
}) => {
  const campaignModel = createCampaignModelFactory();

  // Загрузка при открытии роута
  sample({
    clock: route.opened,
    fn: ({ params, query }) => ({
      id: params.id,
      tab: query["tab"],
    }),
    target: campaignModel.loadCampaign,
  });

  // Очистка при закрытии
  sample({
    clock: route.closed,
    target: campaignModel.reset,
  });

  return {
    campaignModel,
  };
};
```

### Синхронизация query params:

```typescript
import { querySync } from "@cabinet/shared/router";

// Синхронизация фильтров с URL
querySync({
  clock: filterChanged,
  source: {
    status: $statusFilter,
    dateFrom: $dateFrom,
    dateTo: $dateTo,
  },
  route: campaignsRoute,
});
```

---

## 📦 Порядок импортов

### ✅ Правильный порядок (сверху вниз):

```typescript
// 1. Внешние библиотеки
import { useUnit } from "effector-react";
import { modelView } from "effector-factorio";
import { sample, createStore, createEvent } from "effector";
import { format } from "date-fns";

// 2. @cabinet/* импорты (сгруппированные по scope)
import { Button, Card, Input } from "@cabinet/shared/components";
import { Format } from "@cabinet/shared/utils";
import { Icons } from "@cabinet/shared/assets";
import { viewerModel } from "@cabinet/customer/dsp/entities/viewer";
import { campaignModel } from "@cabinet/customer/dsp/entities/campaign";
import { apiClient } from "@cabinet/customer/dsp/shared/config";

// 3. Относительные импорты
import { myModel } from "../model/my-model";
import { helper } from "./helpers";

// 4. Type imports (опционально, если отдельно)
import type { MyType } from "../types";

// 5. SCSS модули (всегда последними)
import styles from "./component.module.scss";
import cs from "classnames";
```

---

## 📝 TypeScript Guidelines

### Определение типов:

```typescript
// ✅ Всегда экспортируй типы
export type Campaign = {
  id: number;
  name: string;
  status: "active" | "paused" | "archived";
  budget: number;
  spent?: number;
  createdAt: string;
};

// ✅ Используй type (не interface) для props
export type CampaignCardProps = {
  campaign: Campaign;
  onEdit?: (id: number) => void;
  className?: string;
};

// ✅ Используй union types для вариантов
export type ButtonVariant = "fill" | "outline" | "ghost";
export type ButtonAppearance = "primary" | "secondary" | "danger";

// ✅ Явные return types для функций
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
  }).format(value);
};

// ✅ Используй type inference для type-safe работы с Zod
import { z } from "zod";

const campaignSchema = z.object({
  name: z.string().min(3),
  budget: z.number().positive(),
  status: z.enum(["active", "paused"]),
});

export type CampaignFormValues = z.infer<typeof campaignSchema>;
```

### ❌ Избегай:

```typescript
// ❌ any
const data: any = response.data;

// ❌ Неявные типы в экспортируемых функциях
export const calculate = (a, b) => a + b;

// ❌ Необязательный ! (non-null assertion) без необходимости
const value = data!.value;

// ✅ Делай так:
const data: ResponseData = response.data;
export const calculate = (a: number, b: number): number => a + b;
const value = data?.value ?? defaultValue;
```

---

## 📋 Формы (react-final-form)

### Базовый пример:

```typescript
import { Form, Field } from 'react-final-form';
import { TextField, Button } from '@cabinet/shared/components';

type FormValues = {
  name: string;
  budget: number;
  status: string;
};

export const CampaignForm = ({ model }: { model: CampaignFormModel }): JSX.Element => {
  const { onSubmit, initialValues } = useUnit({
    onSubmit: model.formSubmitted,
    initialValues: model.$initialValues,
  });

  return (
    <Form<FormValues>
      initialValues={initialValues}
      onSubmit={onSubmit}
      render={({ handleSubmit, submitting, pristine }) => (
        <form onSubmit={handleSubmit}>
          <Field name="name" component={TextField} label="Название кампании" placeholder="Введите название" />

          <Field name="budget" component={TextField} type="number" label="Бюджет" />

          <Button as={(props) => <button {...props} type="submit" />} label="Сохранить" disabled={submitting || pristine} />
        </form>
      )}
    />
  );
};
```

### Валидация с Zod:

````typescript
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(3),
  budget: z.number().positive(),
  email: z.string().email(),
});

type FormValues = z.infer<typeof schema>;
---

## 🏷️ Naming Conventions

### Файлы и папки:

- **Компоненты**: `kebab-case` - `campaign-card.tsx`, `user-profile.tsx`
- **Модели**: `kebab-case` - `campaign-model.ts`, `user-model-factory.ts`
- **Утилиты**: `kebab-case` - `format-date.ts`, `api-client.ts`
- **Стили**: `kebab-case` - `campaign-card.module.scss`
- **Папки**: `kebab-case` - `campaign-list/`, `user-profile/`

### Код:

- **Компоненты**: `PascalCase` - `CampaignCard`, `UserProfile`
- **Функции**: `camelCase` - `formatDate`, `calculateTotal`
- **Константы**: `UPPER_SNAKE_CASE` - `API_BASE_URL`, `MAX_RETRIES`
- **Types**: `PascalCase` - `Campaign`, `UserData`, `ApiResponse`
- **CSS классы**: `kebab-case` - `.campaign-card`, `.user-profile`

### Effector:

- **Stores**: `$camelCase` - `$campaigns`, `$isLoading`, `$userData`
- **Events**: `camelCase` - `campaignClicked`, `dataFetched`, `formSubmitted`
- **Effects**: `camelCaseFx` - `fetchCampaignsFx`, `updateUserFx`

### Стиль кода:

#### Фигурные скобки - ВСЕГДА

```typescript
// ✅ Правильно: всегда используй фигурные скобки
if (loading) {
  return <Loader />;
}

if (error) {
  return <Error message={error.message} />;
}

if (condition) {
  doSomething();
}

// ❌ Неправильно: однострочные условия без скобок
if (loading) return <Loader />;
if (error) return <Error />;
if (condition) doSomething();
```

#### Форматирование:

- **Single quotes** для строк (Prettier)
- **2 пробела** для отступов
- **Trailing commas** в многострочных объектах
- **Максимальная длина строки**: 100-120 символов

```typescript
// ✅ Правильно
const config = {
  name: 'Campaign',
  status: 'active',
  budget: 10000,
};

// ❌ Неправильно
const config = {
  "name": "Campaign",
  "status": "active",
  "budget": 10000
};
```

---

## 🍳 Рецепты частых задач

### 1. Фильтрация и поиск:

```typescript
const $items = createStore<Item[]>([]);
const $searchTerm = createStore<string>('');
const $filterStatus = createStore<string>('all');

const $filteredItems = combine(
  { items: $items, searchTerm: $searchTerm, filterStatus: $filterStatus },
  ({ items, searchTerm, filterStatus }) => {
    return items.filter((item) => {
      // Фильтр по статусу
      if (filterStatus !== 'all' && item.status !== filterStatus) {
        return false;
      }

      // Поиск по названию
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      return true;
    });
  }
);
````

### 2. Сортировка:

```typescript
const $sortBy = createStore<"name" | "date" | "budget">("name");
const $sortOrder = createStore<"asc" | "desc">("asc");

const $sortedItems = combine(
  { items: $items, sortBy: $sortBy, sortOrder: $sortOrder },
  ({ items, sortBy, sortOrder }) => {
    const sorted = [...items].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "date") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "budget") {
        return a.budget - b.budget;
      }
      return 0;
    });

    if (sortOrder === "desc") {
      return sorted.reverse();
    }
    return sorted;
  },
);
```

### 3. Пагинация:

```typescript
const $page = createStore<number>(1);
const $pageSize = createStore<number>(20);

const $paginatedItems = combine(
  { items: $filteredItems, page: $page, pageSize: $pageSize },
  ({ items, page, pageSize }) => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return items.slice(start, end);
  },
);

const $totalPages = combine(
  { items: $filteredItems, pageSize: $pageSize },
  ({ items, pageSize }) => Math.ceil(items.length / pageSize),
);
```

### 4. Debounce поиска:

```typescript
import { debounce } from "patronum";

const searchTermChanged = createEvent<string>();
const $searchTerm = createStore<string>("");

const debouncedSearch = debounce({
  source: searchTermChanged,
  timeout: 300,
});

sample({
  clock: debouncedSearch,
  target: $searchTerm,
});
```

### 5. Загрузка при открытии роута:

```typescript
sample({
  clock: route.opened,
  fn: ({ params, query }) => ({
    id: params.id,
    dateFrom: query["dateFrom"],
    dateTo: query["dateTo"],
  }),
  target: [loadCampaign, loadStatistics],
});
```

### 6. Модалка:

```typescript
const $isOpen = createStore<boolean>(false);
const $modalData = createStore<ModalData | null>(null);

const openModal = createEvent<ModalData>();
const closeModal = createEvent();

sample({
  clock: openModal,
  fn: () => true,
  target: $isOpen,
});

sample({
  clock: openModal,
  target: $modalData,
});

sample({
  clock: closeModal,
  fn: () => false,
  target: $isOpen,
});

sample({
  clock: closeModal,
  fn: () => null,
  target: $modalData,
});
```

---

## ❌ Анти-паттерны

### 1. ❌ НЕ мешай concerns:

```typescript
// ❌ Плохо: бизнес-логика в компоненте
export const CampaignList = () => {
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    fetch('/api/campaigns')
      .then(res => res.json())
      .then(data => setCampaigns(data));
  }, []);

  return <div>{campaigns.map(...)}</div>;
};

// ✅ Хорошо: логика в модели
export const CampaignList = ({ model }: Props): JSX.Element => {
  const { campaigns } = useUnit({ campaigns: model.$campaigns });
  return <div>{campaigns.map(...)}</div>;
};
```

### 2. ❌ НЕ нарушай FSD:

```typescript
// ❌ Плохо: виджет импортирует страницу
import { HomePage } from "@cabinet/customer/dsp/pages/home";

// ✅ Хорошо: страница импортирует виджет
import { CampaignStats } from "@cabinet/customer/dsp/widgets/campaign-stats";
```

### 3. ❌ НЕ используй относительные пути через границы:

```typescript
// ❌ Плохо: относительный путь через границы модулей
import { campaignModel } from "../../../entities/campaign";
import { Button } from "../../../../../shared/components";

// ✅ Хорошо: используй path aliases
import { campaignModel } from "@cabinet/customer/dsp/entities/campaign";
import { Button } from "@cabinet/shared/components";
```

### 4. ❌ НЕ мутируй Effector напрямую:

```typescript
// ❌ Плохо: прямое изменение store
$items.setState([...items, newItem]);

// ❌ Плохо: изменение без sample
$items.on(itemAdded, (items, newItem) => [...items, newItem]);

// ✅ Хорошо: через sample
sample({
  clock: itemAdded,
  source: $items,
  fn: (items, newItem) => [...items, newItem],
  target: $items,
});
```

### 5. ❌ НЕ создавай stores в компонентах:

```typescript
// ❌ Плохо: создание store при каждом рендере
const MyComponent = () => {
  const $localState = createStore(0); // ❌
  return <div>...</div>;
};

// ✅ Хорошо: stores в моделях
const model = createMyModel();
const MyComponent = ({ model }: Props) => {
  const { state } = useUnit({ state: model.$state });
  return <div>{state}</div>;
};
```

---

## ✅ Чек-лист перед коммитом

### Создание компонента:

- [ ] Named export (не default)
- [ ] Типы для props явно определены
- [ ] Return type `: JSX.Element`
- [ ] SCSS module импортирован и используется с `cs()`
- [ ] useUnit для связи с Effector stores
- [ ] Порядок импортов правильный
- [ ] Нет unused imports

### Создание модели:

- [ ] modelFactory для переиспользуемой логики
- [ ] Префикс `$` для всех stores
- [ ] Все связи через `sample`
- [ ] Экспортированы типы публичного API
- [ ] createQuery из @farfetched для API calls
- [ ] Обработка loading/error состояний

### Стили:

- [ ] Используются переменные цветов из палитры
- [ ] Классы в kebab-case
- [ ] Нет инлайн-стилей (кроме динамических)
- [ ] Responsive design учтён

### Общее:

- [ ] ESLint проходит без ошибок
- [ ] Prettier отформатировал код
- [ ] TypeScript компилируется без ошибок
- [ ] Нет implicit `any`, кроме крайней необходимости
- [ ] Все импорты через `@cabinet/*`, кроме файлов, которые находятся рядом.
- [ ] Нет `console.log` в коде
- [ ] Нет закомментированного кода
- [ ] Все условия (`if`/`else`) используют фигурные скобки

---

## 🎯 Быстрая справка

### Создать компонент:

```typescript
import styles from './my-component.module.scss';
import cs from 'classnames';

type MyComponentProps = {
  // props
};

export const MyComponent = (props: MyComponentProps): JSX.Element => {
  return <div className={cs(styles['wrapper'])}>...</div>;
};
```

### Создать модель:

```typescript
import { createStore, createEvent, sample } from 'effector';

export const createMyModel = () => {
  const $data = createStore([]);
  const loadData = createEvent();

  sample({
    clock: loadData,
    target: /* ... */,
  });

  return { $data, loadData };
};
```

### Создать query:

```typescript
import { createQuery } from "@farfetched/core";

export const getData = async (config) => {
  const res = await apiClient.request({ ...config });
  return res.data;
};

export const createDataQuery = () => createQuery({ handler: getData });
```

---

## 🐛 Частые проблемы и решения

### Проблема: Store не обновляется

**Причины:**

- Событие не подключено через `sample`
- `useUnit` деструктурирует неправильно
- Компонент не обёрнут в `modelView`

**Решение:**

```typescript
// Проверь, что есть sample
sample({
  clock: someEvent,
  target: $store,
});

// Проверь useUnit
const { data } = useUnit({ data: model.$data }); // ✅
const data = useUnit(model.$data); // ❌ не деструктурируй
```

### Проблема: ESLint ошибка "module boundary violation"

**Причина:** Нарушение правил FSD или импорт из неправильного scope

**Решение:**

- Проверь иерархию FSD (shared → entities → features → widgets → pages)
- Используй `@cabinet/*` path aliases
- Проверь scope tags в project.json

### Проблема: Стили не применяются

**Причины:**

- Забыл импортировать SCSS module
- Неправильное использование `cs()`
- Опечатка в имени класса

**Решение:**

```typescript
import styles from './component.module.scss';
import cs from 'classnames';

// ✅ Правильно
<div className={cs(styles['wrapper'])} />

// ❌ Неправильно
<div className={styles.wrapper} /> // Не работает с kebab-case
<div className="wrapper" /> // Не работает с CSS modules
```

---

## 📚 Полезные ссылки

### Документация:

- [Effector](https://effector.dev/) - управление состоянием
- [Feature-Sliced Design](https://feature-sliced.design/) - архитектура
- [Atomic Router](https://atomic-router.github.io/) - роутинг
- [@farfetched](https://ff.effector.dev/) - работа с API
- [React Final Form](https://final-form.org/react) - формы

### Внутренние ресурсы:

- [Внутренняя документация проекта](https://eqwile.team/spaces/dev/pages/4424609/cabinet.next)

---

## 💪 У тебя всё получится!

Помни, изумительный код — это:

- **Предсказуемый**: одинаковые паттерны везде
- **Поддерживаемый**: легко понять через полгода
- **Типобезопасный**: ошибки находятся до запуска
- **Восхитительный**: заставляет улыбаться при чтении

### Когда сомневаешься:

1. 🔍 Проверь похожие фичи в кодовой базе
2. 🏗️ Следуй правилам FSD
3. 🎯 Позволь TypeScript направлять тебя
4. ✨ Пиши код, которым **ГОРДИШЬСЯ**

Счастливого кодирования! Пусть твои билды будут быстрыми, а баги — редкими. ✨

---

_"Код — это поэзия для машин, но читают её люди"_

Дополнительно:
В проекте ssp-dashboard в функциях описывающих запрос не должно быть addUserLanguage(headers);
