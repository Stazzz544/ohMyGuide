import type { Folder, FolderId, FolderTreeNode } from '../model/types';

/**
 * Проверяет, является ли папка потомком другой папки (для защиты от циклических ссылок)
 */
export const isDescendant = (
  folderId: FolderId,
  potentialAncestorId: FolderId,
  folders: Folder[]
): boolean => {
  const folder = folders.find((f) => f.id === folderId);
  if (!folder || folder.parentId === null) {
    return false;
  }
  if (folder.parentId === potentialAncestorId) {
    return true;
  }
  return isDescendant(folder.parentId, potentialAncestorId, folders);
};

/**
 * Получает путь к папке (breadcrumbs) от корня до указанной папки
 */
export const getFolderPath = (
  folderId: FolderId | null,
  folders: Folder[]
): Folder[] => {
  if (folderId === null) {
    return [];
  }

  const path: Folder[] = [];
  let currentId: FolderId | null = folderId;

  while (currentId !== null) {
    const folder = folders.find((f) => f.id === currentId);
    if (!folder) {
      break;
    }
    path.unshift(folder);
    currentId = folder.parentId;
  }

  return path;
};

/**
 * Получает все ID папок-потомков (для рекурсивного удаления)
 */
export const getAllDescendantIds = (
  folderId: FolderId,
  folders: Folder[]
): FolderId[] => {
  const children = folders.filter((f) => f.parentId === folderId);
  return [
    folderId,
    ...children.flatMap((child) => getAllDescendantIds(child.id, folders)),
  ];
};

/**
 * Подсчитывает количество туров в папке (включая подпапки)
 */
export const countToursInFolder = (node: FolderTreeNode): number => {
  return (
    node.tours.length +
    node.children.reduce((sum, child) => sum + countToursInFolder(child), 0)
  );
};

/**
 * Валидация названия папки
 */
export const validateFolderName = (name: string): string | null => {
  if (name.trim().length === 0) {
    return 'Название папки не может быть пустым';
  }
  if (name.length > 50) {
    return 'Название папки слишком длинное (максимум 50 символов)';
  }
  return null;
};
