import * as Location from 'expo-location';

import type { GeoPoint } from './geo';

// Геокодер Android работает на устройстве и бесплатен; без сети вернёт пустой результат
export const reverseGeocode = async ({ lat, lon }: GeoPoint): Promise<string> => {
  const [address] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
  if (!address) {
    return '';
  }

  const street = [address.street ?? address.name, address.streetNumber].filter(Boolean).join(', ');
  return [street, address.city ?? address.region].filter(Boolean).join(', ');
};
