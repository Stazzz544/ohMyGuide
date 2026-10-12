export type PlaceSource = 'wikidata' | 'wikipedia';

export type Place = {
  id: string;
  title: string;
  label: string;
  description: string;
  lat: number;
  lon: number;
  distanceM: number;
  // Число языковых разделов Википедии со статьёй о месте, у статей из GeoSearch — 0
  fame: number;
  thumbnail: string | null;
  source: PlaceSource;
};

export type PlaceSort = 'distance' | 'fame';
