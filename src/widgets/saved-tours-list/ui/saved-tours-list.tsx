import { ScrollView, View, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { JSX, useCallback, useState } from 'react';
import { useUnit } from 'effector-react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { tourStore, TourCard } from '@app/entities/tour';
import { $folderTree, $rootTours, folderStore } from '@app/entities/folder';
import type { Tour, TourId } from '@app/entities/tour';
import type { FolderTreeNode, Folder } from '@app/entities/folder';
import { FolderHeader } from './folder-header';
import { FolderContextMenu, FolderRenameModal, FolderDeleteConfirmation } from '@app/features/folder-actions';
import { generateModel } from '@app/features/generate-tour';

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SavedToursList = (): JSX.Element => {
  const { colors } = useTheme();
  const router = useRouter();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenuFolder, setContextMenuFolder] = useState<Folder | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<Folder | null>(null);

  const { folderTree, rootTours, folders, tours, isLoading, onDelete, onRefresh, onTourLoad } = useUnit({
    folderTree: $folderTree,
    rootTours: $rootTours,
    folders: folderStore.$folders,
    tours: tourStore.$tours,
    isLoading: tourStore.$isLoading,
    onDelete: tourStore.tourDeleted,
    onRefresh: tourStore.toursRefreshed,
    onTourLoad: generateModel.tourLoaded,
  });

  const handlePress = useCallback(
    (id: string): void => {
      const tour = tours.find((t) => t.id === id);
      if (tour) {
        onTourLoad({
          placeName: tour.placeName,
          generatedText: tour.generatedText,
        });
        router.push('/(tabs)/' as const);
      }
    },
    [tours, onTourLoad, router]
  );

  const handleDelete = useCallback(
    (id: TourId): void => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onDelete(id);
    },
    [onDelete]
  );

  const handleFolderToggle = useCallback((folderId: string): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  }, []);

  const handleFolderLongPress = useCallback((folder: Folder): void => {
    setContextMenuFolder(folder);
  }, []);

  const handleContextMenuAction = useCallback((action: 'rename' | 'delete', folder: Folder): void => {
    if (action === 'rename') {
      setRenameFolder(folder);
    } else if (action === 'delete') {
      setDeleteFolder(folder);
    }
  }, []);

  const handleFolderRename = useCallback(
    (folderId: string, newName: string): void => {
      folderStore.folderRenamed({ folderId, newName });
    },
    []
  );

  const handleFolderDelete = useCallback(
    (folderId: string, action: 'move-to-root' | 'delete-all'): void => {
      if (action === 'move-to-root') {
        // Переместить все туры в корень
        const toursInFolder = tours.filter((tour) => tour.folderId === folderId);
        toursInFolder.forEach((tour) => {
          tourStore.tourMovedToFolder({ tourId: tour.id, folderId: null });
        });
      } else if (action === 'delete-all') {
        // Удалить все туры в папке
        const toursInFolder = tours.filter((tour) => tour.folderId === folderId);
        toursInFolder.forEach((tour) => {
          tourStore.tourDeleted(tour.id);
        });
      }

      // Удалить папку
      folderStore.folderDeleted(folderId);
    },
    [tours]
  );

  const renderTour = useCallback(
    (tour: Tour, level: number): JSX.Element => {
      const indentWidth = level * 16;
      return (
        <View key={tour.id} style={{ marginLeft: indentWidth }}>
          <TourCard tour={tour} onPress={handlePress} onDelete={handleDelete} />
        </View>
      );
    },
    [handlePress, handleDelete]
  );

  const renderFolderNode = useCallback(
    (node: FolderTreeNode): JSX.Element[] => {
      const { folder, children, tours, level } = node;
      const isExpanded = expandedFolders.has(folder.id);
      const totalTourCount = tours.length;

      const elements: JSX.Element[] = [];

      // Заголовок папки
      elements.push(
        <FolderHeader
          key={folder.id}
          folder={folder}
          tourCount={totalTourCount}
          level={level}
          isExpanded={isExpanded}
          onToggle={handleFolderToggle}
          onLongPress={handleFolderLongPress}
        />
      );

      if (isExpanded) {
        // Туры в этой папке
        tours.forEach((tour) => {
          elements.push(renderTour(tour, level + 1));
        });

        // Подпапки
        children.forEach((child) => {
          elements.push(...renderFolderNode(child));
        });
      }

      return elements;
    },
    [expandedFolders, handleFolderToggle, handleFolderLongPress, renderTour]
  );

  // Пустое состояние
  if (folderTree.length === 0 && rootTours.length === 0 && !isLoading) {
    return (
      <View style={styles['empty']}>
        <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles['empty-title'], { color: colors.textSecondary }]}>Нет сохранённых экскурсий</Text>
        <Text style={[styles['empty-text'], { color: colors.textSecondary }]}>Сгенерируйте экскурсию и сохраните её для офлайн-доступа</Text>
      </View>
    );
  }

  const deleteFolderTourCount = deleteFolder ? tours.filter((t) => t.folderId === deleteFolder.id).length : 0;
  const deleteFolderHasSubfolders = deleteFolder ? folders.some((f) => f.parentId === deleteFolder.id) : false;

  return (
    <>
      <ScrollView
        style={styles['container']}
        contentContainerStyle={styles['list']}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <View>
            {isLoading && <Text style={{ color: colors.textSecondary }}>Загрузка...</Text>}
          </View>
        }
      >
        {/* Корневые туры (без папки) */}
        {rootTours.map((tour) => renderTour(tour, 0))}

        {/* Папки */}
        {folderTree.map((node) => renderFolderNode(node))}
      </ScrollView>

      <FolderContextMenu
        visible={contextMenuFolder !== null}
        folder={contextMenuFolder}
        onClose={() => {
          setContextMenuFolder(null);
        }}
        onAction={handleContextMenuAction}
      />

      <FolderRenameModal
        visible={renameFolder !== null}
        folder={renameFolder}
        onClose={() => {
          setRenameFolder(null);
        }}
        onRename={handleFolderRename}
      />

      <FolderDeleteConfirmation
        visible={deleteFolder !== null}
        folder={deleteFolder}
        tourCount={deleteFolderTourCount}
        hasSubfolders={deleteFolderHasSubfolders}
        onClose={() => {
          setDeleteFolder(null);
        }}
        onDelete={handleFolderDelete}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: 16,
    gap: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  'empty-title': {
    fontSize: 18,
    fontWeight: '700',
  },
  'empty-text': {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
