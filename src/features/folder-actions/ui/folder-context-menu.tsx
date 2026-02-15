import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { Folder } from '@app/entities/folder';

type ContextAction = 'rename' | 'delete';

type FolderContextMenuProps = {
  visible: boolean;
  folder: Folder | null;
  onClose: () => void;
  onAction: (action: ContextAction, folder: Folder) => void;
};

export const FolderContextMenu = ({ visible, folder, onClose, onAction }: FolderContextMenuProps): JSX.Element => {
  const { colors } = useTheme();

  const handleRename = () => {
    if (!folder) {
      return;
    }
    onAction('rename', folder);
    onClose();
  };

  const handleDelete = () => {
    if (!folder) {
      return;
    }
    onAction('delete', folder);
    onClose();
  };

  if (!folder) {
    return <></>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles['backdrop']} activeOpacity={1} onPress={onClose} />
      <View style={styles['overlay']} pointerEvents="box-none">
        <View style={[styles['menu'], { backgroundColor: '#FFFFFF' }]}>
          <View style={styles['header']}>
            <Ionicons name="folder" size={20} color={colors.primary} />
            <Text style={[styles['title'], { color: colors.textPrimary }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>

          <View style={styles['divider']} />

          <TouchableOpacity style={styles['menu-item']} onPress={handleRename} activeOpacity={0.7}>
            <Ionicons name="create-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles['menu-text'], { color: colors.textPrimary }]}>Переименовать</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles['menu-item']} onPress={handleDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={20} color={colors.danger} />
            <Text style={[styles['menu-text'], { color: colors.danger }]}>Удалить</Text>
          </TouchableOpacity>

          <View style={styles['divider']} />

          <TouchableOpacity style={styles['menu-item']} onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles['menu-text'], { color: colors.textSecondary }]}>Отмена</Text>
          </TouchableOpacity>
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
  menu: {
    width: '85%',
    maxWidth: 320,
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    opacity: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#d9d9e1',
    marginVertical: 8,
  },
  'menu-item': {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  'menu-text': {
    fontSize: 16,
    lineHeight: 20,
  },
});
