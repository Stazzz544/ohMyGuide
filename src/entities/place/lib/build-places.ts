import { distanceM } from '@app/shared/lib';
import { detectPlaceKind } from './place-kind';

import type { WikiNearbyPage, WikidataSight } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';
import type { Place, PlaceSort } from '../model/types';

//  в JS работает только для латиницы, поэтому границы слов по кириллице — через lookahead
// \b в JS работает только для латиницы, поэтому конец слова по кириллице — через lookahead
const NOT_SIGHTS_PATTERN =
  /(станци[яи] метро|\(станция|улица|переулок|проезд|тупик|шоссе|проспект|бульвар|набережная|район(?![а-яё])|округ(?![а-яё])|^список)/i;

// Если известных мест мало (небольшой город), добираем ближайшими статьями Википедии
const MIN_SIGHTS_WITHOUT_NEAREST = 15;

type BuildPlacesParams = {
  origin: GeoPoint;
  radiusM: number;
  sights: WikidataSight[];
  nearest: WikiNearbyPage[];
  sort: PlaceSort;
};

const fromSight = (sight: WikidataSight, origin: GeoPoint): Place => ({
  id: sight.id,
  title: sight.title,
  label: sight.label,
  description: sight.description,
  lat: sight.lat,
  lon: sight.lon,
  distanceM: distanceM(origin, sight),
  fame: sight.sitelinks,
  thumbnail: sight.image,
  source: 'wikidata',
  kind: detectPlaceKind(sight.label, sight.description),
});

const fromWikiPage = (page: WikiNearbyPage, origin: GeoPoint): Place => ({
  id: `wiki-${page.pageId}`,
  title: page.title,
  label: page.title,
  description: page.description,
  lat: page.lat,
  lon: page.lon,
  distanceM: distanceM(origin, page),
  fame: 0,
  thumbnail: page.thumbnail,
  source: 'wikipedia',
  kind: detectPlaceKind(page.title, page.description),
});

const comparePlaces = (sort: PlaceSort) => (a: Place, b: Place): number => {
  if (sort === 'fame') {
    return b.fame - a.fame || a.distanceM - b.distanceM;
  }
  return a.distanceM - b.distanceM;
};

export const buildPlaces = ({ origin, radiusM, sights, nearest, sort }: BuildPlacesParams): Place[] => {
  const known = sights
    .map((sight) => fromSight(sight, origin))
    .filter((place) => place.distanceM <= radiusM);

  if (known.length >= MIN_SIGHTS_WITHOUT_NEAREST) {
    return known.sort(comparePlaces(sort));
  }

  const knownTitles = new Set(known.map((place) => place.title.toLowerCase()));
  const extra = nearest
    .map((page) => fromWikiPage(page, origin))
    .filter(
      (place) =>
        place.distanceM <= radiusM &&
        !knownTitles.has(place.title.toLowerCase()) &&
        !NOT_SIGHTS_PATTERN.test(`${place.title} ${place.description}`),
    );

  return [...known, ...extra].sort(comparePlaces(sort));
};
