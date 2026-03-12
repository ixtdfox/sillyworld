export const SCHEMA_VERSION = 4 as const;

export const TIME_PHASE = Object.freeze({
  Morning: 'morning',
  Day: 'day',
  Evening: 'evening',
  Night: 'night'
} as const);
export type TimePhase = (typeof TIME_PHASE)[keyof typeof TIME_PHASE];

export const TIME_PHASE_ORDER = Object.freeze([
  TIME_PHASE.Morning,
  TIME_PHASE.Day,
  TIME_PHASE.Evening,
  TIME_PHASE.Night
] as const);

export const TIME_OF_DAY = Object.freeze({
  Morning: 'Morning',
  Day: 'Day',
  Evening: 'Evening',
  Night: 'Night'
} as const);
export type TimeOfDay = (typeof TIME_OF_DAY)[keyof typeof TIME_OF_DAY];

export const TIME_OF_DAY_ORDER = Object.freeze([
  TIME_OF_DAY.Morning,
  TIME_OF_DAY.Day,
  TIME_OF_DAY.Evening,
  TIME_OF_DAY.Night
] as const);

export const MAP_LEVEL = Object.freeze({
  Global: 'global',
  Region: 'region',
  City: 'city',
  District: 'district',
  Building: 'building',
  Room: 'room'
} as const);
export type MapLevel = (typeof MAP_LEVEL)[keyof typeof MAP_LEVEL];

export const EQUIPMENT_SLOT = Object.freeze({
  Head: 'head',
  Body: 'body',
  Legs: 'legs',
  Feet: 'feet',
  LeftHand: 'leftHand',
  RightHand: 'rightHand',
  Backpack: 'backpack'
} as const);
export type EquipmentSlot = (typeof EQUIPMENT_SLOT)[keyof typeof EQUIPMENT_SLOT];
