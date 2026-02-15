import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import type { FolderTreeNode, FolderId } from '@app/entities/folder';

type FolderTreeItemProps = {
  node: FolderTreeNode;
  isExpanded: boolean;
  selectedFolderId: FolderId | null;
  onToggle: (folderId: FolderId) => void;
  onSelect: (folderId: FolderId) => void;
  onCreateSubfolder: (parentId: FolderId) => void;
};

export const FolderTreeItem = ({
  node,
  isExpanded,
  selectedFolderId,
  onToggle,
  onSelect,
  onCreateSubfolder,
}: FolderTreeItemProps): JSX.Element => {
  const { colors } = useTheme();
  const { folder, children, tours, level } = node;

  const hasChildren = children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const tourCount = tours.length;

  const indentWidth = level * 20;

  const handlePress = () => {
    onSelect(folder.id);
  };

  const handleToggle = () => {
    if (hasChildren) {
      onToggle(folder.id);
    }
  };

  const handleCreateSubfolder = () => {
    onCreateSubfolder(folder.id);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles['item'],
          { backgroundColor: isSelected ? colors.backgroundHover : colors.background },
          { marginLeft: indentWidth },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles['left']}>
          {hasChildren ? (
            <TouchableOpacity onPress={handleToggle} style={styles['toggle']} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name={isExpanded ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={styles['toggle']} />
          )}

          <Ionicons name="folder" size={20} color={isSelected ? colors.primary : colors.textSecondary} />

          <View style={styles['info']}>
            <Text style={[styles['name'], { color: isSelected ? colors.primary : colors.textPrimary }]}>{folder.name}</Text>
            {tourCount > 0 && (
              <Text style={[styles['count'], { color: colors.textSecondary }]}>
                {tourCount} {tourCount === 1 ? 'экскурсия' : tourCount < 5 ? 'экскурсии' : 'экскурсий'}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={handleCreateSubfolder} style={styles['add-button']} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="add-circle-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>

      {isExpanded &&
        hasChildren &&
        children.map((child) => (
          <FolderTreeItem
            key={child.folder.id}
            node={child}
            isExpanded={false}
            selectedFolderId={selectedFolderId}
            onToggle={onToggle}
            onSelect={onSelect}
            onCreateSubfolder={onCreateSubfolder}
          />
        ))}
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toggle: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'column',
    gap: 2,
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  count: {
    fontSize: 12,
    lineHeight: 16,
  },
  'add-button': {
    padding: 4,
  },
});
