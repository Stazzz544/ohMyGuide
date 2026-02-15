import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { JSX, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { FolderId } from '@app/entities/folder';

type FolderCreateModalProps = {
  visible: boolean;
  parentId: FolderId | null;
  parentName?: string;
  onClose: () => void;
  onCreate: (name: string, parentId: FolderId | null) => void;
};

export const FolderCreateModal = ({ visible, parentId, parentName, onClose, onCreate }: FolderCreateModalProps): JSX.Element => {
  const { colors, isDark } = useTheme();
  const [folderName, setFolderName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

  const handleCreate = () => {
    const trimmedName = folderName.trim();

    if (!trimmedName) {
      setError('Введите название папки');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Название должно быть не менее 2 символов');
      return;
    }

    if (trimmedName.length > 50) {
      setError('Название не должно превышать 50 символов');
      return;
    }

    onCreate(trimmedName, parentId);
    handleClose();
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles['backdrop']} activeOpacity={1} onPress={handleClose} />
      <KeyboardAvoidingView style={styles['overlay']} behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <View style={[styles['modal'], { backgroundColor: modalBg }]}>
          <View style={[styles['header'], { backgroundColor: modalBg }]}>
            <Text style={[styles['title'], { color: colors.textPrimary }]}>Новая папка</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {parentName && (
            <View style={[styles['parent-info'], { backgroundColor: colors.backgroundSecondary }]}>
              <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles['parent-text'], { color: colors.textSecondary }]}>Внутри папки "{parentName}"</Text>
            </View>
          )}

          <View style={[styles['body'], { backgroundColor: modalBg }]}>
            <Text style={[styles['label'], { color: colors.textPrimary }]}>Название папки</Text>
            <TextInput
              style={[
                styles['input'],
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: error ? colors.danger : colors.borderColor,
                },
              ]}
              placeholder="Например: Россия"
              placeholderTextColor={colors.textSecondary}
              value={folderName}
              onChangeText={(text) => {
                setFolderName(text);
                setError('');
              }}
              autoFocus
              maxLength={50}
            />
            {error && <Text style={[styles['error'], { color: colors.danger }]}>{error}</Text>}
          </View>

          <View style={[styles['footer'], { backgroundColor: modalBg }]}>
            <TouchableOpacity
              style={[styles['button'], styles['button-secondary'], { borderColor: colors.borderColor }]}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles['button-text'], { color: colors.textSecondary }]}>Отмена</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles['button'], styles['button-primary'], { backgroundColor: colors.primary }]}
              onPress={handleCreate}
              activeOpacity={0.7}
            >
              <Text style={[styles['button-text'], styles['button-text-primary']]}>Создать</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  'parent-info': {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  'parent-text': {
    fontSize: 14,
    lineHeight: 18,
  },
  body: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    lineHeight: 20,
  },
  error: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 4,
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
