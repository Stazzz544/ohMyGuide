import type { WikidataSight } from '@app/shared/api';
import type { PlaceKind } from '../model/types';

const MIN_SITELINKS_UNCATEGORIZED = 8;
const MIN_SITELINKS_DESPITE_JUNK_TYPE = 40;

// Утраченное или так и не достроенное здание (Дворец Советов): смотреть на месте нечего
const LOST_TYPES = new Set(['Q19860854', 'Q1570262']);

// Состояние «снесено или разрушено»; восстановленные заново (Храм Христа Спасителя) помечены ещё и «реконструкцией»
const DESTROYED_STATE = 'Q56556915';
const REBUILT_STATE = 'Q1370468';

// В российских данных статус охраны чаще записан классом (P31), а не свойством P1435:
// памятник архитектуры, памятник истории, объект культурного наследия
const HERITAGE_TYPES = new Set(['Q2319498', 'Q1081138', 'Q358']);

// Театры, дворцы, крепости, площади, ансамбли: по названию категорию не определить, но смотреть стоит
const CULTURAL_TYPES = new Set([
  'Q24354',
  'Q11635',
  'Q1698619',
  'Q2416110',
  'Q153562',
  'Q1060829',
  'Q16560',
  'Q23413',
  'Q57821',
  'Q174782',
  'Q1497375',
]);

// Предприятия, транспорт, гостиницы, учреждения, спорт — без статуса наследия это не достопримечательности
const JUNK_TYPES = new Set([
  'Q83405',
  'Q134161',
  'Q891723',
  'Q4830453',
  'Q6881511',
  'Q1248784',
  'Q94993988',
  'Q106643740',
  'Q62447',
  'Q695850',
  'Q131681',
  'Q159719',
  'Q27686',
  'Q55488',
  'Q55485',
  'Q22808404',
  'Q1339195',
  'Q31855',
  'Q166118',
  'Q2122214',
  'Q16917',
  'Q40357',
  'Q3918',
  'Q3914',
  'Q38723',
  'Q917182',
  'Q2143781',
  'Q83620',
  'Q34442',
  'Q2354973',
  'Q16831714',
  'Q1021645',
  'Q1076486',
  'Q483110',
  'Q1154710',
]);

export const isNotableSight = (sight: WikidataSight, kind: PlaceKind): boolean => {
  const { types } = sight;
  const isDestroyed =
    sight.conservationStates.includes(DESTROYED_STATE) && !sight.conservationStates.includes(REBUILT_STATE);
  if (isDestroyed || types.some((type) => LOST_TYPES.has(type))) {
    return false;
  }

  const isHeritage = sight.hasHeritageStatus || types.some((type) => HERITAGE_TYPES.has(type));
  if (isHeritage) {
    return true;
  }
  if (types.some((type) => JUNK_TYPES.has(type))) {
    return sight.sitelinks >= MIN_SITELINKS_DESPITE_JUNK_TYPE;
  }

  return (
    kind !== 'other' || types.some((type) => CULTURAL_TYPES.has(type)) || sight.sitelinks >= MIN_SITELINKS_UNCATEGORIZED
  );
};
