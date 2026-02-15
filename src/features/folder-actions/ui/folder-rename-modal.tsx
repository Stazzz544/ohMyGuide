import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { JSX, useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { Folder } from '@app/entities/folder';

type FolderRenameModalProps = {
  visible: boolean;
  folder: Folder | null;
  onClose: () => void;
  onRename: (folderId: string, newName: string) => void;
};

export const FolderRenameModal = ({ visible, folder, onClose, onRename }: FolderRenameModalProps): JSX.Element => {
  const { colors, isDark } = useTheme();
  const [folderName, setFolderName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const modalBg = isDark ? '#1C1C1E' : '#FFFFFF';

  useEffect(() => {
    if (folder && visible) {
      setFolderName(folder.name);
    }
  }, [folder, visible]);

  const handleRename = () => {
    if (!folder) {
      return;
    }

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

    if (trimmedName === folder.name) {
      handleClose();
      return;
    }

    onRename(folder.id, trimmedName);
    handleClose();
  };

  const handleClose = () => {
    setFolderName('');
    setError('');
    onClose();
  };

  if (!folder) {
    return <></>;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableOpacity style={styles['backdrop']} activeOpacity={1} onPress={handleClose} />
      <KeyboardAvoidingView style={styles['overlay']} behavior={Platform.OS === 'ios' ? 'padding' : undefined} pointerEvents="box-none">
        <View style={[styles['modal'], { backgroundColor: modalBg }]}>
          <View style={[styles['header'], { backgroundColor: modalBg }]}>
            <Text style={[styles['title'], { color: colors.textPrimary }]}>Переименовать папку</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={[styles['body'], { backgroundColor: modalBg }]}>
            <Text style={[styles['label'], { color: colors.textPrimary }]}>Новое название</Text>
            <TextInput
              style={[
                styles['input'],
                {
                  backgroundColor: colors.backgroundSecondary,
                  color: colors.textPrimary,
                  borderColor: error ? colors.danger : colors.borderColor,
                },
              ]}
              placeholder="Введите название"
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
              onPress={handleRename}
              activeOpacity={0.7}
            >
              <Text style={[styles['button-text'], styles['button-text-primary']]}>Переименовать</Text>
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
