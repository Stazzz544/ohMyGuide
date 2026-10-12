import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { JSX, useCallback, useMemo, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { pluralize } from '@app/shared/lib';
import { PLACE_KIND_LABELS, PlaceRow } from '@app/entities/place';
import { favoriteToPlace, favoritesStore } from '@app/entities/favorite';
import { locationModel } from '@app/features/user-location';
import { nearbyModel } from '@app/features/nearby-places';
import { FavoriteGroupEditor } from './favorite-group-editor';

import type { SectionListData, SectionListRenderItem } from 'react-native';
import type { Place, PlaceKind } from '@app/entities/place';
import type { FavoriteGroup } from '@app/entities/favorite';

type Grouping = 'groups' | 'kinds';

type FavoriteSection = {
  key: string;
  title: string;
  color: string | null;
  group: FavoriteGroup | null;
  data: Place[];
};

type GroupEditorState = {
  group: FavoriteGroup | null;
};

const PLACE_FORMS = { one: 'место', few: 'места', many: 'мест' };
const KINDS = Object.keys(PLACE_KIND_LABELS) as PlaceKind[];

const GROUPING_OPTIONS: Array<{ value: Grouping; label: string }> = [
  { value: 'groups', label: 'Мои группы' },
  { value: 'kinds', label: 'По типам' },
];

export const FavoritesList = (): JSX.Element => {
  const { colors } = useTheme();
  const { favorites, groups, position, placeSelected } = useUnit({
    favorites: favoritesStore.$favorites,
    groups: favoritesStore.$groups,
    position: locationModel.$position,
    placeSelected: nearbyModel.placeSelected,
  });
  const [grouping, setGrouping] = useState<Grouping>('groups');
  const [groupEditor, setGroupEditor] = useState<GroupEditorState | null>(null);

  const sections = useMemo((): FavoriteSection[] => {
    const places = favorites
      .map((favorite) => ({ favorite, place: favoriteToPlace(favorite, position) }))
      .sort((a, b) => a.place.distanceM - b.place.distanceM);

    if (grouping === 'kinds') {
      return KINDS.map((kind) => ({
        key: kind,
        title: PLACE_KIND_LABELS[kind],
        color: null,
        group: null,
        data: places.filter(({ place }) => place.kind === kind).map(({ place }) => place),
      })).filter((section) => section.data.length > 0);
    }

    const groupIds = new Set(groups.map((group) => group.id));
    const ungrouped = places.filter(({ favorite }) => favorite.groupId === null || !groupIds.has(favorite.groupId));
    const groupSections = groups.map((group) => ({
      key: group.id,
      title: group.name,
      color: group.color ?? colors.favoriteDefault,
      group,
      data: places.filter(({ favorite }) => favorite.groupId === group.id).map(({ place }) => place),
    }));

    return ungrouped.length > 0
      ? [
          ...groupSections,
          {
            key: 'ungrouped',
            title: 'Без группы',
            color: colors.favoriteDefault,
            group: null,
            data: ungrouped.map(({ place }) => place),
          },
        ]
      : groupSections;
  }, [favorites, groups, position, grouping, colors.favoriteDefault]);

  const renderItem: SectionListRenderItem<Place, FavoriteSection> = useCallback(
    ({ item }) => <PlaceRow place={item} isSelected={false} onPress={placeSelected} />,
    [placeSelected],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Place, FavoriteSection> }) => (
      <View style={[styles.sectionHeader, { backgroundColor: colors.bgSecondary }]}>
        {section.color && (
          <View style={[styles.dot, { backgroundColor: section.color, borderColor: colors.favoriteStroke }]} />
        )}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {section.title}
        </Text>
        <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>{section.data.length}</Text>
        {section.group && (
          <Pressable
            onPress={() => setGroupEditor({ group: section.group })}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Изменить группу «${section.title}»`}
          >
            <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    ),
    [colors],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: SectionListData<Place, FavoriteSection> }) =>
      section.data.length === 0 ? (
        <Text style={[styles.sectionEmpty, { color: colors.textSecondary }]}>
          Пока пусто — выберите эту группу в карточке места
        </Text>
      ) : null,
    [colors],
  );

  const title = favorites.length > 0 ? `${pluralize(favorites.length, PLACE_FORMS)} в избранном` : 'Избранное';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Pressable
            onPress={() => setGroupEditor({ group: null })}
            accessibilityRole="button"
            style={[styles.chip, styles.addGroup, { borderColor: colors.border }]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.chipLabel, { color: colors.primary }]}>Группа</Text>
          </Pressable>
        </View>
        {favorites.length > 0 && (
          <View style={styles.chips}>
            {GROUPING_OPTIONS.map((option) => {
              const isActive = grouping === option.value;

              return (
                <Pressable
                  key={option.value}
                  onPress={() => setGrouping(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  style={[
                    styles.chip,
                    { borderColor: colors.border },
                    isActive && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
                  ]}
                >
                  <Text style={[styles.chipLabel, { color: isActive ? colors.bgPrimary : colors.textSecondary }]}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {favorites.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="star-outline" size={32} color={colors.favoriteDefault} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Нажмите на звёздочку в карточке места — оно появится здесь и всегда будет видно на карте
          </Text>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        renderSectionFooter={renderSectionFooter}
        stickySectionHeadersEnabled={false}
      />

      {groupEditor && <FavoriteGroupEditor group={groupEditor.group} onClose={() => setGroupEditor(null)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  addGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 8,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionCount: {
    flex: 1,
    fontSize: 13,
  },
  sectionEmpty: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
  },
  empty: {
    alignItems: 'center',
    gap: 10,
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    textAlign: 'center',
  },
});
