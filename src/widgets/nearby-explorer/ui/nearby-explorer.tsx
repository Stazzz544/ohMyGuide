import { StyleSheet, View } from 'react-native';
import { JSX, useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { locationModel } from '@app/features/user-location';
import { nearbyModel } from '@app/features/nearby-places';
import { explorerModel } from '../model/explorer-model';
import { NearbyMap } from './nearby-map';
import { NearbyList } from './nearby-list';
import { FavoritesList } from './favorites-list';
import { PanelTabs } from './panel-tabs';
import { LocatingState, PermissionDenied } from './location-states';
import { PlaceCard } from './place-card';
import { RadiusSwitch } from './radius-switch';

// Полоса карты при развёрнутом списке: в ней остаётся место для переключателя радиуса
const MAP_COLLAPSED_HEIGHT = 150;

export const NearbyExplorer = (): JSX.Element => {
  const { colors, scheme } = useTheme();
  const {
    permission,
    position,
    locationError,
    selectedPlace,
    panelMode,
    isListExpanded,
    explorerOpened,
    mapStyleRequested,
  } = useUnit({
    permission: locationModel.$permission,
    position: locationModel.$position,
    locationError: locationModel.$error,
    selectedPlace: nearbyModel.$selectedPlace,
    panelMode: explorerModel.$panelMode,
    isListExpanded: explorerModel.$isListExpanded,
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

  const isPlaceSelected = selectedPlace !== null;

  // Карточка выбранного места — отдельная панель вместо списка. Список прячем, но не размонтируем (сохраняется
  // скролл), и flex-стиль его панели не переключаем: Yoga после такого переключения раскладывала панель неверно
  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <View style={isListExpanded && !isPlaceSelected ? styles.mapCollapsed : styles.map}>
        <NearbyMap />
        {!isPlaceSelected && <RadiusSwitch />}
      </View>
      <View
        style={[
          styles.panel,
          styles.panelWithList,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
          isPlaceSelected && styles.hidden,
        ]}
      >
        <PanelTabs />
        <View style={[styles.list, panelMode !== 'nearby' && styles.hidden]}>
          <NearbyList />
        </View>
        <View style={[styles.list, panelMode !== 'favorites' && styles.hidden]}>
          <FavoritesList />
        </View>
      </View>
      {isPlaceSelected && (
        <View style={[styles.panel, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <PlaceCard />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flexGrow: 1.1,
    flexShrink: 1,
    flexBasis: 0,
  },
  mapCollapsed: {
    flexGrow: 0,
    flexShrink: 0,
    height: MAP_COLLAPSED_HEIGHT,
  },
  panel: {
    marginTop: -CARD_BORDER_RADIUS,
    borderTopLeftRadius: CARD_BORDER_RADIUS,
    borderTopRightRadius: CARD_BORDER_RADIUS,
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  panelWithList: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  list: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
