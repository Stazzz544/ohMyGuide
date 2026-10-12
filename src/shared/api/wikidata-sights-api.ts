import { buildQuery, publicGet } from './public-client';

import type { GeoPoint } from '@app/shared/lib';

const WDQS_URL = 'https://query.wikidata.org/sparql';
const SIGHTS_TIMEOUT_MS = 45_000;
const THUMBNAIL_WIDTH = 160;

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

// Классы: сооружение, музей, парк, памятник, площадь, достопримечательность, археологический объект.
// Минус — станции метро и улицы. Радиус 6 км покрывает 5 км от любой точки ячейки сетки.
const buildSightsQuery = ({ lat, lon }: GeoPoint): string => `SELECT ?item ?itemLabel ?itemDescription ?lat ?lon ?title ?sitelinks ?image WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${lon.toFixed(2)} ${lat.toFixed(2)})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "6" .
  }
  ?item wikibase:sitelinks ?sitelinks .
  FILTER(?sitelinks >= 8)
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

export const fetchWikidataSightsApi = async (center: GeoPoint): Promise<WikidataSight[]> => {
  const data = await publicGet<SparqlResponse>({
    url: `${WDQS_URL}?${buildQuery({ format: 'json', query: buildSightsQuery(center) })}`,
    timeout: SIGHTS_TIMEOUT_MS,
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
