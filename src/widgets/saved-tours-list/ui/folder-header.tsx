import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { Folder } from '@app/entities/folder';

type FolderHeaderProps = {
  folder: Folder;
  tourCount: number;
  level: number;
  isExpanded: boolean;
  onToggle: (folderId: string) => void;
  onLongPress?: (folder: Folder) => void;
};

export const FolderHeader = ({ folder, tourCount, level, isExpanded, onToggle, onLongPress }: FolderHeaderProps): JSX.Element => {
  const { colors } = useTheme();
  const indentWidth = level * 16;

  const handlePress = () => {
    onToggle(folder.id);
  };

  const handleLongPress = () => {
    if (onLongPress) {
      onLongPress(folder);
    }
  };

  const tourCountText = tourCount === 0 ? 'Пусто' : `${tourCount} ${tourCount === 1 ? 'экскурсия' : tourCount < 5 ? 'экскурсии' : 'экскурсий'}`;

  return (
    <TouchableOpacity
      style={[styles['container'], { marginLeft: indentWidth, backgroundColor: colors.backgroundSecondary }]}
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={styles['left']}>
        <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.textSecondary} />
        <Ionicons name={isExpanded ? 'folder-open' : 'folder'} size={20} color={colors.primary} />
        <View style={styles['info']}>
          <Text style={[styles['name'], { color: colors.textPrimary }]}>{folder.name}</Text>
          <Text style={[styles['count'], { color: colors.textSecondary }]}>{tourCountText}</Text>
        </View>
      </View>
      <View style={[styles['badge'], { backgroundColor: colors.primary }]}>
        <Text style={styles['badge-text']}>{tourCount}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  info: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  count: {
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  'badge-text': {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
});
