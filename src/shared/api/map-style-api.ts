import { MAP_STYLE_URL } from '@app/shared/config';
import { publicGet } from './public-client';

import type {
  LayerSpecification,
  StyleSpecification,
  SymbolLayerSpecification,
} from '@maplibre/maplibre-react-native';
import type { ColorScheme } from '@app/shared/theme';

type TextField = NonNullable<SymbolLayerSpecification['layout']>['text-field'];

const RUSSIAN_NAME: TextField = ['coalesce', ['get', 'name:ru'], ['get', 'name']];

const localizeLayer = (layer: LayerSpecification): LayerSpecification => {
  if (layer.type !== 'symbol') {
    return layer;
  }
  const textField = layer.layout?.['text-field'];
  if (!textField || !JSON.stringify(textField).includes('name')) {
    return layer;
  }
  return { ...layer, layout: { ...layer.layout, 'text-field': RUSSIAN_NAME } };
};

// В стилях OpenFreeMap подписи латиницей, переводим их на name:ru из данных OSM
export const fetchMapStyleApi = async (scheme: ColorScheme): Promise<StyleSpecification> => {
  const style = await publicGet<StyleSpecification>({ url: MAP_STYLE_URL[scheme] });
  return { ...style, layers: style.layers.map(localizeLayer) };
};
