import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { JSX, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { folderStore, $folderTree } from '@app/entities/folder';
import type { FolderId } from '@app/entities/folder';
import { FolderTreeItem } from './folder-tree-item';
import { FolderCreateModal } from './folder-create-modal';
import type { FolderPickerModel } from '../model/folder-picker-model';

type FolderPickerModalProps = {
  visible: boolean;
  model: FolderPickerModel;
  onClose: () => void;
  onSelect: (folderId: FolderId | null) => void;
};

export const FolderPickerModal = ({ visible, model, onClose, onSelect }: FolderPickerModalProps): JSX.Element => {
  const { colors } = useTheme();
  const [selectedFolderId, setSelectedFolderId] = useState<FolderId | null>(null);

  const { folderTree, expandedFolders, isCreateModalOpen, createModalParentId, folders } = useUnit({
    folderTree: $folderTree,
    expandedFolders: model.$expandedFolders,
    isCreateModalOpen: model.$isCreateModalOpen,
    createModalParentId: model.$createModalParentId,
    folders: folderStore.$folders,
  });

  const handleSelectFolder = (folderId: FolderId) => {
    setSelectedFolderId(folderId);
  };

  const handleSelectRoot = () => {
    setSelectedFolderId(null);
  };

  const handleConfirm = () => {
    onSelect(selectedFolderId);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFolderId(null);
    model.allFoldersCollapsed();
    onClose();
  };

  const handleCreateFolder = (name: string, parentId: FolderId | null) => {
    folderStore.folderCreated({ name, parentId });
    model.createModalClosed();
  };

  const handleOpenCreateModal = (parentId: FolderId | null) => {
    model.createModalOpened(parentId);
  };

  const parentFolder = folders.find((f) => f.id === createModalParentId);

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
        <TouchableOpacity style={styles['backdrop']} activeOpacity={1} onPress={handleClose} />
        <View style={styles['overlay']} pointerEvents="box-none">
          <View style={[styles['modal'], { backgroundColor: '#FFFFFF' }]}>
            <View style={[styles['header'], { backgroundColor: '#FFFFFF' }]}>
              <Text style={[styles['title'], { color: colors.textPrimary }]}>Выберите папку</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles['list'], { backgroundColor: '#FFFFFF' }]} showsVerticalScrollIndicator={false}>
              {/* Опция "Без папки" */}
              <TouchableOpacity
                style={[
                  styles['root-item'],
                  { backgroundColor: selectedFolderId === null ? colors.backgroundHover : colors.background },
                ]}
                onPress={handleSelectRoot}
                activeOpacity={0.7}
              >
                <View style={styles['root-left']}>
                  <Ionicons name="home-outline" size={20} color={selectedFolderId === null ? colors.primary : colors.textSecondary} />
                  <Text style={[styles['root-text'], { color: selectedFolderId === null ? colors.primary : colors.textPrimary }]}>
                    Без папки (в корне)
                  </Text>
                </View>
                {selectedFolderId === null && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </TouchableOpacity>

              {/* Кнопка создания новой папки */}
              <TouchableOpacity
                style={[styles['create-button'], { borderColor: colors.borderColor }]}
                onPress={() => {
                  handleOpenCreateModal(null);
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                <Text style={[styles['create-text'], { color: colors.primary }]}>Создать новую папку</Text>
              </TouchableOpacity>

              {/* Дерево папок */}
              {folderTree.length > 0 && (
                <View style={styles['tree']}>
                  {folderTree.map((node) => (
                    <FolderTreeItem
                      key={node.folder.id}
                      node={node}
                      isExpanded={expandedFolders.has(node.folder.id)}
                      selectedFolderId={selectedFolderId}
                      onToggle={model.folderToggled}
                      onSelect={handleSelectFolder}
                      onCreateSubfolder={handleOpenCreateModal}
                    />
                  ))}
                </View>
              )}

              {folderTree.length === 0 && (
                <View style={styles['empty']}>
                  <Ionicons name="folder-open-outline" size={48} color={colors.textSecondary} />
                  <Text style={[styles['empty-text'], { color: colors.textSecondary }]}>Папок пока нет</Text>
                  <Text style={[styles['empty-hint'], { color: colors.textSecondary }]}>Создайте первую папку для организации экскурсий</Text>
                </View>
              )}
            </ScrollView>

            <View style={[styles['footer'], { backgroundColor: '#FFFFFF' }]}>
              <TouchableOpacity
                style={[styles['button'], styles['button-secondary'], { borderColor: colors.borderColor }]}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <Text style={[styles['button-text'], { color: colors.textSecondary }]}>Отмена</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles['button'], styles['button-primary'], { backgroundColor: colors.primary }]}
                onPress={handleConfirm}
                activeOpacity={0.7}
              >
                <Text style={[styles['button-text'], styles['button-text-primary']]}>Выбрать</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <FolderCreateModal
        visible={isCreateModalOpen}
        parentId={createModalParentId}
        parentName={parentFolder?.name}
        onClose={model.createModalClosed}
        onCreate={handleCreateFolder}
      />
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    maxHeight: '80%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  list: {
    maxHeight: 400,
    marginBottom: 16,
  },
  'root-item': {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  'root-left': {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  'root-text': {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  'create-button': {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  'create-text': {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  tree: {
    gap: 4,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  'empty-text': {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  'empty-hint': {
    fontSize: 14,
    lineHeight: 18,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  'button-secondary': {
    borderWidth: 1,
  },
  'button-primary': {
    // backgroundColor задаётся динамически
  },
  'button-text': {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  'button-text-primary': {
    color: '#ffffff',
  },
});
