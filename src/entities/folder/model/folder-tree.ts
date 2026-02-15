import { combine } from 'effector';
import { folderStore } from './folder-store';
import { tourStore } from '@app/entities/tour';

import type { FolderTreeNode, FolderId } from './types';

/**
 * Построение дерева папок с турами
 */
export const $folderTree = combine(
  { folders: folderStore.$folders, tours: tourStore.$tours },
  ({ folders, tours }) => {
    const buildTree = (
      parentId: FolderId | null,
      level: number = 0
    ): FolderTreeNode[] => {
      const childFolders = folders.filter((f) => f.parentId === parentId);

      return childFolders.map((folder) => ({
        folder,
        children: buildTree(folder.id, level + 1),
        tours: tours.filter((t) => t.folderId === folder.id),
        level,
      }));
    };

    return buildTree(null);
  }
);

/**
 * Туры без папки (в корне)
 */
export const $rootTours = combine(
  tourStore.$tours,
  (tours) => tours.filter((t) => t.folderId === null)
);
