import { Alert, KeyboardAvoidingView, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button, TextInput } from '@app/shared/ui';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { ColorPalette, favoritesStore } from '@app/entities/favorite';

import type { FavoriteGroup } from '@app/entities/favorite';

type FavoriteGroupEditorProps = {
  group: FavoriteGroup | null;
  onClose: () => void;
};

const MAX_GROUP_NAME_LENGTH = 40;

export const FavoriteGroupEditor = ({ group, onClose }: FavoriteGroupEditorProps): JSX.Element => {
  const { colors } = useTheme();
  const { groupCreated, groupUpdated, groupDeleted } = useUnit({
    groupCreated: favoritesStore.groupCreated,
    groupUpdated: favoritesStore.groupUpdated,
    groupDeleted: favoritesStore.groupDeleted,
  });
  const [name, setName] = useState(group?.name ?? '');
  const [color, setColor] = useState<string | null>(group?.color ?? null);
  const trimmedName = name.trim().slice(0, MAX_GROUP_NAME_LENGTH);

  const handleSave = (): void => {
    if (!trimmedName) {
      return;
    }
    if (group) {
      groupUpdated({ id: group.id, name: trimmedName, color });
    } else {
      groupCreated({ name: trimmedName, color });
    }
    onClose();
  };

  const handleDelete = (): void => {
    if (!group) {
      return;
    }
    Alert.alert(`Удалить группу «${group.name}»?`, 'Места останутся в избранном без группы', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          groupDeleted(group.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
      <KeyboardAvoidingView style={styles.overlay} behavior="padding" pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{group ? 'Группа' : 'Новая группа'}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Закрыть">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <TextInput
            value={name}
            onChangeText={setName}
            label="Название"
            placeholder="Например, «День 1» или «Музеи»"
          />
          <View style={styles.colors}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>Цвет меток</Text>
            <ColorPalette
              value={color}
              onChange={setColor}
              defaultLabel="Жёлтый, по умолчанию"
              defaultColor={colors.favoriteDefault}
            />
          </View>
          <Button label={group ? 'Сохранить' : 'Создать'} onPress={handleSave} disabled={!trimmedName} />
          {group && <Button label="Удалить группу" variant="ghost" appearance="danger" onPress={handleDelete} />}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    gap: 14,
    padding: 16,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  colors: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
});
