import { createStore, createEvent, createEffect, sample } from 'effector';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@app/shared/lib';
import { STORAGE_KEYS } from '@app/shared/config';
import { isDescendant, getAllDescendantIds } from '../lib/folder-utils';

import type { Folder, FolderId } from './types';

// --- Effects (работа с AsyncStorage) ---

const loadFoldersFx = createEffect(async (): Promise<Folder[]> => {
  const folders = await storage.get<Folder[]>(STORAGE_KEYS.FOLDERS);
  return folders ?? [];
});

const saveFoldersFx = createEffect(async (folders: Folder[]): Promise<void> => {
  await storage.set(STORAGE_KEYS.FOLDERS, folders);
});

// --- Stores ---

const $folders = createStore<Folder[]>([]);
const $isLoading = createStore<boolean>(false);

// --- Events ---

const foldersLoaded = createEvent();
const folderCreated = createEvent<{ name: string; parentId: FolderId | null }>();
const folderRenamed = createEvent<{ id: FolderId; newName: string }>();
const folderDeleted = createEvent<FolderId>();
const folderMoved = createEvent<{ id: FolderId; newParentId: FolderId | null }>();
const foldersRefreshed = createEvent();

// --- Computed Stores ---

// Сортировка папок по order и createdAt
const $sortedFolders = $folders.map((folders) =>
  [...folders].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  })
);

// --- Логика через sample ---

// Загрузка папок из хранилища
sample({
  clock: foldersLoaded,
  target: loadFoldersFx,
});

sample({
  clock: loadFoldersFx.doneData,
  target: $folders,
});

// Создание новой папки
sample({
  clock: folderCreated,
  source: $folders,
  fn: (folders, { name, parentId }) => {
    // Находим максимальный order среди папок с тем же родителем
    const maxOrder = folders
      .filter((f) => f.parentId === parentId)
      .reduce((max, f) => Math.max(max, f.order), 0);

    return [
      ...folders,
      {
        id: uuidv4(),
        name,
        parentId,
        createdAt: new Date().toISOString(),
        order: maxOrder + 1,
      },
    ];
  },
  target: $folders,
});

// Переименование папки
sample({
  clock: folderRenamed,
  source: $folders,
  fn: (folders, { id, newName }) =>
    folders.map((f) => (f.id === id ? { ...f, name: newName } : f)),
  target: $folders,
});

// Удаление папки (рекурсивное удаление всех подпапок)
sample({
  clock: folderDeleted,
  source: $folders,
  fn: (folders, deletedId) => {
    const idsToDelete = getAllDescendantIds(deletedId, folders);
    return folders.filter((f) => !idsToDelete.includes(f.id));
  },
  target: $folders,
});

// Перемещение папки (с защитой от циклических ссылок)
sample({
  clock: folderMoved,
  source: $folders,
  fn: (folders, { id, newParentId }) => {
    // Защита от циклических ссылок
    if (newParentId !== null && isDescendant(newParentId, id, folders)) {
      console.warn('Попытка создать циклическую ссылку папок');
      return folders; // Отменяем операцию
    }

    return folders.map((f) => (f.id === id ? { ...f, parentId: newParentId } : f));
  },
  target: $folders,
});

// Персист при изменении $folders
sample({
  clock: $folders,
  target: saveFoldersFx,
});

// Pull-to-refresh
sample({
  clock: foldersRefreshed,
  target: loadFoldersFx,
});

// Loading состояние
sample({
  clock: loadFoldersFx,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [loadFoldersFx.done, loadFoldersFx.fail],
  fn: () => false,
  target: $isLoading,
});

export const folderStore = {
  $folders: $sortedFolders,
  $isLoading,
  foldersLoaded,
  folderCreated,
  folderRenamed,
  folderDeleted,
  folderMoved,
  foldersRefreshed,
};
