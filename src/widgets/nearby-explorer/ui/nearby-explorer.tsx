import { StyleSheet, View } from 'react-native';
import { JSX, useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { locationModel } from '@app/features/user-location';
import { explorerModel } from '../model/explorer-model';
import { NearbyMap } from './nearby-map';
import { NearbyList } from './nearby-list';
import { LocatingState, PermissionDenied } from './location-states';
import { PlaceCard } from './place-card';

export const NearbyExplorer = (): JSX.Element => {
  const { colors, scheme } = useTheme();
  const { permission, position, locationError, explorerOpened, mapStyleRequested } = useUnit({
    permission: locationModel.$permission,
    position: locationModel.$position,
    locationError: locationModel.$error,
    explorerOpened: explorerModel.explorerOpened,
    mapStyleRequested: explorerModel.mapStyleRequested,
  });

  useEffect(() => {
    explorerOpened();
  }, [explorerOpened]);

  useEffect(() => {
    mapStyleRequested(scheme);
  }, [mapStyleRequested, scheme]);

  if (permission === 'denied') {
    return <PermissionDenied />;
  }

  if (!position) {
    return <LocatingState error={locationError} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={styles.map}>
        <NearbyMap />
      </View>
      <View style={[styles.panel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        <PlaceCard />
        <NearbyList />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1.1,
  },
  panel: {
    flex: 1,
    marginTop: -CARD_BORDER_RADIUS,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
