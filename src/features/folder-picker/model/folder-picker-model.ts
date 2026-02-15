import { createStore, createEvent, sample } from 'effector';
import type { FolderId } from '@app/entities/folder';

export const createFolderPickerModel = () => {
  // Состояние раскрытых папок (для expand/collapse)
  const $expandedFolders = createStore<Set<FolderId>>(new Set());

  // Состояние модалки создания новой папки
  const $isCreateModalOpen = createStore<boolean>(false);
  const $createModalParentId = createStore<FolderId | null>(null);

  // События
  const folderToggled = createEvent<FolderId>();
  const folderExpanded = createEvent<FolderId>();
  const folderCollapsed = createEvent<FolderId>();
  const allFoldersCollapsed = createEvent();

  const createModalOpened = createEvent<FolderId | null>();
  const createModalClosed = createEvent();

  // Логика раскрытия/сворачивания папок
  sample({
    clock: folderToggled,
    source: $expandedFolders,
    fn: (expanded, folderId) => {
      const newSet = new Set(expanded);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    },
    target: $expandedFolders,
  });

  sample({
    clock: folderExpanded,
    source: $expandedFolders,
    fn: (expanded, folderId) => {
      const newSet = new Set(expanded);
      newSet.add(folderId);
      return newSet;
    },
    target: $expandedFolders,
  });

  sample({
    clock: folderCollapsed,
    source: $expandedFolders,
    fn: (expanded, folderId) => {
      const newSet = new Set(expanded);
      newSet.delete(folderId);
      return newSet;
    },
    target: $expandedFolders,
  });

  sample({
    clock: allFoldersCollapsed,
    fn: () => new Set<FolderId>(),
    target: $expandedFolders,
  });

  // Логика модалки создания папки
  sample({
    clock: createModalOpened,
    fn: () => true,
    target: $isCreateModalOpen,
  });

  sample({
    clock: createModalOpened,
    target: $createModalParentId,
  });

  sample({
    clock: createModalClosed,
    fn: () => false,
    target: $isCreateModalOpen,
  });

  sample({
    clock: createModalClosed,
    fn: () => null,
    target: $createModalParentId,
  });

  return {
    $expandedFolders,
    $isCreateModalOpen,
    $createModalParentId,
    folderToggled,
    folderExpanded,
    folderCollapsed,
    allFoldersCollapsed,
    createModalOpened,
    createModalClosed,
  };
};

export type FolderPickerModel = ReturnType<typeof createFolderPickerModel>;
