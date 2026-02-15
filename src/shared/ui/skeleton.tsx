import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { JSX } from 'react';
import { useTheme } from '@app/shared/theme';
import { BORDER_RADIUS } from '@app/shared/config';

type SkeletonProps = {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export const Skeleton = ({
  width = '100%',
  height = 16,
  borderRadius = BORDER_RADIUS,
  style,
}: SkeletonProps): JSX.Element => {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.skeleton, colors.skeletonHighlight],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Набор скелетонов для текста экскурсии
export const TourSkeleton = (): JSX.Element => {
  return (
    <View style={styles.tourSkeleton}>
      <Skeleton width="70%" height={24} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="95%" height={16} />
      <Skeleton width="88%" height={16} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="60%" height={16} />
      <View style={styles.gap} />
      <Skeleton width="80%" height={24} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="92%" height={16} />
      <Skeleton width="100%" height={16} />
      <Skeleton width="75%" height={16} />
    </View>
  );
};

const styles = StyleSheet.create({
  skeleton: {
    overflow: 'hidden',
  },
  tourSkeleton: {
    gap: 10,
    padding: 16,
  },
  gap: {
    height: 8,
  },
});
