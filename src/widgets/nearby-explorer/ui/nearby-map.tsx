import { ActivityIndicator, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { JSX, useCallback, useMemo } from 'react';
import { useUnit } from 'effector-react';
import { Camera, GeoJSONSource, Layer, Map as MapLibreMap } from '@maplibre/maplibre-react-native';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS, NEARBY_RADIUS_M } from '@app/shared/config';
import { circleBounds, circlePolygon, lineBounds } from '@app/shared/lib';
import { locationModel } from '@app/features/user-location';
import { nearbyModel } from '@app/features/nearby-places';
import { routeModel } from '@app/features/walking-route';
import { explorerModel } from '../model/explorer-model';

import type { CameraStop, PressEventWithFeatures } from '@maplibre/maplibre-react-native';

const CAMERA_PADDING = { top: 16, right: 16, bottom: 16, left: 16 };
const ROUTE_PADDING = { top: 48, right: 48, bottom: 64, left: 48 };
const CAMERA_DURATION_MS = 600;
const SELECTED_ZOOM = 15;
const PLACE_HITBOX = { top: 14, right: 14, bottom: 14, left: 14 };

export const NearbyMap = (): JSX.Element => {
  const { colors, scheme } = useTheme();
  const { origin, position, places, selectedPlace, selectedId, route, mapStyles, placeSelected } = useUnit({
    origin: nearbyModel.$origin,
    position: locationModel.$position,
    places: nearbyModel.$places,
    selectedPlace: nearbyModel.$selectedPlace,
    selectedId: nearbyModel.$selectedId,
    route: routeModel.$route,
    mapStyles: explorerModel.$mapStyles,
    placeSelected: nearbyModel.placeSelected,
  });

  const mapStyle = mapStyles[scheme];

  const radiusData = useMemo(() => (origin ? circlePolygon(origin, NEARBY_RADIUS_M) : null), [origin]);

  const placesData = useMemo(
    (): GeoJSON.FeatureCollection<GeoJSON.Point> => ({
      type: 'FeatureCollection',
      features: places.map((place) => ({
        type: 'Feature',
        properties: { id: place.id, label: place.label },
        geometry: { type: 'Point', coordinates: [place.lon, place.lat] },
      })),
    }),
    [places],
  );

  const positionData = useMemo(
    (): GeoJSON.Feature<GeoJSON.Point> | null =>
      position
        ? { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [position.lon, position.lat] } }
        : null,
    [position],
  );

  const cameraStop = useMemo((): CameraStop | null => {
    if (route) {
      return {
        bounds: lineBounds(route.line.coordinates),
        padding: ROUTE_PADDING,
        duration: CAMERA_DURATION_MS,
        easing: 'ease',
      };
    }
    if (selectedPlace) {
      return {
        center: [selectedPlace.lon, selectedPlace.lat],
        zoom: SELECTED_ZOOM,
        duration: CAMERA_DURATION_MS,
        easing: 'ease',
      };
    }
    if (origin) {
      return {
        bounds: circleBounds(origin, NEARBY_RADIUS_M),
        padding: CAMERA_PADDING,
        duration: CAMERA_DURATION_MS,
        easing: 'ease',
      };
    }
    return null;
  }, [route, selectedPlace, origin]);

  const handlePlacePress = useCallback(
    (event: NativeSyntheticEvent<PressEventWithFeatures>) => {
      const placeId = event.nativeEvent.features[0]?.properties?.id;
      if (typeof placeId === 'string') {
        placeSelected(placeId);
      }
    },
    [placeSelected],
  );

  if (!mapStyle) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <MapLibreMap
      style={styles.map}
      mapStyle={mapStyle}
      logo={false}
      compass={false}
      attributionPosition={{ bottom: CARD_BORDER_RADIUS + 8, left: 8 }}
    >
      {cameraStop && <Camera {...cameraStop} />}
      {radiusData && (
        <GeoJSONSource id="nearby-radius" data={radiusData}>
          <Layer id="nearby-radius-fill" type="fill" paint={{ 'fill-color': colors.primary, 'fill-opacity': 0.06 }} />
          <Layer
            id="nearby-radius-line"
            type="line"
            paint={{ 'line-color': colors.primary, 'line-width': 1.5, 'line-dasharray': [3, 2] }}
          />
        </GeoJSONSource>
      )}
      {route && (
        <GeoJSONSource id="nearby-route" data={route.line}>
          <Layer
            id="nearby-route-casing"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': colors.bgCard, 'line-width': 9 }}
          />
          <Layer
            id="nearby-route-line"
            type="line"
            layout={{ 'line-join': 'round', 'line-cap': 'round' }}
            paint={{ 'line-color': colors.primary, 'line-width': 5 }}
          />
        </GeoJSONSource>
      )}
      <GeoJSONSource id="nearby-places" data={placesData} onPress={handlePlacePress} hitbox={PLACE_HITBOX}>
        <Layer
          id="nearby-places-dot"
          type="circle"
          paint={{
            'circle-radius': ['case', ['==', ['get', 'id'], selectedId ?? ''], 10, 6],
            'circle-color': colors.mapPin,
            'circle-stroke-color': ['case', ['==', ['get', 'id'], selectedId ?? ''], colors.primary, colors.bgCard],
            'circle-stroke-width': ['case', ['==', ['get', 'id'], selectedId ?? ''], 4, 2],
          }}
        />
        <Layer
          id="nearby-places-label"
          type="symbol"
          filter={['==', ['get', 'id'], selectedId ?? '']}
          layout={{
            'text-field': ['get', 'label'],
            'text-font': ['Noto Sans Regular'],
            'text-size': 13,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-max-width': 12,
          }}
          paint={{ 'text-color': colors.textPrimary, 'text-halo-color': colors.bgCard, 'text-halo-width': 1.5 }}
        />
      </GeoJSONSource>
      {positionData && (
        <GeoJSONSource id="nearby-position" data={positionData}>
          <Layer
            id="nearby-position-halo"
            type="circle"
            paint={{ 'circle-radius': 14, 'circle-color': colors.primary, 'circle-opacity': 0.18 }}
          />
          <Layer
            id="nearby-position-dot"
            type="circle"
            paint={{
              'circle-radius': 7,
              'circle-color': colors.primary,
              'circle-stroke-color': colors.bgCard,
              'circle-stroke-width': 3,
            }}
          />
        </GeoJSONSource>
      )}
    </MapLibreMap>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
