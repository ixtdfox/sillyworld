/** Константа `SCHEMA_VERSION` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const SCHEMA_VERSION = 4 as const;

/** Константа `TIME_PHASE` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const TIME_PHASE = Object.freeze({
  Morning: 'morning',
  Day: 'day',
  Evening: 'evening',
  Night: 'night'
} as const);
/** Описывает тип `TimePhase`, который формализует структуру данных в модуле `world/constant/types`. */
export type TimePhase = (typeof TIME_PHASE)[keyof typeof TIME_PHASE];

/** Константа `TIME_PHASE_ORDER` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const TIME_PHASE_ORDER = Object.freeze([
  TIME_PHASE.Morning,
  TIME_PHASE.Day,
  TIME_PHASE.Evening,
  TIME_PHASE.Night
] as const);

/** Константа `TIME_OF_DAY` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const TIME_OF_DAY = Object.freeze({
  Morning: 'Morning',
  Day: 'Day',
  Evening: 'Evening',
  Night: 'Night'
} as const);
/** Описывает тип `TimeOfDay`, который формализует структуру данных в модуле `world/constant/types`. */
export type TimeOfDay = (typeof TIME_OF_DAY)[keyof typeof TIME_OF_DAY];

/** Константа `TIME_OF_DAY_ORDER` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const TIME_OF_DAY_ORDER = Object.freeze([
  TIME_OF_DAY.Morning,
  TIME_OF_DAY.Day,
  TIME_OF_DAY.Evening,
  TIME_OF_DAY.Night
] as const);

/** Константа `MAP_LEVEL` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const MAP_LEVEL = Object.freeze({
  Global: 'global',
  Region: 'region',
  City: 'city',
  District: 'district',
  Building: 'building',
  Room: 'room'
} as const);
/** Описывает тип `MapLevel`, который формализует структуру данных в модуле `world/constant/types`. */
export type MapLevel = (typeof MAP_LEVEL)[keyof typeof MAP_LEVEL];

/** Константа `EQUIPMENT_SLOT` хранит общие настройки/данные, которые переиспользуются в модуле `world/constant/types`. */
export const EQUIPMENT_SLOT = Object.freeze({
  Head: 'head',
  Body: 'body',
  Legs: 'legs',
  Feet: 'feet',
  LeftHand: 'leftHand',
  RightHand: 'rightHand',
  Backpack: 'backpack'
} as const);
/** Описывает тип `EquipmentSlot`, который формализует структуру данных в модуле `world/constant/types`. */
export type EquipmentSlot = (typeof EQUIPMENT_SLOT)[keyof typeof EQUIPMENT_SLOT];
