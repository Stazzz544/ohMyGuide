import type { Tour } from '@app/entities/tour';

export type FolderId = string;

export type Folder = {
  id: FolderId;
  name: string;
  parentId: FolderId | null; // null = корневая папка
  createdAt: string; // ISO 8601
  order: number; // Порядок сортировки
};

export type FolderTreeNode = {
  folder: Folder;
  children: FolderTreeNode[]; // Вложенные папки
  tours: Tour[]; // Туры в этой папке
  level: number; // Глубина вложенности
};
