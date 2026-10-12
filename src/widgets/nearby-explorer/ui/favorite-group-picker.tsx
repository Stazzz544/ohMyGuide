import { KeyboardAvoidingView, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JSX, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button, TextInput } from '@app/shared/ui';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { favoritesStore } from '@app/entities/favorite';

import type { FavoriteGroupId } from '@app/entities/favorite';

type FavoriteGroupPickerProps = {
  placeId: string;
  currentGroupId: FavoriteGroupId | null;
  onClose: () => void;
};

const MAX_GROUP_NAME_LENGTH = 40;

export const FavoriteGroupPicker = ({ placeId, currentGroupId, onClose }: FavoriteGroupPickerProps): JSX.Element => {
  const { colors } = useTheme();
  const { groups, favoriteGroupSet, groupCreated } = useUnit({
    groups: favoritesStore.$groups,
    favoriteGroupSet: favoritesStore.favoriteGroupSet,
    groupCreated: favoritesStore.groupCreated,
  });
  const [newGroupName, setNewGroupName] = useState('');

  const handleSelect = (groupId: FavoriteGroupId | null): void => {
    favoriteGroupSet({ placeId, groupId });
    onClose();
  };

  const handleCreate = (): void => {
    const name = newGroupName.trim().slice(0, MAX_GROUP_NAME_LENGTH);
    if (!name) {
      return;
    }
    groupCreated({ name, color: null, placeId });
    onClose();
  };

  const options: Array<{ id: FavoriteGroupId | null; name: string; color: string }> = [
    { id: null, name: 'Без группы', color: colors.favoriteDefault },
    ...groups.map((group) => ({ id: group.id, name: group.name, color: group.color ?? colors.favoriteDefault })),
  ];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Закрыть" />
      <KeyboardAvoidingView style={styles.overlay} behavior="padding" pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.bgCard }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Группа</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Закрыть">
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
            {options.map((option) => (
              <Pressable
                key={option.id ?? 'none'}
                onPress={() => handleSelect(option.id)}
                accessibilityRole="radio"
                accessibilityState={{ checked: option.id === currentGroupId }}
                style={({ pressed }) => [styles.option, pressed && { backgroundColor: colors.bgSecondary }]}
              >
                <View style={[styles.dot, { backgroundColor: option.color, borderColor: colors.favoriteStroke }]} />
                <Text style={[styles.optionLabel, { color: colors.textPrimary }]} numberOfLines={1}>
                  {option.name}
                </Text>
                {option.id === currentGroupId && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
          <View style={[styles.create, { borderTopColor: colors.border }]}>
            <TextInput
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Новая группа, например «День 1»"
            />
            <Button label="Создать и выбрать" onPress={handleCreate} disabled={newGroupName.trim().length === 0} />
          </View>
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
    maxHeight: '80%',
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
  },
  create: {
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
