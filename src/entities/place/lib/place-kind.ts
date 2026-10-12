import type { PlaceKind } from '../model/types';

export const PLACE_KIND_LABELS: Record<PlaceKind, string> = {
  temple: 'Храмы',
  museum: 'Музеи',
  park: 'Парки',
  monument: 'Памятники',
  other: 'Другое',
};

const KIND_PATTERNS: Array<[PlaceKind, RegExp]> = [
  ['temple', /(храм|собор|церк|монастыр|часовн|мечеть|синагог|костёл|костел|кирх|лавра|подворье)/i],
  ['museum', /(музей|галере|выставочн)/i],
  ['park', /(парк|(^|[^а-яё])сад(?![а-яё])|заповедник|роща)/i],
  ['monument', /(памятник|монумент|мемориал|скульптур|обелиск|стела|бюст)/i],
];

// «Памятник архитектуры» в описании здания — статус охраны, а не категория места
const HERITAGE_STATUS_PATTERN = /памятник (архитектуры|истории|градостроительства)|объект культурного наследия/gi;

const matchKind = (text: string): PlaceKind | null =>
  KIND_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;

// Название надёжнее описания: «Музей-заповедник «Царицыно»» — музей, хотя в описании есть «парк»
export const detectPlaceKind = (title: string, description: string): PlaceKind =>
  matchKind(title) ?? matchKind(description.replace(HERITAGE_STATUS_PATTERN, '')) ?? 'other';
