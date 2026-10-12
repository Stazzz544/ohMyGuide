import { buildQuery, publicGet } from './public-client';

import type { GeoBounds, GeoPoint } from '@app/shared/lib';

const WDQS_URL = 'https://query.wikidata.org/sparql';
const SIGHTS_TIMEOUT_MS = 45_000;
const THUMBNAIL_WIDTH = 160;
const AROUND_MIN_SITELINKS = 8;

export type WikidataSight = {
  id: string;
  title: string;
  label: string;
  description: string;
  lat: number;
  lon: number;
  sitelinks: number;
  image: string | null;
};

type SparqlValue = { value: string };

type SparqlRow = {
  item: SparqlValue;
  itemLabel?: SparqlValue;
  itemDescription?: SparqlValue;
  lat: SparqlValue;
  lon: SparqlValue;
  title: SparqlValue;
  sitelinks: SparqlValue;
  image?: SparqlValue;
};

type SparqlResponse = {
  results?: { bindings?: SparqlRow[] };
};

type BoxSightsParams = {
  bounds: GeoBounds;
  minSitelinks: number;
  timeout: number;
};

// Радиус 6 км покрывает 5 км от любой точки ячейки сетки
const aroundClause = ({ lat, lon }: GeoPoint): string => `SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lon.toFixed(2)} ${lat.toFixed(2)})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "6" .
  }`;

const boxClause = ([west, south, east, north]: GeoBounds): string => `SERVICE wikibase:box {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:cornerSouthWest "Point(${west.toFixed(4)} ${south.toFixed(4)})"^^geo:wktLiteral .
    bd:serviceParam wikibase:cornerNorthEast "Point(${east.toFixed(4)} ${north.toFixed(4)})"^^geo:wktLiteral .
  }`;

// Классы: сооружение, музей, парк, памятник, площадь, достопримечательность, археологический объект.
// Минус — станции метро и улицы
const buildSightsQuery = (
  area: string,
  minSitelinks: number,
): string => `SELECT ?item ?itemLabel ?itemDescription ?lat ?lon ?title ?sitelinks ?image WHERE {
  ${area}
  ?item wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= ${minSitelinks})
  ?article schema:about ?item ; schema:isPartOf <https://ru.wikipedia.org/> ; schema:name ?title .
  FILTER EXISTS { ?item wdt:P31/wdt:P279* ?class . VALUES ?class { wd:Q811979 wd:Q33506 wd:Q22698 wd:Q4989906 wd:Q174782 wd:Q570116 wd:Q839954 } }
  MINUS { ?item wdt:P31 ?type . VALUES ?type { wd:Q928830 wd:Q79007 } }
  OPTIONAL { ?item wdt:P18 ?image }
  BIND(geof:latitude(?coord) AS ?lat)
  BIND(geof:longitude(?coord) AS ?lon)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "ru". }
}
ORDER BY DESC(?sitelinks)
LIMIT 200`;

const toSight = (row: SparqlRow): WikidataSight => {
  const label = row.itemLabel?.value;

  return {
    id: row.item.value.split('/').pop() ?? row.item.value,
    title: row.title.value,
    label: label && !/^Q\d+$/.test(label) ? label : row.title.value,
    description: row.itemDescription?.value ?? '',
    lat: Number(row.lat.value),
    lon: Number(row.lon.value),
    sitelinks: Number(row.sitelinks.value),
    image: row.image ? `${row.image.value.replace(/^http:/, 'https:')}?width=${THUMBNAIL_WIDTH}` : null,
  };
};

const fetchSights = async (query: string, timeout: number): Promise<WikidataSight[]> => {
  const data = await publicGet<SparqlResponse>({
    url: `${WDQS_URL}?${buildQuery({ format: 'json', query })}`,
    timeout,
  });

  const unique = new Map<string, WikidataSight>();
  (data.results?.bindings ?? []).forEach((row) => {
    const sight = toSight(row);
    if (!unique.has(sight.id)) {
      unique.set(sight.id, sight);
    }
  });

  return [...unique.values()];
};

export const fetchWikidataSightsApi = (center: GeoPoint): Promise<WikidataSight[]> =>
  fetchSights(buildSightsQuery(aroundClause(center), AROUND_MIN_SITELINKS), SIGHTS_TIMEOUT_MS);

export const fetchWikidataBoxSightsApi = ({
  bounds,
  minSitelinks,
  timeout,
}: BoxSightsParams): Promise<WikidataSight[]> =>
  fetchSights(buildSightsQuery(boxClause(bounds), minSitelinks), timeout);
