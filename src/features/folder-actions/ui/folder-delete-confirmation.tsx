import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { Folder } from '@app/entities/folder';

type DeleteAction = 'move-to-root' | 'delete-all';

type FolderDeleteConfirmationProps = {
  visible: boolean;
  folder: Folder | null;
  tourCount: number;
  hasSubfolders: boolean;
  onClose: () => void;
  onDelete: (folderId: string, action: DeleteAction) => void;
};

export const FolderDeleteConfirmation = ({
  visible,
  folder,
  tourCount,
  hasSubfolders,
  onClose,
  onDelete,
}: FolderDeleteConfirmationProps): JSX.Element => {
  const { colors, isDark } = useTheme();
  const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

  const handleMoveToRoot = () => {
    if (!folder) {
      return;
    }
    onDelete(folder.id, 'move-to-root');
    onClose();
  };

  const handleDeleteAll = () => {
    if (!folder) {
      return;
    }
    onDelete(folder.id, 'delete-all');
    onClose();
  };

  if (!folder) {
    return <></>;
  }

  const hasTours = tourCount > 0;
  const canDelete = !hasTours && !hasSubfolders;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles['backdrop']} activeOpacity={1} onPress={onClose} />
      <View style={styles['overlay']} pointerEvents="box-none">
        <View style={[styles['modal'], { backgroundColor: modalBg }]}>
          <View style={styles['header']}>
            <View style={[styles['icon-container'], { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="trash-outline" size={24} color={colors.danger} />
            </View>
            <Text style={[styles['title'], { color: colors.textPrimary }]}>Удалить папку?</Text>
          </View>

          <Text style={[styles['message'], { color: colors.textSecondary }]}>
            Вы действительно хотите удалить папку <Text style={[styles['folder-name'], { color: colors.textPrimary }]}>"{folder.name}"</Text>?
          </Text>

          {hasTours && (
            <View style={[styles['warning'], { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
              <Text style={[styles['warning-text'], { color: colors.textPrimary }]}>
                В папке {tourCount} {tourCount === 1 ? 'экскурсия' : tourCount < 5 ? 'экскурсии' : 'экскурсий'}
                {hasSubfolders && ' и есть подпапки'}
              </Text>
            </View>
          )}

          {hasSubfolders && !hasTours && (
            <View style={[styles['warning'], { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="warning-outline" size={20} color={colors.warning} />
              <Text style={[styles['warning-text'], { color: colors.textPrimary }]}>В папке есть подпапки</Text>
            </View>
          )}

          <View style={styles['actions']}>
            {hasTours || hasSubfolders ? (
              <>
                <TouchableOpacity
                  style={[styles['action-button'], styles['action-button-move'], { borderColor: colors.primary }]}
                  onPress={handleMoveToRoot}
                  activeOpacity={0.7}
                >
                  <Ionicons name="arrow-up-outline" size={18} color={colors.primary} />
                  <Text style={[styles['action-text'], { color: colors.primary }]}>Переместить в корень</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles['action-button'], styles['action-button-delete'], { backgroundColor: colors.danger }]}
                  onPress={handleDeleteAll}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                  <Text style={[styles['action-text'], styles['action-text-white']]}>Удалить всё</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles['action-button'], styles['action-button-delete'], { backgroundColor: colors.danger }]}
                onPress={handleDeleteAll}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={[styles['action-text'], styles['action-text-white']]}>Удалить</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles['action-button'], styles['action-button-cancel'], { borderColor: colors.borderColor }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles['action-text'], { color: colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  'icon-container': {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  'folder-name': {
    fontWeight: '600',
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  'warning-text': {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  actions: {
    gap: 8,
  },
  'action-button': {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  'action-button-move': {
    borderWidth: 1,
  },
  'action-button-delete': {
    // backgroundColor задаётся динамически
  },
  'action-button-cancel': {
    borderWidth: 1,
  },
  'action-text': {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  'action-text-white': {
    color: '#ffffff',
  },
});
